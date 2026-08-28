'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LINE_ITEMS,
  PIPELINE,
  formatINR,
  type Stage,
  type LineItem,
} from '@/lib/claimgpt-data';
import {
  uploadClaimDocument,
  fetchClaimPreview,
  fetchLatestClaimId,
  fetchRecentClaims,
  fetchClaimProgress,
  deleteClaimApi,
  deleteClaimDocumentApi,
  isMockId,
  PIPELINE_ACTIVE_STATUSES,
  type RealClaimPreview,
  type RecentClaimSummary,
  SUBMISSION_API,
  saveClaimExpensesApi,
  saveClaimDetailsApi,
} from '@/lib/api-client';
import { getStoredAuthSession } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

/* Utility function for robust smooth scrolling across all devices */
export function scrollToPipeline() {
  setTimeout(() => {
    const el = document.getElementById('pipeline-progress-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 150);
}

export function useAuditorState() {
  const getDocumentKey = (doc?: { document_id?: string; id?: string } | null) =>
    doc?.document_id || doc?.id || null;

  const getPreviewDocumentKeys = (preview: RealClaimPreview | null) =>
    (preview?.documents || [])
      .map((doc) => getDocumentKey(doc))
      .filter((docId): docId is string => Boolean(docId));

  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState<Stage>('staged');
  const [stepDescription, setStepDescription] = useState<string>("Claim Analysis Complete");
  const [files, setFiles] = useState<{ name: string; size: string; type?: string }[]>([]);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  /* Modal state for full report preview — default FALSE */
  const [showReportModal, setShowReportModal] = useState(false);

  /* Modal state for in-app document preview — default FALSE */
  const [showDocModal, setShowDocModal] = useState(false);
  const openDocModal = () => setShowDocModal(true);
  const closeDocModal = () => setShowDocModal(false);

  /* User Profile & Account Modal State */
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('user@example.com');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState<boolean>(false);
  const [duplicateClaimId, setDuplicateClaimId] = useState<string | null>(null);

  const syncUserSession = () => {
    try {
      const session = getStoredAuthSession();
      if (session?.user) {
        if (session.user.name) setUserName(session.user.name);
        if (session.user.email) setUserEmail(session.user.email);
      } else {
        const savedName = localStorage.getItem('claimgpt_user_name');
        const savedEmail = localStorage.getItem('claimgpt_user_email');
        if (savedName) setUserName(savedName);
        if (savedEmail) setUserEmail(savedEmail);
      }
    } catch (err) {
      /* ignore */
    }
  };

  /* Remove a specific document from a claim */
  const deleteDocument = async (claimIdTarget: string, docIdTarget: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistically update recentClaims documents
    setRecentClaims((prev) =>
      prev.map((c) => {
        if (c.id === claimIdTarget) {
          const nextDocs = (c.documents || []).filter((d) => d.id !== docIdTarget && d.file_name !== docIdTarget);
          return { ...c, documents: nextDocs };
        }
        return c;
      })
    );

    // If deleting from currently active claim, update staged files & preview documents
    if (claimIdTarget === claimId) {
      setFiles((prev) => prev.filter((f, idx) => `f-${idx}` !== docIdTarget && f.name !== docIdTarget));
      if (realPreview && realPreview.documents) {
        setRealPreview({
          ...realPreview,
          documents: realPreview.documents.filter((d) => d.id !== docIdTarget && d.original_filename !== docIdTarget),
        });
      }
    }

    try {
      await deleteClaimDocumentApi(claimIdTarget, docIdTarget);
    } catch {
      /* ignore network error */
    }
  };

  useEffect(() => {
    syncUserSession();
  }, []);

  const openProfileModal = () => {
    syncUserSession();
    setShowProfileModal(true);
  };

  const openMenuDrawer = () => {
    syncUserSession();
    setShowMenuDrawer(true);
  };

  /* File(s) pending analysis */
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  /* Real Backend State */
  const [claimId, setClaimId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [realPreview, setRealPreview] = useState<RealClaimPreview | null>(null);

  /* Incremented each time realPreview is set with real data — used as key for MetaField remount */
  const [previewVersion, setPreviewVersion] = useState(0);

  /* Collapsible Upload Dropdown Panel State — default TRUE on clean start */
  const [isUploadOpen, setIsUploadOpen] = useState(true);
  const toggleUploadOpen = () => setIsUploadOpen((prev) => !prev);

  /* Controls whether top upload card displays completion state — default FALSE on page load */
  const [isLiveSessionCompleted, setIsLiveSessionCompleted] = useState(false);
  const activePollRef = useRef<NodeJS.Timeout | null>(null);
  const activeClaimIdRef = useRef<string | null>(null);

  /* Central progress and pipeline stage synchronizer */
  const updateProgressAndStage = (targetPct: number, customStep?: string) => {
    const nextPct = Math.min(Math.max(targetPct, 0), 100);
    setProgress(nextPct);
    const stepLower = (customStep || "").toLowerCase();

    if (nextPct >= 100) {
      setActiveStage('scoring');
      setStepDescription("Claim Analysis 100% Complete");
    } else if (stepLower.includes('scor') || stepLower.includes('compliance') || nextPct >= 85) {
      setActiveStage('scoring');
      setStepDescription(customStep || `Compliance & Risk Scoring - ${nextPct}%`);
    } else if (stepLower.includes('cod') || (nextPct >= 65 && nextPct < 85)) {
      setActiveStage('coding');
      setStepDescription(customStep || `ICD-10 / CPT Coding - ${nextPct}%`);
    } else if (stepLower.includes('pars') || (nextPct >= 30 && nextPct < 65)) {
      setActiveStage('parsing');
      setStepDescription(customStep || `Parsing (LLM agent reading document) - ${nextPct}%`);
    } else {
      setActiveStage('ocr');
      setStepDescription(customStep || `OCR (extracting text) - ${nextPct}%`);
    }
  };

  /* History list of past claims */
  const [recentClaims, setRecentClaims] = useState<RecentClaimSummary[]>([]);

  const [isDocumentsRequested, setIsDocumentsRequested] = useState(false);
  const [missingGroups, setMissingGroups] = useState<string[]>([]);

  const checkStatus = (preview: RealClaimPreview | null) => {
    if (!preview) {
      setIsDocumentsRequested(false);
      setMissingGroups([]);
      return;
    }

    if ((preview.status || "").toUpperCase() === "DOCUMENTS_REQUESTED") {
      setIsDocumentsRequested(true);
      const docs = preview.documents || [];
      const kyc_types = ["aadhaar_card", "pan_card", "identity_proof"];
      const clinical_types = ["discharge_summary", "lab_report"];
      const financial_types = ["hospital_bill", "pharmacy_bill"];

      const hasKyc = docs.some(d => kyc_types.includes((d.doc_type || "").toLowerCase()));
      const hasClinical = docs.some(d => clinical_types.includes((d.doc_type || "").toLowerCase()));
      const hasFinancial = docs.some(d => financial_types.includes((d.doc_type || "").toLowerCase()));

      const missing = [];
      if (!hasClinical && !hasFinancial) missing.push("Hospital Documents (Discharge Summary / Hospital Bill)");
      if (!hasKyc) missing.push("Identity / KYC Proof (Aadhaar / PAN / Passport)");
      setMissingGroups(missing);
    } else {
      setIsDocumentsRequested(false);
      setMissingGroups([]);
    }
  };

  useEffect(() => {
    checkStatus(realPreview);
  }, [realPreview]);

  useEffect(() => {
    const documentKeys = getPreviewDocumentKeys(realPreview);

    if (documentKeys.length === 0) {
      setActiveDocumentId(null);
      return;
    }

    setActiveDocumentId((current) => (current && documentKeys.includes(current) ? current : documentKeys[0]));
  }, [realPreview?.claim_id, realPreview?.documents]);

  /* Helper to fetch list of past claims from backend */
  const reloadRecentClaims = async () => {
    try {
      let patientId: string | undefined = undefined;
      const session = getStoredAuthSession();
      if (session?.user?.name) {
        patientId = session.user.name;
      } else {
        const savedName = localStorage.getItem('claimgpt_user_name');
        if (savedName) patientId = savedName;
      }
      const claims = await fetchRecentClaims(patientId);
      setRecentClaims(claims);
    } catch (err) {
      console.warn("Failed to load recent claims list:", err);
    }
  };

  /* Periodic background sync to keep claim statuses and names fresh */
  useEffect(() => {
    const interval = setInterval(() => {
      reloadRecentClaims();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  /* On mount: load latest claim data for auditor workspace & recent claims list */
  useEffect(() => {
    async function loadInitial() {
      try {
        let patientId: string | undefined = undefined;
        const session = getStoredAuthSession();
        if (session?.user?.name) {
          patientId = session.user.name;
        } else {
          const savedName = localStorage.getItem('claimgpt_user_name');
          if (savedName) patientId = savedName;
        }
        await reloadRecentClaims();
        const latestId = await fetchLatestClaimId(patientId);
        if (latestId) {
          activeClaimIdRef.current = latestId;
          setClaimId(latestId);
          setIsUploadOpen(false); // Collapse upload panel when existing claim is loaded

          const statusInfo = await fetchClaimProgress(latestId);
          const isComplete = Boolean(
            statusInfo?.is_complete ||
            (statusInfo?.percentage ?? 0) >= 100 ||
            statusInfo?.status === "COMPLETED" ||
            statusInfo?.status === "VALIDATED"
          );

          if (!isComplete) {
            setAnalyzing(true);
            setIsLiveSessionCompleted(false);
            const livePct = Math.max(statusInfo?.percentage || 20, 20);
            updateProgressAndStage(livePct, statusInfo?.step ? `${statusInfo.step} - ${livePct}%` : undefined);
            runProgressSequence(latestId);
          } else {
            const prevData = await fetchClaimPreview(latestId);
            if (prevData) {
              setRealPreview(prevData);
              setPreviewVersion((v) => v + 1);
            }
            const statusUpper = (prevData?.status || statusInfo?.status || "").toUpperCase();
            if (statusUpper === "DOCUMENTS_REQUESTED" || statusUpper === "MANUAL_REVIEW_REQUIRED") {
              setAnalyzing(false);
              setIsLiveSessionCompleted(false);
              setIsDocumentsRequested(statusUpper === "DOCUMENTS_REQUESTED");
              setProgress(100);
              setActiveStage('scoring');
              setStepDescription(statusUpper === "DOCUMENTS_REQUESTED" ? "Documents Requested" : "Manual Review Required");
            } else {
              setAnalyzing(false);
              setIsLiveSessionCompleted(true);
              setIsDocumentsRequested(false);
              setProgress(100);
              setActiveStage('scoring');
              setStepDescription("Claim Analysis 100% Complete");
            }
          }
        } else {
          setClaimId(null);
          setRealPreview(null);
          setFiles([]);
          setProgress(0);
          setActiveStage('staged');
          setIsUploadOpen(true);
        }
      } catch (err) {
        console.warn("Could not load initial claim data on mount:", err);
      }
    }
    loadInitial();
  }, [userName]);

  /* Remove a claim from local UI state and delete it from Docker backend */
  const deleteClaim = async (idToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const remaining = recentClaims.filter((c) => c.id !== idToDelete);
    setRecentClaims(remaining);

    // If deleting the currently active claim or all claims are deleted
    if (idToDelete === claimId || remaining.length === 0) {
      if (remaining.length > 0) {
        // Automatically switch to the next available claim
        selectClaim(remaining[0].id);
      } else {
        // All claims deleted — reset workspace to clean empty state!
        setClaimId(null);
        setRealPreview(null);
        setFiles([]);
        setProgress(0);
        setActiveStage('staged');
        setIsLiveSessionCompleted(false);
        setActiveDocumentId(null);
        setHoveredField(null);
        setIsUploadOpen(true);
      }
    }

    try {
      await deleteClaimApi(idToDelete);
      let patientId: string | undefined = undefined;
      const session = getStoredAuthSession();
      if (session?.user?.name) {
        patientId = session.user.name;
      } else {
        const savedName = localStorage.getItem('claimgpt_user_name');
        if (savedName) patientId = savedName;
      }
      const remainingClaims = await fetchRecentClaims(patientId);
      setRecentClaims(remainingClaims);
    } catch (err) {
      console.warn("Backend deletion error:", err);
    }
  };

  /* Select any previous claim from history list */
  const selectClaim = async (targetId: string) => {
    if (!targetId) return;
    if (activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }

    const targetClaimMeta = recentClaims.find((c) => c.id === targetId);
    const rawStatus = (targetClaimMeta?.status || "").toUpperCase();
    const isKnownActive = rawStatus !== "COMPLETED" && rawStatus !== "VALIDATED" && PIPELINE_ACTIVE_STATUSES.has(rawStatus);

    activeClaimIdRef.current = targetId;
    setClaimId(targetId);
    setIsUploadOpen(false); // Auto-collapse upload dropdown when selecting old claims
    setEdited({}); // Reset edit badges from previous claim

    // Synchronously set analyzing state so there is 0ms glitch or flicker while awaiting network
    if (isKnownActive) {
      setAnalyzing(true);
      setIsLiveSessionCompleted(false);
      const initialPct = targetClaimMeta?.progress?.percentage || (rawStatus === "UPLOADED" ? 20 : 55);
      updateProgressAndStage(initialPct, targetClaimMeta?.progress?.step || (rawStatus === "UPLOADED" ? "OCR (extracting text) - 20%" : `Parsing (LLM agent reading document) - ${initialPct}%`));
    } else {
      setAnalyzing(false);
      setIsLiveSessionCompleted(true);
      setIsDocumentsRequested(false);
      updateProgressAndStage(100, "Claim Analysis 100% Complete");
    }

    try {
      const statusInfo = await fetchClaimProgress(targetId);
      const isComplete = Boolean(
        statusInfo?.is_complete ||
        (statusInfo?.percentage ?? 0) >= 100 ||
        statusInfo?.status === "COMPLETED" ||
        statusInfo?.status === "VALIDATED"
      );

      if (!isComplete) {
        setAnalyzing(true);
        setIsLiveSessionCompleted(false);
        const livePct = Math.max(statusInfo?.percentage || 20, 20);
        updateProgressAndStage(livePct, statusInfo?.step ? `${statusInfo.step} - ${livePct}%` : undefined);
        runProgressSequence(targetId);
      } else {
        const prevData = await fetchClaimPreview(targetId);
        if (prevData) {
          setRealPreview(prevData);
          setPreviewVersion((v) => v + 1);
        }
        setRecentClaims((prev) =>
          prev.map((c) => (c.id === targetId ? { ...c, status: "COMPLETED" } : c))
        );
        const statusUpper = (prevData?.status || statusInfo?.status || "").toUpperCase();
        if (statusUpper === "DOCUMENTS_REQUESTED" || statusUpper === "MANUAL_REVIEW_REQUIRED") {
          setAnalyzing(false);
          setIsLiveSessionCompleted(false);
          setIsDocumentsRequested(statusUpper === "DOCUMENTS_REQUESTED");
          updateProgressAndStage(100, statusUpper === "DOCUMENTS_REQUESTED" ? "Documents Requested" : "Manual Review Required");
        } else {
          setAnalyzing(false);
          setIsLiveSessionCompleted(false);
          setIsDocumentsRequested(false);
          updateProgressAndStage(100, "Claim Analysis 100% Complete");
        }
      }
    } catch (err) {
      console.warn("Failed to select claim preview:", err);
    }
  };

  /* Auto-scroll smoothly to Pipeline Progress Card whenever analysis starts */
  useEffect(() => {
    if (analyzing) {
      scrollToPipeline();
    }
  }, [analyzing]);

  /* Dynamically extracted metadata fields from backend preview */
  const extractedPatient = realPreview?.summary?.patient_name && realPreview.summary.patient_name !== "N/A"
    ? realPreview.summary.patient_name
    : realPreview?.parsed_fields?.patient_name || realPreview?.parsed_fields?.member_name || realPreview?.parsed_fields?.insured_name;

  const extractedHospital = realPreview?.summary?.hospital && realPreview.summary.hospital !== "N/A"
    ? realPreview.summary.hospital
    : realPreview?.parsed_fields?.hospital_name || realPreview?.parsed_fields?.hospital;

  const extractedAdmission = realPreview?.summary?.admission_date && realPreview.summary.admission_date !== "N/A"
    ? realPreview.summary.admission_date
    : realPreview?.parsed_fields?.admission_date || realPreview?.parsed_fields?.service_date;

  const extractedDischarge = realPreview?.summary?.discharge_date && realPreview.summary.discharge_date !== "N/A"
    ? realPreview.summary.discharge_date
    : realPreview?.parsed_fields?.discharge_date;

  const extractedDiagnosis = realPreview?.summary?.diagnosis && realPreview.summary.diagnosis !== "N/A"
    ? realPreview.summary.diagnosis
    : realPreview?.parsed_fields?.diagnosis || realPreview?.parsed_fields?.primary_diagnosis;

  const hasClaim = Boolean(claimId || realPreview);
  const patientName = extractedPatient || (analyzing ? "Processing..." : (hasClaim ? "Patient Record" : ""));
  const hospitalName = extractedHospital || (analyzing ? "Processing..." : (hasClaim ? "City Care Hospital" : ""));
  const admissionDate = extractedAdmission || (analyzing ? "Processing..." : (hasClaim ? "10/06/2026" : ""));
  const dischargeDate = extractedDischarge || (analyzing ? "Processing..." : (hasClaim ? "14/06/2026" : ""));
  const diagnosis = extractedDiagnosis || (analyzing ? "Processing..." : (hasClaim ? "Hospital Reimbursement Audit" : ""));

  /* Select file(s) without immediately analyzing — appends new files to pending list */
  /* Select file(s) without immediately analyzing — appends new files to pending list */
  const handleSelectFile = (input: any) => {
    let incoming: File[] = [];

    if (input && typeof input === "object" && "target" in input && input.target && (input.target as HTMLInputElement).files) {
      incoming = Array.from((input.target as HTMLInputElement).files || []);
    } else if (input && typeof input === "object" && "dataTransfer" in input && input.dataTransfer && input.dataTransfer.files) {
      incoming = Array.from(input.dataTransfer.files);
    } else if (Array.isArray(input)) {
      incoming = input;
    } else if (input instanceof File) {
      incoming = [input];
    } else if (input && typeof input === "object" && "length" in input) {
      incoming = Array.from(input as ArrayLike<File>);
    }

    if (incoming.length === 0) return;

    setIsUploadOpen(true); // Keep upload panel open when user selects files
    setPendingFiles((prev) => [...prev, ...incoming]);
    setFiles((prev) => [
      ...prev,
      ...incoming.map((f) => ({
        name: f.name,
        size: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
        type: f.type || (f.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
        rawFile: f,
      })),
    ]);

    if (input && typeof input === "object" && "target" in input && input.target) {
      (input.target as HTMLInputElement).value = '';
    }
  };

  /* Remove individual attached file */
  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* Reset upload state for new claim */
  const resetState = () => {
    setPendingFiles([]);
    setFiles([]);
    setUploading(false);
    setIsLiveSessionCompleted(false);
    setIsUploadOpen(true);
    setActiveDocumentId(null);
  };

  /* Direct upload & instant analysis */
  const handleUploadFile = async (fileInput: File | File[], appendToActive = false) => {
    handleSelectFile(fileInput);
    const filesToUpload = Array.isArray(fileInput) ? fileInput : [fileInput];
    await startClaimAnalysis(filesToUpload, appendToActive);
  };

  /* Progress animation + background data sync that keeps polling until real data arrives */
  const runProgressSequence = (targetClaimId: string | null) => {
    let dataArrived = false;

    if (activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }

    const finishProgress = async () => {
      if (dataArrived) return;
      dataArrived = true;
      if (activePollRef.current) {
        clearInterval(activePollRef.current);
        activePollRef.current = null;
      }
      updateProgressAndStage(100, "Claim Analysis 100% Complete");
      setAnalyzing(false);
      setIsLiveSessionCompleted(true);
      
      const idToQuery = targetClaimId || (await fetchLatestClaimId()) || "CLM-2026-8842";
      setClaimId(idToQuery);
      const finalData = await fetchClaimPreview(idToQuery);
      if (finalData) {
        setRealPreview(finalData);
        setPreviewVersion((v) => v + 1);
      }
      reloadRecentClaims();
    };

    // Clean polling every 800ms directly syncing with Docker backend
    const pollStartTime = Date.now();
    let offlineSimStep = 0;
    const pollInterval = setInterval(async () => {
      if (dataArrived) {
        clearInterval(pollInterval);
        if (activePollRef.current === pollInterval) activePollRef.current = null;
        return;
      }

      // If user selected another claim, immediately cancel this polling loop
      if (activeClaimIdRef.current && targetClaimId && activeClaimIdRef.current !== targetClaimId) {
        clearInterval(pollInterval);
        if (activePollRef.current === pollInterval) activePollRef.current = null;
        return;
      }

      if (Date.now() - pollStartTime > 180000) {
        await finishProgress();
        return;
      }

      const idToQuery = targetClaimId || (await fetchLatestClaimId());
      if (!idToQuery || isMockId(idToQuery)) {
        // Offline / mock fallback — smooth monotonic progression without flickering
        offlineSimStep++;
        if (offlineSimStep === 1) updateProgressAndStage(20, "OCR (extracting text) - 20%");
        else if (offlineSimStep === 2) updateProgressAndStage(55, "Parsing (LLM agent reading document) - 55%");
        else if (offlineSimStep === 3) updateProgressAndStage(75, "ICD-10 / CPT Coding - 75%");
        else if (offlineSimStep === 4) updateProgressAndStage(90, "Compliance & Risk Scoring - 90%");
        else if (offlineSimStep >= 5) {
          await finishProgress();
        }
        return;
      }

      const statusInfo = await fetchClaimProgress(idToQuery);
      if (statusInfo) {
        if (statusInfo.is_complete || statusInfo.percentage >= 100 || statusInfo.status === "COMPLETED" || statusInfo.status === "VALIDATED") {
          try {
            const finalData = await fetchClaimPreview(idToQuery);
            if (finalData) {
              setRealPreview(finalData);
              setPreviewVersion((v) => v + 1);
              setClaimId(idToQuery);
            }
          } catch {
            /* ignore preview fetch error */
          }
          await finishProgress();
          return;
        }

        if (statusInfo.status === "DOCUMENTS_REQUESTED" || statusInfo.status === "MANUAL_REVIEW_REQUIRED") {
          try {
            const finalData = await fetchClaimPreview(idToQuery);
            if (finalData) {
              setRealPreview(finalData);
              setPreviewVersion((v) => v + 1);
              setClaimId(idToQuery);
            }
          } catch {
            /* ignore preview fetch error */
          }
          setAnalyzing(false);
          setIsLiveSessionCompleted(false);
          setProgress(100);
          setActiveStage('scoring');
          setStepDescription("Manual Review Required");
          dataArrived = true;
          clearInterval(pollInterval);
          return;
        }

        if (statusInfo.percentage > 0 && statusInfo.percentage < 100) {
          let stepLabel: string | undefined = undefined;
          if (statusInfo.step) {
            const stepUpper = statusInfo.step.toUpperCase();
            if (stepUpper.includes("OCR")) {
              stepLabel = `OCR (extracting text) - ${statusInfo.percentage}%`;
            } else if (stepUpper.includes("PARS") || stepUpper.includes("LLM") || stepUpper.includes("LAYOUT") || stepUpper.includes("TABLE")) {
              stepLabel = `Parsing (LLM agent reading document) - ${statusInfo.percentage}%`;
            } else if (stepUpper.includes("COD") || stepUpper.includes("ICD") || stepUpper.includes("CPT")) {
              stepLabel = `ICD-10 / CPT Coding - ${statusInfo.percentage}%`;
            } else if (stepUpper.includes("SCOR") || stepUpper.includes("COMPLIANCE") || stepUpper.includes("RISK")) {
              stepLabel = `Compliance & Risk Scoring - ${statusInfo.percentage}%`;
            } else {
              stepLabel = `${statusInfo.step} - ${statusInfo.percentage}%`;
            }
          }
          if (!activeClaimIdRef.current || activeClaimIdRef.current === targetClaimId) {
            updateProgressAndStage(statusInfo.percentage, stepLabel);
          }
        }
      }
    }, 800);
    activePollRef.current = pollInterval;
  };

  /* Begin Claim Analysis action button */
  const startClaimAnalysis = async (overrideFiles?: File | File[], appendToActive = false) => {
    let targetFiles: File[] = [];
    if (overrideFiles) {
      targetFiles = Array.isArray(overrideFiles) ? overrideFiles : [overrideFiles];
    } else {
      targetFiles = pendingFiles.length > 0 ? pendingFiles : files.map((f: any) => f.rawFile).filter(Boolean);
    }

    if (targetFiles.length === 0 && files.length === 0) return;

    if (!appendToActive) {
      setRealPreview(null);
      setClaimId(null);
      setIsDocumentsRequested(false);
      setMissingGroups([]);
    }

    setAnalyzing(true);
    setUploading(true);
    setShowReportModal(false);
    setIsLiveSessionCompleted(false);
    setIsUploadOpen(true); // Keep open during analysis to show circular progress
    setActiveStage('ocr');
    setProgress(20);
    setStepDescription("OCR (extracting text) · 20%");

    scrollToPipeline();

    let activeClaimId: string | null = null;
    try {
      const res = await uploadClaimDocument(targetFiles.length > 0 ? targetFiles : files.map((f: any) => f.rawFile || new File([], f.name)), userName, (appendToActive && claimId) ? claimId : undefined);
      if (res.claim_id) {
        if (res.status === "COMPLETED" || res.task_id === null) {
          setDuplicateClaimId(res.claim_id);
          setAnalyzing(false);
          setUploading(false);
          setProgress(0);
          setActiveStage('staged');
          toast({
            title: "Duplicate Document Detected",
            description: "This exact set of documents has already been processed in a previous claim.",
          });
          return;
        }

        activeClaimId = res.claim_id;
        activeClaimIdRef.current = res.claim_id;
        setClaimId(res.claim_id);

        // Try immediate prefetch for this claim ID
        const initialPreview = await fetchClaimPreview(res.claim_id);
        if (initialPreview) {
          setRealPreview(initialPreview);
          setPreviewVersion((v) => v + 1);
        }
      }
    } catch (err) {
      console.warn("Backend API upload error:", err);
    } finally {
      setUploading(false);
    }

    runProgressSequence(activeClaimId);
  };





  /* Manually open report modal and fetch selected or latest claim preview directly from backend */
  const openReportModal = async () => {
    try {
      const idToQuery = claimId || (await fetchLatestClaimId());
      if (idToQuery) {
        const prevData = await fetchClaimPreview(idToQuery);
        if (prevData) {
          setRealPreview(prevData);
          setPreviewVersion((v) => v + 1);
          setClaimId(idToQuery);
        }
      }
    } catch (err) {
      console.warn("Failed to load report modal preview:", err);
    }
    setShowReportModal(true);
  };

  /* Computed items & total */
  const lineItems: LineItem[] = realPreview?.expenses?.length
    ? realPreview.expenses.map((exp, idx) => ({
      id: `exp-${idx}`,
      category: exp.category || "Expense",
      description: exp.description || exp.category,
      amount: exp.amount || 0,
      box: { x: 8, y: 30 + idx * 10, w: 84, h: 7 },
    }))
    : (analyzing || (progress < 100 && !realPreview?.expenses?.length) ? [] : LINE_ITEMS);

  const total = lineItems.reduce((sum, i) => sum + i.amount, 0);
  const stageIndex = PIPELINE.findIndex((s) => s.key === activeStage);

  const markEdited = (key: string) =>
    setEdited((e) => (e[key] ? e : { ...e, [key]: true }));

  /* PDF Report URLs */
  const tpaPdfUrl = claimId ? `${SUBMISSION_API}/claims/${claimId}/tpa-pdf` : null;
  const irdaPdfUrl = claimId ? `${SUBMISSION_API}/claims/${claimId}/irda-pdf` : null;
  const tpaPdfViewUrl = claimId ? `${SUBMISSION_API}/claims/${claimId}/tpa-pdf?view=true` : null;
  const irdaPdfViewUrl = claimId ? `${SUBMISSION_API}/claims/${claimId}/irda-pdf?view=true` : null;

  /* Detect Patient Name Mismatch warning from backend preview */
  const nameMismatchWarning = useMemo(() => {
    return null; // Disabled as requested to support family/third-party uploads
  }, [realPreview]);

  const saveExpenses = async (expensesList: Array<{ category: string; amount: number }>) => {
    setRealPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: expensesList.map((e) => ({
          category: e.category,
          amount: e.amount,
        })),
        billed_total: expensesList.reduce((sum, e) => sum + e.amount, 0),
      };
    });
    if (!claimId) return;
    const success = await saveClaimExpensesApi(claimId, expensesList);
    if (success) {
      const prevData = await fetchClaimPreview(claimId);
      if (prevData) {
        setRealPreview(prevData);
      }
      toast({
        title: "Success",
        description: "Expenses saved successfully.",
      });
    } else {
      toast({
        title: "Success",
        description: "Expenses updated locally.",
      });
    }
  };

  const saveDetails = async (details: Record<string, string>) => {
    if (!claimId) return;
    const success = await saveClaimDetailsApi(claimId, details);
    if (success) {
      const prevData = await fetchClaimPreview(claimId);
      if (prevData) {
        setRealPreview(prevData);
      }
      toast({
        title: "Success",
        description: "Details saved successfully.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save details.",
        variant: "destructive",
      });
    }
  };

  return {
    progress,
    setProgress,
    resetState,
    activeStage,
    setActiveStage,
    files,
    setFiles,
    pendingFiles,
    removeFile,
    hoveredField,
    setHoveredField,
    zoom,
    setZoom,
    edited,
    markEdited,
    activeDocumentId,
    setActiveDocumentId,
    total,
    stageIndex,
    lineItems,
    /* Real Backend Extensions */
    claimId,
    uploading,
    analyzing,
    isUploadOpen,
    setIsUploadOpen,
    toggleUploadOpen,
    isLiveSessionCompleted,
    stepDescription,
    handleSelectFile,
    handleUploadFile,
    startClaimAnalysis,
    realPreview,
    nameMismatchWarning,
    showReportModal,
    setShowReportModal,
    openReportModal,
    closeReportModal: () => setShowReportModal(false),
    showDocModal,
    setShowDocModal,
    openDocModal,
    closeDocModal,
    patientName,
    hospitalName,
    admissionDate,
    dischargeDate,
    diagnosis,
    tpaPdfUrl,
    irdaPdfUrl,
    tpaPdfViewUrl,
    irdaPdfViewUrl,
    recentClaims,
    selectClaim,
    deleteClaim,
    deleteDocument,
    reloadRecentClaims,
    isDocumentsRequested,
    missingGroups,
    previewVersion,
    userName,
    setUserName,
    userEmail,
    setUserEmail,
    showProfileModal,
    setShowProfileModal,
    openProfileModal: () => setShowProfileModal(true),
    closeProfileModal: () => setShowProfileModal(false),
    showMenuDrawer,
    setShowMenuDrawer,
    openMenuDrawer: () => setShowMenuDrawer(true),
    closeMenuDrawer: () => setShowMenuDrawer(false),
    duplicateClaimId,
    setDuplicateClaimId,
    saveExpenses,
    saveDetails,
  };
}

export type AuditorState = ReturnType<typeof useAuditorState>;

export { LINE_ITEMS, PIPELINE, formatINR };
