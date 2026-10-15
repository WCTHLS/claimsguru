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
  retryClaimProcessing,
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
  const [userEmail, setUserEmail] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState<boolean>(false);
  const [duplicateClaimId, setDuplicateClaimId] = useState<string | null>(null);
  const [duplicateFiles, setDuplicateFiles] = useState<File[]>([]);
  const [isReprocessing, setIsReprocessing] = useState<boolean>(false);
  const [showIdentityMismatchModal, setShowIdentityMismatchModal] = useState<boolean>(false);
  const [identityMismatchMessage, setIdentityMismatchMessage] = useState<string>('');

  const syncUserSession = () => {
    try {
      const session = getStoredAuthSession();
      if (session?.user) {
        if (session.user.name && session.user.name !== 'User') setUserName(session.user.name);
        if (session.user.email && session.user.email !== 'user@example.com') setUserEmail(session.user.email);
      } else {
        const savedName = localStorage.getItem('claimgpt_user_name');
        const savedEmail = localStorage.getItem('claimgpt_user_email');
        if (savedName && savedName !== 'User') setUserName(savedName);
        if (savedEmail && savedEmail !== 'user@example.com') setUserEmail(savedEmail);
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
  const [claimCreatedAt, setClaimCreatedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [realPreview, setRealPreview] = useState<RealClaimPreview | null>(null);

  /* Stalled / Zombie pipeline state */
  const [isStalled, setIsStalled] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [stalledMessage, setStalledMessage] = useState<string | null>(null);

  /* Incremented each time realPreview is set with real data — used as key for MetaField remount */
  const [previewVersion, setPreviewVersion] = useState(0);

  /* Collapsible Upload Dropdown Panel State — default TRUE on clean start */
  const [isUploadOpen, setIsUploadOpen] = useState(true);
  const toggleUploadOpen = () => setIsUploadOpen((prev) => !prev);

  /* Controls whether top upload card displays completion state — default FALSE on page load */
  const [isLiveSessionCompleted, setIsLiveSessionCompleted] = useState(false);
  const activePollRef = useRef<NodeJS.Timeout | null>(null);
  const activeClaimIdRef = useRef<string | null>(null);
  const progressRef = useRef<number>(0);
  const isAnalyzingRef = useRef<boolean>(false);

  const [claimProgressMap, setClaimProgressMap] = useState<Record<string, { percentage: number; step: string; status?: string; error?: string }>>({});

  /* Central progress and pipeline stage synchronizer */
  const updateProgressAndStage = (targetPct: number, customStep?: string) => {
    let nextPct = Math.min(Math.max(targetPct, 0), 100);
    // Monotonic guard: never regress backwards while actively analyzing the same claim
    if (isAnalyzingRef.current && targetPct > 0 && targetPct < 100 && nextPct < progressRef.current) {
      nextPct = progressRef.current;
    } else {
      progressRef.current = nextPct;
    }
    setProgress(nextPct);
    const stepLower = (customStep || "").toLowerCase();

    if (nextPct >= 100) {
      setActiveStage('scoring');
      setStepDescription("Claim Analysis 100% Complete");
    } else if (stepLower.includes('scor') || stepLower.includes('compliance') || stepLower.includes('risk') || nextPct >= 85) {
      setActiveStage('scoring');
      setStepDescription(customStep || `Compliance & Risk Scoring - ${nextPct}%`);
    } else if (stepLower.includes('cod') || stepLower.includes('icd') || stepLower.includes('cpt') || (nextPct >= 75 && nextPct < 85)) {
      setActiveStage('coding');
      setStepDescription(customStep || `ICD-10 / CPT Coding - ${nextPct}%`);
    } else if (stepLower.includes('pars') || (nextPct >= 50 && nextPct < 75)) {
      setActiveStage('parsing');
      setStepDescription(customStep || `Parsing (LLM agent reading document) - ${nextPct}%`);
    } else {
      setActiveStage('ocr');
      setStepDescription(customStep || `OCR (extracting text) - ${nextPct}%`);
    }

    if (activeClaimIdRef.current) {
      const activeId = activeClaimIdRef.current;
      setClaimProgressMap((prev) => ({
        ...prev,
        [activeId]: { percentage: nextPct, step: customStep || `Processing - ${nextPct}%` },
      }));
    }
  };

  /* History list of past claims */
  const [recentClaims, setRecentClaims] = useState<RecentClaimSummary[]>([]);

  const [isDocumentsRequested, setIsDocumentsRequested] = useState(false);
  const [missingGroups, setMissingGroups] = useState<string[]>([]);
  const [tpaMessage, setTpaMessage] = useState<string | null>(null);
  const [tpaRequestedDocs, setTpaRequestedDocs] = useState<string[]>([]);

  const checkStatus = (preview: RealClaimPreview | null) => {
    if (!preview) {
      setIsDocumentsRequested(false);
      setMissingGroups([]);
      setTpaMessage(null);
      setTpaRequestedDocs([]);
      return;
    }

    const st = (preview.status || "").toUpperCase();
    if (st === "DOCUMENTS_REQUESTED" || st === "MODIFICATION_REQUESTED") {
      setIsDocumentsRequested(true);
      setTpaMessage(preview.tpa_message || null);
      setTpaRequestedDocs(preview.tpa_requested_docs || []);

      const docs = preview.documents || [];
      const kyc_types = ["aadhaar_card", "pan_card", "identity_proof"];
      const clinical_types = ["discharge_summary", "lab_report"];
      const financial_types = ["hospital_bill", "pharmacy_bill"];

      const hasKyc = docs.some(d => kyc_types.includes((d.doc_type || "").toLowerCase()));
      const hasClinical = docs.some(d => clinical_types.includes((d.doc_type || "").toLowerCase()));
      const hasFinancial = docs.some(d => financial_types.includes((d.doc_type || "").toLowerCase()));

      const missing: string[] = [];
      const msgClean = (preview.tpa_message || "").trim();
      if (preview.tpa_requested_docs && preview.tpa_requested_docs.length > 0) {
        const distinct = preview.tpa_requested_docs.filter(
          (d: string) => d && d.trim() && d.trim() !== msgClean
        );
        missing.push(...distinct);
      } else if (!msgClean) {
        if (!hasClinical && !hasFinancial) missing.push("Hospital Documents (Discharge Summary / Hospital Bill)");
        if (!hasKyc) missing.push("Identity / KYC Proof (Aadhaar / PAN / Passport)");
      }
      setMissingGroups(missing);
    } else {
      setIsDocumentsRequested(false);
      setMissingGroups([]);
      setTpaMessage(null);
      setTpaRequestedDocs([]);
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
      syncUserSession();
      let patientId: string | undefined = undefined;
      const session = getStoredAuthSession();
      if (session?.user?.id && session.user.id !== 'User' && session.user.id !== 'user@example.com' && !session.user.id.startsWith('offline-')) {
        patientId = session.user.id;
      } else if (session?.user?.email && session.user.email !== 'user@example.com') {
        patientId = session.user.email;
      } else if (userEmail && userEmail !== 'user@example.com' && userEmail !== 'User') {
        patientId = userEmail;
      } else if (session?.user?.sub && session.user.sub !== 'User' && !session.user.sub.startsWith('offline-')) {
        patientId = session.user.sub;
      }
      const claims = await fetchRecentClaims(patientId);
      if (claims) {
        // Merge: preserve any locally-held optimistic/in-progress claims that
        // the backend hasn't indexed yet (e.g. during OCR or early upload).
        setRecentClaims((prev) => {
          const backendIds = new Set(claims.map((c) => c.id));
          const ACTIVE_STATUSES = new Set(["UPLOADED", "PROCESSING", "OCR_PROCESSING", "OCR_DONE", "PARSING", "PARSED", "PREDICTED"]);
          // Keep local optimistic claims that are still processing and not yet in backend
          const survivingLocal = prev.filter(
            (c) => !backendIds.has(c.id) && ACTIVE_STATUSES.has((c.status || "").toUpperCase())
          );
          // Also keep the currently active claim if it's missing from backend
          const activeId = activeClaimIdRef.current;
          if (activeId && !backendIds.has(activeId) && !survivingLocal.some((c) => c.id === activeId)) {
            const activeClaim = prev.find((c) => c.id === activeId);
            if (activeClaim) {
              survivingLocal.push(activeClaim);
            }
          }
          // Protect terminal statuses (SETTLED, APPROVED, REJECTED) from being downgraded by stale backend list values
          const TERMINAL_ADJUDICATIONS = new Set(["SETTLED", "APPROVED", "REJECTED"]);
          const mergedClaims = claims.map((c) => {
            const cached = typeof window !== "undefined" ? localStorage.getItem(`claimgpt_claim_status_${c.id}`) : null;
            const cachedUpper = (cached || "").toUpperCase();
            const prevClaim = prev.find((p) => p.id === c.id);
            const prevStatus = (prevClaim?.status || "").toUpperCase();

            let effectiveStatus = c.status;
            if (TERMINAL_ADJUDICATIONS.has(cachedUpper)) {
              effectiveStatus = cachedUpper;
            } else if (TERMINAL_ADJUDICATIONS.has(prevStatus) && !TERMINAL_ADJUDICATIONS.has((c.status || "").toUpperCase())) {
              effectiveStatus = prevStatus;
            }
            return { ...c, status: effectiveStatus };
          });

          if (survivingLocal.length === 0) return mergedClaims;
          // Merge: optimistic claims on top, then backend claims
          return [...survivingLocal, ...mergedClaims];
        });
      }
    } catch (err) {
      console.warn("Failed to load recent claims list:", err);
    }
  };

  /* Periodic background sync to keep claim statuses and names fresh without overlapping */
  useEffect(() => {
    let active = true;
    let isFetching = false;

    const runSync = async () => {
      if (isFetching || !active) return;
      isFetching = true;
      try {
        await reloadRecentClaims();
      } finally {
        isFetching = false;
      }
    };

    const interval = setInterval(runSync, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  /* Continuous real-time background poller for all actively processing claims in sidebar */
  useEffect(() => {
    let active = true;
    let isPolling = false;

    const pollAllActiveClaims = async () => {
      if (isPolling || !active) return;
      if (typeof document !== "undefined" && document.hidden) return;
      isPolling = true;
      try {
        const TERMINAL_STATUSES = new Set([
          "COMPLETED",
          "VALIDATED",
          "FINISHED",
          "APPROVED",
          "SETTLED",
          "REJECTED",
          "IDENTITY_MISMATCH",
          "FAILED",
          "WORKFLOW_FAILED",
          "STALLED",
        ]);

        // Find all background active claims that need progress polling (the current active claim is dedicatedly managed)
        const activeClaims = recentClaims.filter((c) => {
          if (!c.id || isMockId(c.id)) return false;
          if (c.id === activeClaimIdRef.current) return false;
          const st = (c.status || "").toUpperCase();
          if (TERMINAL_STATUSES.has(st)) return false;
          const curMap = claimProgressMap[c.id];
          if (curMap && (curMap.percentage >= 100 || curMap.status === "STALLED")) return false;
          return true;
        });

        if (activeClaims.length === 0) return;

        for (const c of activeClaims) {
          if (!active) break;
          try {
            const statusInfo = await fetchClaimProgress(c.id);
            if (!statusInfo || !active) continue;

            const isSelected = c.id === activeClaimIdRef.current;

            if (statusInfo.not_found || statusInfo.status === "NOT_FOUND") {
              if (isSelected) {
                setAnalyzing(false);
                isAnalyzingRef.current = false;
                setProgress(0);
                setActiveStage('staged');
                setStepDescription("Claim removed or not found");
              }
              continue;
            }

            if (statusInfo.status === "IDENTITY_MISMATCH" || statusInfo.step?.includes("Identity Mismatch")) {
              if (isSelected) {
                setAnalyzing(false);
                isAnalyzingRef.current = false;
                setProgress(0);
                setActiveStage('staged');
                const errorDetail = (statusInfo as any).error || "Identity mismatch detected across documents. Uploaded set removed. Please re-upload the entire set.";
                setStepDescription(errorDetail);
                setIdentityMismatchMessage(errorDetail);
                setShowIdentityMismatchModal(true);
              }
              setClaimProgressMap((prev) => ({
                ...prev,
                [c.id]: { percentage: 0, step: "Identity Mismatch", status: "IDENTITY_MISMATCH" }
              }));
              continue;
            }

            if (statusInfo.status === "STALLED" || statusInfo.is_stalled || (statusInfo.status === "FAILED" && !statusInfo.is_complete)) {
              if (isSelected) {
                setAnalyzing(false);
                isAnalyzingRef.current = false;
                setIsStalled(true);
                const errMsg = statusInfo.error || "Analysis was interrupted or stalled. Please restart analysis.";
                setStalledMessage(errMsg);
                setStepDescription(errMsg);
              }
              setClaimProgressMap((prev) => ({
                ...prev,
                [c.id]: { percentage: statusInfo.percentage || 30, step: statusInfo.step || "Processing Stalled", status: "STALLED" }
              }));
              continue;
            }

            const isComplete = Boolean(
              statusInfo.is_complete ||
              statusInfo.percentage >= 100 ||
              statusInfo.status === "COMPLETED" ||
              statusInfo.status === "VALIDATED"
            );

            if (isComplete) {
              setClaimProgressMap((prev) => ({
                ...prev,
                [c.id]: { percentage: 100, step: "AI Verification Complete", status: "COMPLETED" }
              }));
              setRecentClaims((prev) =>
                prev.map((item) =>
                  item.id === c.id
                    ? {
                        ...item,
                        status: "COMPLETED",
                        progress: { percentage: 100, step: "AI Verification Complete", is_complete: true }
                      }
                    : item
                )
              );
              if (isSelected && (isAnalyzingRef.current || analyzing)) {
                updateProgressAndStage(100, "Claim Analysis 100% Complete");
                setAnalyzing(false);
                isAnalyzingRef.current = false;
                setIsLiveSessionCompleted(true);
                const finalData = await fetchClaimPreview(c.id);
                if (finalData && activeClaimIdRef.current === c.id) {
                  setRealPreview(finalData);
                  setPreviewVersion((v) => v + 1);
                }
              }
            } else if (statusInfo.percentage > 0) {
              setClaimProgressMap((prev) => {
                const prevPct = prev[c.id]?.percentage || 0;
                const newPct = Math.max(statusInfo.percentage, prevPct);
                return {
                  ...prev,
                  [c.id]: {
                    percentage: newPct,
                    step: statusInfo.step || prev[c.id]?.step || `Processing - ${newPct}%`,
                    status: statusInfo.status,
                  }
                };
              });

              if (isSelected && (isAnalyzingRef.current || analyzing)) {
                updateProgressAndStage(statusInfo.percentage, statusInfo.step);
              }
            }
          } catch {
            /* ignore individual claim poll error */
          }
        }
      } finally {
        isPolling = false;
      }
    };

    const interval = setInterval(pollAllActiveClaims, 3500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [recentClaims, analyzing]);

  /* On mount: load latest claim data for auditor workspace & recent claims list */
  useEffect(() => {
    async function loadInitial() {
      try {
        syncUserSession();
        let patientId: string | undefined = undefined;
        const session = getStoredAuthSession();
        if (session?.user?.id && session.user.id !== 'User' && session.user.id !== 'user@example.com' && !session.user.id.startsWith('offline-')) {
          patientId = session.user.id;
        } else if (session?.user?.email && session.user.email !== 'user@example.com') {
          patientId = session.user.email;
        } else if (userEmail && userEmail !== 'user@example.com' && userEmail !== 'User') {
          patientId = userEmail;
        } else if (session?.user?.sub && session.user.sub !== 'User' && !session.user.sub.startsWith('offline-')) {
          patientId = session.user.sub;
        }
        const claims = await fetchRecentClaims(patientId);
        const TERMINAL_ADJUDICATIONS = new Set(["SETTLED", "APPROVED", "REJECTED"]);
        const enhancedClaims = (claims || []).map((c) => {
          const cached = typeof window !== "undefined" ? localStorage.getItem(`claimgpt_claim_status_${c.id}`) : null;
          const cachedUpper = (cached || "").toUpperCase();
          if (TERMINAL_ADJUDICATIONS.has(cachedUpper)) {
            return { ...c, status: cachedUpper };
          }
          return c;
        });
        if (claims !== null) {
          setRecentClaims(enhancedClaims);
        }
        const claimsList = enhancedClaims;

        // Check if a specific claim was requested via URL query string
        let targetId: string | null = null;
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          targetId = params.get('claim_id') || params.get('claimId') || params.get('id');
        }

        const latestId = targetId || (claimsList.length > 0 ? claimsList[0].id : null);
        if (latestId) {
          activeClaimIdRef.current = latestId;
          setClaimId(latestId);
          setIsUploadOpen(false); // Collapse upload panel when existing claim is loaded

          const targetClaimMeta = claimsList.find((c) => c.id === latestId);
          const rawStatus = (targetClaimMeta?.status || "").toUpperCase();
          const isKnownTerminal = rawStatus === "COMPLETED" || rawStatus === "VALIDATED" || rawStatus === "APPROVED" || rawStatus === "SETTLED" || rawStatus === "REJECTED" || rawStatus === "SUBMITTED" || rawStatus === "DOCUMENTS_REQUESTED" || rawStatus === "DOCUMENTS_UPLOADED";

          // Fetch progress and preview concurrently to prevent waterfall and 2.5s false timeouts
          const [statusInfo, prevData] = await Promise.all([
            fetchClaimProgress(latestId),
            fetchClaimPreview(latestId),
          ]);

          if (prevData) {
            setRealPreview(prevData);
            setPreviewVersion((v) => v + 1);
            if (prevData.status) {
              const prevSt = prevData.status.toUpperCase();
              try {
                localStorage.setItem(`claimgpt_claim_status_${latestId}`, prevSt);
              } catch {}
              setRecentClaims((prev) =>
                prev.map((c) => (c.id === latestId ? { ...c, status: prevSt } : c))
              );
            }
          }

          if (statusInfo?.status === "IDENTITY_MISMATCH" || statusInfo?.step?.includes("Identity Mismatch")) {
            setAnalyzing(false);
            isAnalyzingRef.current = false;
            setIsLiveSessionCompleted(false);
            setProgress(0);
            setActiveStage('staged');
            const errorDetail = (statusInfo as any).error || "Identity mismatch detected across documents. Uploaded set removed. Please re-upload the entire set.";
            setStepDescription(errorDetail);
            setIdentityMismatchMessage(errorDetail);
            setShowIdentityMismatchModal(true);
            return;
          }

          if (statusInfo?.status === "STALLED" || statusInfo?.is_stalled) {
            setAnalyzing(false);
            isAnalyzingRef.current = false;
            setIsLiveSessionCompleted(false);
            setIsStalled(true);
            const errMsg = statusInfo.error || "Analysis was interrupted or stalled. Click 'Restart AI Analysis' to resume.";
            setStalledMessage(errMsg);
            setStepDescription(errMsg);
            setProgress(statusInfo.percentage || 30);
            return;
          }

          const isComplete = isKnownTerminal || Boolean(prevData) || (!statusInfo?.not_found && statusInfo?.status !== "NOT_FOUND" && Boolean(
            statusInfo?.is_complete ||
            (statusInfo?.percentage ?? 0) >= 100 ||
            statusInfo?.status === "COMPLETED" ||
            statusInfo?.status === "VALIDATED" ||
            statusInfo?.status === "DOCUMENTS_UPLOADED" ||
            statusInfo?.status === "SUBMITTED" ||
            statusInfo?.status === "APPROVED" ||
            statusInfo?.status === "SETTLED" ||
            statusInfo?.status === "REJECTED"
          ));

          if (!isComplete) {
            setAnalyzing(true);
            setIsLiveSessionCompleted(false);
            const livePct = Math.max(statusInfo?.percentage || 20, 20);
            updateProgressAndStage(livePct, statusInfo?.step ? `${statusInfo.step} - ${livePct}%` : undefined);
            runProgressSequence(latestId);
          } else {
            const statusUpper = (prevData?.status || rawStatus || statusInfo?.status || "").toUpperCase();
            if (statusUpper === "DOCUMENTS_REQUESTED" || statusUpper === "MANUAL_REVIEW_REQUIRED") {
              setAnalyzing(false);
              setIsLiveSessionCompleted(false);
              setIsDocumentsRequested(statusUpper === "DOCUMENTS_REQUESTED");
              setProgress(100);
              setActiveStage('scoring');
              setStepDescription(statusUpper === "DOCUMENTS_REQUESTED" ? "Documents Requested" : "Manual Review Required");
            } else {
              setAnalyzing(false);
              setIsLiveSessionCompleted(false);
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
      await reloadRecentClaims();
    } catch (err) {
      console.warn("Backend deletion error:", err);
    }
  };

  /* Select any previous claim from history list */
  const selectClaim = async (targetId: string) => {
    if (!targetId) return;

    // Guard 1: If user clicks the claim that is ALREADY active and actively analyzing/uploading,
    // do NOT cancel polling or regress the progress bar!
    if (targetId === activeClaimIdRef.current && (analyzing || uploading)) {
      return;
    }

    if (activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }

    const targetClaimMeta = recentClaims.find((c) => c.id === targetId);
    const rawStatus = (targetClaimMeta?.status || "").toUpperCase();
    const liveProgress = claimProgressMap[targetId] || targetClaimMeta?.progress;
    const isLiveActive = Boolean(liveProgress && liveProgress.percentage > 0 && liveProgress.percentage < 100 && !(liveProgress as any).is_complete);
    const isTerminal = rawStatus === "COMPLETED" || rawStatus === "VALIDATED" || rawStatus === "APPROVED" || rawStatus === "SETTLED" || rawStatus === "REJECTED" || rawStatus === "SUBMITTED" || rawStatus === "DOCUMENTS_REQUESTED" || rawStatus === "DOCUMENTS_UPLOADED" || rawStatus === "MODIFICATION_REQUESTED";
    const isKnownActive = !isTerminal && (isLiveActive || PIPELINE_ACTIVE_STATUSES.has(rawStatus));

    activeClaimIdRef.current = targetId;
    setClaimId(targetId);
    setClaimCreatedAt(targetClaimMeta?.created_at || null);
    setIsUploadOpen(false); // Auto-collapse upload dropdown when selecting claims
    setEdited({}); // Reset edit badges from previous claim
    setRealPreview(null); // Reset preview to prevent state bleeding
    setIsStalled(false);
    setStalledMessage(null);

    if (rawStatus === "STALLED" || liveProgress?.status === "STALLED") {
      setAnalyzing(false);
      isAnalyzingRef.current = false;
      setIsLiveSessionCompleted(false);
      setIsStalled(true);
      const errMsg = (liveProgress as any)?.error || "Analysis was interrupted or stalled. Click 'Restart AI Analysis' to resume.";
      setStalledMessage(errMsg);
      setStepDescription(errMsg);
      const stalledPct = liveProgress?.percentage || 30;
      progressRef.current = stalledPct;
      setProgress(stalledPct);
      return;
    }

    if (isKnownActive) {
      setAnalyzing(true);
      isAnalyzingRef.current = true;
      setIsLiveSessionCompleted(false);
      const existingPct = Math.max(liveProgress?.percentage ?? 20, 20);
      progressRef.current = existingPct;
      updateProgressAndStage(existingPct, liveProgress?.step);
      runProgressSequence(targetId);
      return;
    }

    setAnalyzing(false);
    isAnalyzingRef.current = false;
    setIsLiveSessionCompleted(false);
    setIsDocumentsRequested(rawStatus === "DOCUMENTS_REQUESTED");
    progressRef.current = 100;
    updateProgressAndStage(100, rawStatus === "DOCUMENTS_REQUESTED" ? "Documents Requested" : rawStatus === "SUBMITTED" ? "Submitted" : "AI Verification Complete");

    try {
      const prevData = await fetchClaimPreview(targetId);
      if (activeClaimIdRef.current !== targetId) return;
      if (prevData) {
        setRealPreview(prevData);
        setPreviewVersion((v) => v + 1);
        const statusUpper = (prevData.status || "").toUpperCase();
        setIsDocumentsRequested(statusUpper === "DOCUMENTS_REQUESTED");
        if (prevData.status) {
          const prevSt = prevData.status.toUpperCase();
          try {
            localStorage.setItem(`claimgpt_claim_status_${targetId}`, prevSt);
          } catch {}
          setRecentClaims((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, status: prevSt } : c))
          );
        }
      }
    } catch (err) {
      console.warn("Failed to fetch preview for selected claim:", err);
    }
  };

  /* Auto-scroll smoothly to Pipeline Progress Card whenever analysis starts */
  useEffect(() => {
    if (analyzing) {
      scrollToPipeline();
    }
  }, [analyzing]);

  /* Dynamically extracted metadata fields from backend preview */
  const selectedClaimMeta = recentClaims.find((c) => c.id === (claimId || activeClaimIdRef.current));

  const isDocFile = (val?: string | null) => Boolean(val && /\.(pdf|png|jpe?g|tiff?|docx?)$/i.test(val.trim()));
  const rawCandidatePatient = realPreview?.summary?.patient_name && realPreview.summary.patient_name !== "N/A"
    ? realPreview.summary.patient_name
    : realPreview?.parsed_fields?.patient_name || realPreview?.parsed_fields?.member_name || realPreview?.parsed_fields?.insured_name || selectedClaimMeta?.patient_name;
  const extractedPatient = rawCandidatePatient && !isDocFile(rawCandidatePatient) && rawCandidatePatient !== "Processing..."
    ? rawCandidatePatient.trim()
    : "";

  const extractedHospital = realPreview?.summary?.hospital && realPreview.summary.hospital !== "N/A"
    ? realPreview.summary.hospital
    : realPreview?.parsed_fields?.hospital_name || realPreview?.parsed_fields?.hospital || selectedClaimMeta?.hospital_name;

  const extractedAdmission = realPreview?.summary?.admission_date && realPreview.summary.admission_date !== "N/A"
    ? realPreview.summary.admission_date
    : realPreview?.parsed_fields?.admission_date || realPreview?.parsed_fields?.service_date;

  const extractedDischarge = realPreview?.summary?.discharge_date && realPreview.summary.discharge_date !== "N/A"
    ? realPreview.summary.discharge_date
    : realPreview?.parsed_fields?.discharge_date;

  const extractedDiagnosis = realPreview?.summary?.diagnosis && realPreview.summary.diagnosis !== "N/A"
    ? realPreview.summary.diagnosis
    : realPreview?.parsed_fields?.diagnosis || realPreview?.parsed_fields?.primary_diagnosis || selectedClaimMeta?.diagnosis;

  const hasClaim = Boolean(claimId || realPreview);
  const patientName = extractedPatient || (analyzing ? "Processing..." : "");
  const hospitalName = extractedHospital || (analyzing ? "Processing..." : "");
  const admissionDate = extractedAdmission || (analyzing ? "Processing..." : "");
  const dischargeDate = extractedDischarge || (analyzing ? "Processing..." : "");
  const diagnosis = extractedDiagnosis || (analyzing ? "Processing..." : "");

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
    if (activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }
    setPendingFiles([]);
    setFiles([]);
    setClaimId(null);
    setRealPreview(null);
    progressRef.current = 0;
    setProgress(0);
    setActiveStage('staged');
    setStepDescription("Claim Attached");
    setAnalyzing(false);
    isAnalyzingRef.current = false;
    setUploading(false);
    setIsLiveSessionCompleted(false);
    setIsDocumentsRequested(false);
    setMissingGroups([]);
    setIsUploadOpen(true);
    setActiveDocumentId(null);
    activeClaimIdRef.current = null;
    reloadRecentClaims();
  };

  /* Direct upload & instant analysis */
  const handleUploadFile = async (fileInput: File | File[], appendToActive = false) => {
    handleSelectFile(fileInput);
    const filesToUpload = Array.isArray(fileInput) ? fileInput : [fileInput];
    await startClaimAnalysis(filesToUpload, appendToActive);
  };

  /* Live real-time backend pipeline progress tracker */
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
      isAnalyzingRef.current = false;
      setIsLiveSessionCompleted(true);
      setIsUploadOpen(false); // Cleanly collapse the upload panel
      
      const idToQuery = targetClaimId || (await fetchLatestClaimId()) || null;
      if (idToQuery) {
        setClaimId(idToQuery);
        const finalData = await fetchClaimPreview(idToQuery);
        if (finalData) {
          setRealPreview(finalData);
          setPreviewVersion((v) => v + 1);
        }
      }
      reloadRecentClaims();
    };

    const pollStartTime = Date.now();

    const pollInterval = setInterval(async () => {
      if (dataArrived) {
        clearInterval(pollInterval);
        if (activePollRef.current === pollInterval) activePollRef.current = null;
        return;
      }

      // If user minimized or switched away from the browser tab, pause polling to conserve server load
      if (typeof document !== "undefined" && document.hidden) {
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

      if (!targetClaimId) {
        clearInterval(pollInterval);
        if (activePollRef.current === pollInterval) activePollRef.current = null;
        return;
      }

      const idToQuery = targetClaimId;
      if (isMockId(idToQuery)) {
        await finishProgress();
        return;
      }

      const statusInfo = await fetchClaimProgress(idToQuery);
      if (statusInfo) {
        if (statusInfo.not_found || statusInfo.status === "NOT_FOUND") {
          clearInterval(pollInterval);
          if (activePollRef.current === pollInterval) activePollRef.current = null;
          setAnalyzing(false);
          isAnalyzingRef.current = false;
          setIsLiveSessionCompleted(false);
          setProgress(0);
          setActiveStage('staged');
          setStepDescription("Claim removed or not found");
          reloadRecentClaims();
          return;
        }

        if (statusInfo.status === "IDENTITY_MISMATCH" || statusInfo.step?.includes("Identity Mismatch")) {
          setAnalyzing(false);
          isAnalyzingRef.current = false;
          setIsLiveSessionCompleted(false);
          setProgress(0);
          setActiveStage('staged');
          const errorDetail = (statusInfo as any).error || "Identity mismatch detected across documents. Uploaded set removed. Please re-upload the entire set.";
          setStepDescription(errorDetail);
          setIdentityMismatchMessage(errorDetail);
          setShowIdentityMismatchModal(true);
          dataArrived = true;
          clearInterval(pollInterval);
          if (activePollRef.current === pollInterval) activePollRef.current = null;
          reloadRecentClaims();
          return;
        }

        if (statusInfo.status === "STALLED" || statusInfo.is_stalled) {
          setAnalyzing(false);
          isAnalyzingRef.current = false;
          setIsLiveSessionCompleted(false);
          setIsStalled(true);
          const errorDetail = statusInfo.error || "Analysis stalled due to worker timeout or interruption. Click 'Restart AI Analysis' to resume.";
          setStalledMessage(errorDetail);
          setStepDescription(errorDetail);
          dataArrived = true;
          clearInterval(pollInterval);
          if (activePollRef.current === pollInterval) activePollRef.current = null;
          toast({
            title: "Pipeline Stalled",
            description: errorDetail,
            variant: "destructive",
          });
          reloadRecentClaims();
          return;
        }

        if (statusInfo.status === "FAILED") {
          setAnalyzing(false);
          isAnalyzingRef.current = false;
          setIsLiveSessionCompleted(false);
          setIsStalled(true);
          const errorDetail = (statusInfo as any).error || statusInfo.step || "Processing failed in the backend pipeline. Please check the logs or retry.";
          setStalledMessage(errorDetail);
          setStepDescription(errorDetail);
          dataArrived = true;
          clearInterval(pollInterval);
          if (activePollRef.current === pollInterval) activePollRef.current = null;
          toast({
            title: "Backend Processing Failed",
            description: errorDetail,
            variant: "destructive",
          });
          reloadRecentClaims();
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
          isAnalyzingRef.current = false;
          setIsLiveSessionCompleted(false);
          setProgress(100);
          setActiveStage('scoring');
          setStepDescription(statusInfo.status === "DOCUMENTS_REQUESTED" ? "Documents Requested" : "Manual Review Required");
          dataArrived = true;
          clearInterval(pollInterval);
          return;
        }

        const isServerComplete = Boolean(
          statusInfo.is_complete || 
          statusInfo.percentage >= 100 || 
          statusInfo.status === "COMPLETED" || 
          statusInfo.status === "VALIDATED" ||
          statusInfo.status === "FINISHED"
        );

        if (isServerComplete) {
          await finishProgress();
          return;
        }

        // Live real percentage and step directly from backend
        if (statusInfo.percentage !== undefined && statusInfo.percentage > 0) {
          updateProgressAndStage(statusInfo.percentage, statusInfo.step ? `${statusInfo.step} - ${statusInfo.percentage}%` : undefined);
        }
      }
    }, 1200);
    activePollRef.current = pollInterval;
  };

  /* Begin Claim Analysis action button */
  const startClaimAnalysis = async (overrideFiles?: File | File[], appendToActive = false, explicitClaimId?: string) => {
    let targetFiles: File[] = [];
    if (overrideFiles) {
      targetFiles = Array.isArray(overrideFiles) ? overrideFiles : [overrideFiles];
    } else {
      targetFiles = pendingFiles.length > 0 ? pendingFiles : files.map((f: any) => f.rawFile).filter(Boolean);
    }

    if (targetFiles.length === 0 && files.length === 0) return;

    const effectiveTargetClaimId = (appendToActive && (explicitClaimId || claimId)) ? (explicitClaimId || claimId) : null;

    if (activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }

    if (!appendToActive) {
      setRealPreview(null);
      setClaimId(null);
      activeClaimIdRef.current = null;
    }
    setIsDocumentsRequested(false);
    setMissingGroups([]);
    setIsStalled(false);
    setIsRetrying(false);
    setStalledMessage(null);

    setAnalyzing(true);
    isAnalyzingRef.current = true;
    setUploading(true);
    setShowReportModal(false);
    setIsLiveSessionCompleted(false);
    setIsUploadOpen(true); // Keep open during analysis to show progress
    setActiveStage('ocr');
    progressRef.current = 20;
    setProgress(20);
    setStepDescription("OCR (extracting text) · 20%");

    scrollToPipeline();

    let activeClaimId: string | null = null;
    try {
      const session = getStoredAuthSession();
      const effectivePatientId = session?.user?.id || session?.user?.sub || session?.user?.oid || session?.user?.email || userEmail;
      const res = await uploadClaimDocument(
        targetFiles.length > 0 ? targetFiles : files.map((f: any) => f.rawFile || new File([], f.name)), 
        userName, 
        effectiveTargetClaimId ? effectiveTargetClaimId : undefined,
        false,
        effectivePatientId
      );
      if (res.claim_id) {
        if (res.is_duplicate && !appendToActive) {
          setDuplicateClaimId(res.claim_id);
          setDuplicateFiles(targetFiles.length > 0 ? targetFiles : files.map((f: any) => f.rawFile).filter(Boolean));
          setAnalyzing(false);
          isAnalyzingRef.current = false;
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
        if (!appendToActive) {
          setClaimCreatedAt(new Date().toISOString());
        }

        if (appendToActive && effectiveTargetClaimId) {
          // In-place update of existing claim record
          setRecentClaims((prev) =>
            prev.map((c) => {
              if (c.id === effectiveTargetClaimId) {
                const existingDocs = c.documents || [];
                const newDocEntries = targetFiles.map((f, i) => ({ id: `doc-${existingDocs.length + i}`, file_name: f.name }));
                return {
                  ...c,
                  status: "UPLOADED",
                  documents: [...existingDocs, ...newDocEntries],
                  progress: {
                    percentage: 20,
                    step: "OCR (extracting text) · 20%",
                    is_complete: false,
                  },
                };
              }
              return c;
            })
          );
        } else {
          // Optimistically add the new processing claim to recentClaims at the top
          setRecentClaims((prev) => {
            if (prev.some((c) => c.id === res.claim_id)) return prev;
            return [
              {
                id: res.claim_id,
                patient_name: "Processing...",
                status: "UPLOADED",
                created_at: new Date().toISOString(),
                total_amount: "",
                documents: targetFiles.map((f, i) => ({ id: `doc-${i}`, file_name: f.name })),
                progress: {
                  percentage: 20,
                  step: "OCR (extracting text) · 20%",
                  is_complete: false,
                },
              } as any,
              ...prev,
            ];
          });
        }

      }
    } catch (err) {
      console.warn("Backend API upload error:", err);
    } finally {
      setUploading(false);
    }

    if (activeClaimId) {
      runProgressSequence(activeClaimId);
    } else {
      setAnalyzing(false);
      isAnalyzingRef.current = false;
      setProgress(0);
      setActiveStage('staged');
      setStepDescription("Upload failed. Please retry.");
    }
  };

  /* Force re-upload and re-process duplicate document, replacing the old record */
  const handleReprocessAnyway = async () => {
    const filesToUpload = duplicateFiles.length > 0 
      ? duplicateFiles 
      : (pendingFiles.length > 0 ? pendingFiles : files.map((f: any) => f.rawFile).filter(Boolean));
      
    if (filesToUpload.length === 0) return;

    if (activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }

    const oldDupId = duplicateClaimId;
    setIsReprocessing(true);
    setDuplicateClaimId(null);
    setDuplicateFiles([]);
    setRealPreview(null);
    setClaimId(null);
    activeClaimIdRef.current = null;
    setIsDocumentsRequested(false);
    setMissingGroups([]);
    setIsStalled(false);
    setIsRetrying(false);
    setStalledMessage(null);

    setAnalyzing(true);
    isAnalyzingRef.current = true;
    setUploading(true);
    setShowReportModal(false);
    setIsLiveSessionCompleted(false);
    setIsUploadOpen(true);
    setActiveStage('ocr');
    progressRef.current = 20;
    setProgress(20);
    setStepDescription("OCR (extracting text) · 20%");

    scrollToPipeline();

    let activeClaimId: string | null = null;
    try {
      const session = getStoredAuthSession();
      const effectivePatientId = session?.user?.id || session?.user?.sub || session?.user?.oid || session?.user?.email || userEmail;
      const res = await uploadClaimDocument(filesToUpload, userName, undefined, true, effectivePatientId);
      if (res.claim_id) {
        activeClaimId = res.claim_id;
        activeClaimIdRef.current = res.claim_id;
        setClaimId(res.claim_id);
        setClaimCreatedAt(new Date().toISOString());

        // Optimistically remove old duplicate claim from list & prepend new claim
        setRecentClaims((prev) => {
          const filtered = prev.filter((c) => c.id !== oldDupId && c.id !== res.claim_id);
          return [
            {
              id: res.claim_id,
              patient_name: "Processing...",
              status: "UPLOADED",
              created_at: new Date().toISOString(),
              total_amount: "",
              documents: filesToUpload.map((f, i) => ({ id: `doc-${i}`, file_name: f.name })),
              progress: {
                percentage: 20,
                step: "OCR (extracting text) - 20%",
                is_complete: false,
              },
            } as any,
            ...filtered,
          ];
        });

        const initialPreview = await fetchClaimPreview(res.claim_id);
        if (initialPreview) {
          setRealPreview(initialPreview);
          setPreviewVersion((v) => v + 1);
        }
      }
    } catch (err) {
      console.warn("Backend API forced reprocess error:", err);
    } finally {
      setUploading(false);
      setIsReprocessing(false);
    }

    if (activeClaimId) {
      runProgressSequence(activeClaimId);
    } else {
      setAnalyzing(false);
      isAnalyzingRef.current = false;
      setProgress(0);
      setActiveStage('staged');
      setStepDescription("Upload failed. Please retry.");
    }
  };

  /* Restart AI Analysis for stalled or failed claims without re-uploading documents */
  const retryClaimAnalysis = async (targetId?: string) => {
    const claimToRetry = targetId || claimId || activeClaimIdRef.current;
    if (!claimToRetry) return;

    if (activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }

    setIsRetrying(true);
    setIsStalled(false);
    setStalledMessage(null);
    setAnalyzing(true);
    isAnalyzingRef.current = true;
    updateProgressAndStage(10, "Restarting AI analysis pipeline...");

    try {
      const res = await retryClaimProcessing(claimToRetry);
      if (res.success) {
        toast({
          title: "AI Analysis Restarted",
          description: "Claim has been re-queued for processing.",
        });
        runProgressSequence(claimToRetry);
      } else {
        setIsStalled(true);
        setStalledMessage(res.message || "Failed to restart analysis. Please try again.");
        setAnalyzing(false);
        isAnalyzingRef.current = false;
        toast({
          title: "Restart Failed",
          description: res.message || "Failed to re-enqueue claim.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setIsStalled(true);
      setStalledMessage(err?.message || "Failed to restart analysis.");
      setAnalyzing(false);
      isAnalyzingRef.current = false;
      toast({
        title: "Restart Failed",
        description: err?.message || "Unexpected error restarting analysis.",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };





  /* Manually open report modal and fetch selected or latest claim preview directly from backend */
  const openReportModal = async (targetClaimId?: string) => {
    try {
      const idToQuery = targetClaimId || claimId || (await fetchLatestClaimId());
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
    : [];

  const total = lineItems.reduce((sum, i) => sum + i.amount, 0);
  const stageIndex = PIPELINE.findIndex((s) => s.key === activeStage);

  const markEdited = (key: string) =>
    setEdited((e) => (e[key] ? e : { ...e, [key]: true }));

  /* Resolve enrolled TPA / Insurer from registration, profile, or preview */
  const enrolledTpa = useMemo(() => {
    try {
      // 1. First priority: Ground truth insurer extracted directly from the uploaded claim document
      const docInsurer =
        (realPreview?.parsed_fields as any)?.insurance_company ||
        (realPreview?.parsed_fields as any)?.insurer ||
        (realPreview?.parsed_fields as any)?.tpa_name ||
        (realPreview?.summary as any)?.insurer ||
        (realPreview as any)?.insurance_company ||
        "";
      if (docInsurer && docInsurer !== "Star Health" && docInsurer !== "N/A" && docInsurer !== "Pending Insurer Selection") {
        return docInsurer.trim();
      }

      // 2. Second priority: User-explicitly configured insurer in session / profile storage
      const email = userEmail || "";
      const name = userName || "";
      const session = getStoredAuthSession();
      const sessionEmail = session?.user?.email || "";
      const sessionName = session?.user?.name || "";

      const stored =
        (sessionEmail && localStorage.getItem(`claimgpt_user_insurer_${sessionEmail}`)) ||
        (sessionName && localStorage.getItem(`claimgpt_user_insurer_${sessionName}`)) ||
        (email && localStorage.getItem(`claimgpt_user_insurer_${email}`)) ||
        (name && localStorage.getItem(`claimgpt_user_insurer_${name}`)) ||
        localStorage.getItem("claimgpt_user_insurer") ||
        (sessionEmail && localStorage.getItem(`claimgpt_user_org_${sessionEmail}`)) ||
        (sessionName && localStorage.getItem(`claimgpt_user_org_${sessionName}`)) ||
        (email && localStorage.getItem(`claimgpt_user_org_${email}`)) ||
        (name && localStorage.getItem(`claimgpt_user_org_${name}`)) ||
        localStorage.getItem("claimgpt_user_org") ||
        "";
      return (stored && stored !== "Star Health" && stored !== "N/A" && stored !== "Pending Insurer Selection") ? stored.trim() : (docInsurer.trim() || "");
    } catch {
      return "";
    }
  }, [userEmail, userName, realPreview]);

  const tpaParam = enrolledTpa ? `&tpa_name=${encodeURIComponent(enrolledTpa)}` : "";

  /* PDF Report URLs */
  const tpaPdfUrl = claimId ? `${SUBMISSION_API}/claims/${claimId}/tpa-pdf?${tpaParam.slice(1)}` : null;
  const irdaPdfUrl = claimId ? `${SUBMISSION_API}/claims/${claimId}/irda-pdf` : null;
  const tpaPdfViewUrl = claimId ? `${SUBMISSION_API}/claims/${claimId}/tpa-pdf?view=true${tpaParam}` : null;
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

  const refreshClaim = async (targetClaimId?: string) => {
    const idToSync = targetClaimId || claimId;
    if (!idToSync) return;
    try {
      const prevData = await fetchClaimPreview(idToSync);
      if (prevData) {
        setRealPreview(prevData);
        setRecentClaims((prev) =>
          prev.map((c) => {
            if (c.id === idToSync) {
              const pf = (prevData.parsed_fields as Record<string, string>) || {};
              const pol = pf.policy_number || pf.policy_id || prevData.policy_id || c.policy_number || c.policy_id;
              const ins = (prevData as any).insurance_company || (prevData.summary as any)?.insurance_company || pf.insurance_company || pf.insurer || c.insurer || c.insurance_company;
              return {
                ...c,
                status: prevData.status || c.status,
                policy_number: pol,
                insurer: ins,
                documents: prevData.documents || c.documents,
                document_count: (prevData.documents || []).length || c.document_count,
              };
            }
            return c;
          })
        );
      }
    } catch (e) {
      console.warn("Failed to refresh claim data:", e);
    }
  };

  const saveDetails = async (details: Record<string, string>) => {
    if (!claimId) return;
    const success = await saveClaimDetailsApi(claimId, details);
    if (success) {
      await refreshClaim(claimId);
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
    claimCreatedAt: recentClaims.find((c) => c.id === claimId)?.created_at || (realPreview as any)?.created_at || claimCreatedAt,
    selectClaim,
    deleteClaim,
    deleteDocument,
    reloadRecentClaims,
    isDocumentsRequested,
    missingGroups,
    tpaMessage,
    tpaRequestedDocs,
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
    handleReprocessAnyway,
    isReprocessing,
    showIdentityMismatchModal,
    setShowIdentityMismatchModal,
    identityMismatchMessage,
    saveExpenses,
    saveDetails,
    refreshClaim,
    claimProgressMap,
    /* Stalled pipeline recovery */
    isStalled,
    isRetrying,
    stalledMessage,
    retryClaimAnalysis,
  };
}

export type AuditorState = ReturnType<typeof useAuditorState>;

export { LINE_ITEMS, PIPELINE, formatINR };
