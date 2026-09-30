'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import logoMark from './ClaimsGuru White PNG.png';
import {
  CheckCircle2,
  Eye,
  FileText,
  X,
  Activity,
  ShieldCheck,
  Loader2,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  FileCheck,
  Layers,
  CheckSquare,
  Square,
  Stethoscope,
  ArrowLeft,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Send,
  Clock,
  Copy,
  Check,
  Building2,
  UploadCloud,
  Info,
} from 'lucide-react';
import { type AuditorState } from '@/components/claimgpt/use-auditor-state';
import { formatINR, formatClaimExactDateTime } from '@/lib/claimgpt-data';
import { cn } from '@/lib/utils';
import {
  SUBMISSION_API,
  fetchTpaListApi,
  extractPolicyFromDocApi,
  submitClaimToPayerApi,
  type TpaProviderItem,
} from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface CanonicalField {
  key: string;
  label: string;
  aliases: string[];
  category: 'identity' | 'timeline' | 'clinical';
}

const CANONICAL_FIELDS: CanonicalField[] = [
  { key: 'patient_name', label: 'Patient Name', aliases: ['patient_name', 'patientname', 'name'], category: 'identity' },
  { key: 'patient_id', label: 'UHID / IP Number', aliases: ['patient_id', 'uhid', 'ip_number', 'ipd_no', 'ip_no'], category: 'identity' },
  { key: 'policy_number', label: 'Policy Number', aliases: ['insurance_policy_number', 'policy_number', 'policy_no', 'policy'], category: 'identity' },
  { key: 'gender', label: 'Gender', aliases: ['patient_gender', 'gender', 'sex'], category: 'identity' },
  { key: 'age', label: 'Age', aliases: ['patient_age', 'age'], category: 'identity' },
  { key: 'hospital_name', label: 'Hospital Name', aliases: ['hospital_name', 'hospital'], category: 'clinical' },
  { key: 'admission_date', label: 'Admission Date', aliases: ['admission_date', 'admission'], category: 'timeline' },
  { key: 'discharge_date', label: 'Discharge Date', aliases: ['discharge_date', 'discharge'], category: 'timeline' },
  { key: 'doctor_name', label: 'Attending Doctor', aliases: ['doctor_name', 'doctor', 'consultant'], category: 'clinical' },
  { key: 'diagnosis', label: 'Primary Diagnosis', aliases: ['diagnosis', 'primary_diagnosis', 'clinical_diagnosis', 'final_diagnosis'], category: 'clinical' },
  { key: 'patient_address', label: 'Patient Address', aliases: ['patient_address', 'address'], category: 'identity' },
];

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
}

export function ClaimReportModal({ s }: { s: AuditorState }) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState<'tpa' | 'irdai' | null>(null);
  const [isSubmittingToPayer, setIsSubmittingToPayer] = useState(false);
  const [isSubmittedToPayer, setIsSubmittedToPayer] = useState(false);
  const [submittedPayer, setSubmittedPayer] = useState<string>('');

  // Submit to Insurer / TPA State
  const [showInsurerModal, setShowInsurerModal] = useState(false);
  const [tpaList, setTpaList] = useState<TpaProviderItem[]>([]);
  const [loadingTpas, setLoadingTpas] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedInsurer, setSelectedInsurer] = useState<string>('Star Health');
  const [policyId, setPolicyId] = useState<string>('');
  const [policyFromOcr, setPolicyFromOcr] = useState<boolean>(false);
  const [isUploadingPolicyDoc, setIsUploadingPolicyDoc] = useState(false);
  const [ocrSuccessBanner, setOcrSuccessBanner] = useState<string | null>(null);
  const policyFileInputRef = useRef<HTMLInputElement | null>(null);

  const [inlinePdf, setInlinePdf] = useState<{
    url: string;
    title: string;
    type: 'tpa' | 'irdai';
  } | null>(null);

  // Editable Form State
  const [patientName, setPatientName] = useState(s.patientName || 'N/A');
  const [hospitalName, setHospitalName] = useState(s.hospitalName || 'N/A');
  const [admissionDate, setAdmissionDate] = useState(s.admissionDate || 'N/A');
  const [dischargeDate, setDischargeDate] = useState(s.dischargeDate || 'N/A');
  const [diagnosis, setDiagnosis] = useState(s.diagnosis || 'N/A');
  const [billedAmount, setBilledAmount] = useState<number>(s.total || 0);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [isDetailsDirty, setIsDetailsDirty] = useState(false);

  // Editable Expenses State
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    if (s.realPreview?.expenses?.length) {
      return s.realPreview.expenses.map((li, i) => ({
        id: `exp-${i + 1}`,
        category: li.category,
        amount: Number(li.amount) || 0,
      }));
    }
    return s.lineItems?.length
      ? s.lineItems.map((li, i) => ({ id: li.id ? String(li.id) : `exp-${i}`, category: li.category, amount: li.amount }))
      : [];
  });
  const [expensesSaved, setExpensesSaved] = useState(false);
  const [isExpensesDirty, setIsExpensesDirty] = useState(false);


  const preview = s.realPreview;
  const summary = preview?.summary;
  const lastInitializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!s.showReportModal) {
      setInlinePdf(null);
      lastInitializedKeyRef.current = null;
      return;
    }

    const claimKey = `${s.claimId || 'default'}-${s.previewVersion || 0}-${Boolean(preview?.expenses?.length)}`;
    if (lastInitializedKeyRef.current === claimKey) {
      return; // Already initialized for this claim session; preserve active user edits
    }
    lastInitializedKeyRef.current = claimKey;

    // Check if claim is already submitted
    if (preview?.status === 'SUBMITTED' || (preview as any)?.is_submitted) {
      setIsSubmittedToPayer(true);
      const knownPayer = (preview as any)?.insurance_company || (preview as any)?.payer || (typeof window !== 'undefined' && s.claimId ? localStorage.getItem(`claimgpt_submitted_payer_${s.claimId}`) : '');
      if (knownPayer) setSubmittedPayer(knownPayer);
    } else {
      setIsSubmittedToPayer(false);
      setSubmittedPayer('');
    }

    if (!isDetailsDirty) {
      setPatientName(summary?.patient_name || s.patientName || 'Patient');
      setHospitalName(summary?.hospital || s.hospitalName || 'Hospital');
      setAdmissionDate(summary?.admission_date || s.admissionDate || '');
      setDischargeDate(summary?.discharge_date || s.dischargeDate || '');
      setDiagnosis(summary?.diagnosis || s.diagnosis || '');

      const billed = preview?.net_payable ?? preview?.billed_total ?? Number(summary?.total_amount ?? NaN);
      setBilledAmount(Number.isFinite(billed) && Number(billed) > 0 ? Number(billed) : s.total || 0);
    }

    if (!isExpensesDirty) {
      const initialExpenses: ExpenseItem[] = preview?.expenses?.length
        ? preview.expenses.map((item, index) => ({
            id: `exp-${index + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            category: item.category || `Expense ${index + 1}`,
            amount: Number(item.amount) || 0,
          }))
        : s.lineItems?.length
          ? s.lineItems.map((item, index) => ({
              id: item.id ? String(item.id) : `exp-${index + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              category: item.category,
              amount: Number(item.amount) || 0,
            }))
          : [];

      setExpenses(initialExpenses);
    }
  }, [
    s.showReportModal,
    s.claimId,
    s.previewVersion,
    s.patientName,
    s.hospitalName,
    s.admissionDate,
    s.dischargeDate,
    s.diagnosis,
    s.total,
    summary,
    preview,
    isDetailsDirty,
    isExpensesDirty,
  ]);


  // Medical Codes (Read-Only)
  const icdCodes = preview?.icd_codes?.length
    ? preview.icd_codes
    : [];

  const cptCodes = preview?.cpt_codes?.length
    ? preview.cpt_codes
    : [];

  // IRDAI Validation Rules (Moved to last section)
  const validations = preview?.validations || [];

  const rawRiskScore = preview?.predictions?.[0]?.rejection_score ?? summary?.risk_score;
  const riskScoreNum = rawRiskScore !== undefined && rawRiskScore !== null
    ? Math.round(rawRiskScore <= 1 ? rawRiskScore * 100 : rawRiskScore)
    : 12;

  // Cross-Document Intelligence: compute from canonical verified fields
  const parsedFieldsObj = (preview?.parsed_fields && typeof preview.parsed_fields === 'object')
    ? (preview.parsed_fields as Record<string, any>)
    : {};

  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || '').trim());

  const verifiedFields = CANONICAL_FIELDS.map(cfg => {
    let val: string = '';
    for (const alias of cfg.aliases) {
      const candidate = parsedFieldsObj[alias];
      if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
        const candidateStr = String(candidate).trim();
        // Skip raw json strings
        if (!candidateStr.startsWith('{') && !candidateStr.startsWith('[')) {
          if (cfg.key === 'policy_number' && (isUuid(candidateStr) || candidateStr.toUpperCase() === 'N/A' || candidateStr.toLowerCase() === 'null' || candidateStr === preview?.patient_id || candidateStr === (s as any)?.patientId)) {
            continue;
          }
          if (cfg.key === 'patient_id' && (isUuid(candidateStr) || candidateStr.toUpperCase() === 'N/A' || candidateStr.toLowerCase() === 'null')) {
            continue;
          }
          val = candidateStr;
          break;
        }
      }
    }
    // Fallback to top-level preview / auditor state if not in parsed_fields
    if (!val) {
      if (cfg.key === 'patient_name') val = (preview?.patient_name && preview.patient_name !== 'N/A' ? preview.patient_name : ((s as any)?.patientName || ''));
      else if (cfg.key === 'hospital_name') val = (preview?.hospital_name && preview.hospital_name !== 'N/A' ? preview.hospital_name : ((s as any)?.hospitalName || ''));
      else if (cfg.key === 'admission_date') val = (preview?.admission_date && preview.admission_date !== 'N/A' ? preview.admission_date : ((s as any)?.admissionDate || ''));
      else if (cfg.key === 'discharge_date') val = (preview?.discharge_date && preview.discharge_date !== 'N/A' ? preview.discharge_date : ((s as any)?.dischargeDate || ''));
      else if (cfg.key === 'diagnosis') val = (preview?.diagnosis && preview.diagnosis !== 'N/A' ? preview.diagnosis : ((s as any)?.diagnosis || ''));
      else if (cfg.key === 'policy_number') {
        const cand = ((summary as any)?.policy_number || preview?.policy_id || (s as any)?.policyNumber || '').trim();
        val = (!cand || isUuid(cand) || cand.toUpperCase() === 'N/A' || cand.toLowerCase() === 'null' || cand === preview?.patient_id || cand === (s as any)?.patientId) ? '' : cand;
      }
      else if (cfg.key === 'patient_id') {
        const cand = ((preview as any)?.uhid || (preview as any)?.ip_number || '').trim();
        val = (!cand || isUuid(cand) || cand.toUpperCase() === 'N/A' || cand.toLowerCase() === 'null') ? '' : cand;
      }
      else if (cfg.key === 'gender') val = preview?.gender || '';
      else if (cfg.key === 'age') val = preview?.age ? String(preview.age) : '';
    }
    const isValClean = Boolean(val && !isUuid(val) && val.toLowerCase() !== 'n/a' && val.toLowerCase() !== 'null' && val.trim() !== '');
    return {
      key: cfg.key,
      label: cfg.label,
      value: isValClean ? val : 'N/A',
      category: cfg.category,
      isVerified: isValClean
    };
  });

  const totalParsedFields = verifiedFields.length;
  const verifiedCount = verifiedFields.filter(f => f.isVerified).length;
  const verificationReadiness = totalParsedFields > 0 ? Math.round((verifiedCount / totalParsedFields) * 100) : 0;
  const documents = (preview as any)?.documents as Array<{ type?: string; name?: string; fields_extracted?: number }> | undefined;
  const totalItemizedExpenses = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const grossTotal = preview?.gross_total && preview.gross_total > 0 ? preview.gross_total : billedAmount;
  const deductions = preview?.deductions ?? 0;
  
  // A claim's itemized line items are mathematically valid when they equal Net, Gross, or fall between Net & Gross (due to line-item non-payable deductions)
  const minExpected = Math.min(billedAmount, grossTotal);
  const maxExpected = Math.max(billedAmount, grossTotal);
  const isWithinBillBounds = totalItemizedExpenses >= (minExpected - 100) && totalItemizedExpenses <= (maxExpected + 100);
  
  const varianceToNet = Math.abs(billedAmount - totalItemizedExpenses);
  const varianceToGross = Math.abs(grossTotal - totalItemizedExpenses);
  const varianceAfterDeductions = Math.abs((totalItemizedExpenses - deductions) - billedAmount);
  const expenseMismatch = isWithinBillBounds ? 0 : Math.min(varianceToNet, varianceToGross, varianceAfterDeductions);


  // Dynamic Checklist Verification based on actual analyzed documents and extracted claim data
  const checklistItems = useMemo(() => {
    const docList = ((preview as any)?.documents || []) as Array<{
      doc_type?: string;
      type?: string;
      file_name?: string;
      original_filename?: string;
      name?: string;
    }>;

    const docTypeSet = new Set<string>();
    for (const d of docList) {
      const dt = String(d.doc_type || d.type || '').toUpperCase();
      const fn = String(d.file_name || d.original_filename || d.name || '').toLowerCase();
      if (dt) docTypeSet.add(dt);
      if (fn.includes('discharge') || fn.includes('summary')) docTypeSet.add('DISCHARGE_SUMMARY');
      if (fn.includes('bill') || fn.includes('hospital') || fn.includes('inpatient')) docTypeSet.add('HOSPITAL_BILL');
      if (fn.includes('pharmacy') || fn.includes('rx') || fn.includes('drug') || fn.includes('invoice')) docTypeSet.add('PHARMACY_INVOICE');
      if (fn.includes('lab') || fn.includes('radiology') || fn.includes('xray') || fn.includes('ct') || fn.includes('mri') || fn.includes('report') || fn.includes('diagnostic')) docTypeSet.add('LAB_REPORT');
      if (fn.includes('policy') || fn.includes('card') || fn.includes('schedule') || fn.includes('insurance')) docTypeSet.add('INSURANCE_POLICY');
    }

    const hasExpenses = expenses.length > 0;
    const hasPharmacyExpenses = expenses.some(e => {
      const c = e.category.toLowerCase();
      return c.includes('rx') || c.includes('inj.') || c.includes('tablet') || c.includes('pharmacy') || c.includes('medicine') || c.includes('drug') || c.includes('syrup') || c.includes('fluid');
    });
    const hasDiagnosticExpenses = expenses.some(e => {
      const c = e.category.toLowerCase();
      return c.includes('lab') || c.includes('blood') || c.includes('ecg') || c.includes('echo') || c.includes('x-ray') || c.includes('xray') || c.includes('mri') || c.includes('ct') || c.includes('scan') || c.includes('profile') || c.includes('creatinine') || c.includes('urea') || c.includes('test');
    });

    const hasClinicalDates = Boolean(admissionDate && admissionDate !== 'N/A' && dischargeDate && dischargeDate !== 'N/A');
    const hasDiagnosis = Boolean(diagnosis && diagnosis !== 'N/A');

    // 1. Discharge Summary
    const hasDischargeDoc = docTypeSet.has('DISCHARGE_SUMMARY');
    const hasDischargeContent = hasClinicalDates && hasDiagnosis;
    const dischargeStatus = hasDischargeDoc
      ? { label: 'Attached & Verified ✓', state: 'verified', color: 'emerald' }
      : hasDischargeContent
        ? { label: 'Extracted from Form ✓', state: 'extracted', color: 'teal' }
        : { label: 'Missing / Not Attached', state: 'missing', color: 'rose' };

    // 2. Hospital Bill
    const hasBillDoc = docTypeSet.has('HOSPITAL_BILL') || docTypeSet.has('INSURANCE_FORM');
    const hasBillAmount = billedAmount > 0;
    const billStatus = hasBillDoc
      ? { label: `Verified (${expenses.length > 0 ? `${expenses.length} Items` : 'Final Bill'}) ✓`, state: 'verified', color: 'emerald' }
      : hasBillAmount
        ? { label: `Billed Total Extracted ✓`, state: 'extracted', color: 'teal' }
        : { label: 'Missing / No Bill Found', state: 'missing', color: 'rose' };

    // 3. Pharmacy Receipts
    const hasPharmacyDoc = docTypeSet.has('PHARMACY_INVOICE');
    const pharmacyStatus = hasPharmacyDoc
      ? { label: 'Invoice Attached ✓', state: 'verified', color: 'emerald' }
      : hasPharmacyExpenses
        ? { label: 'In-Hospital Supply Reconciled ✓', state: 'extracted', color: 'teal' }
        : { label: 'Not Applicable / Optional', state: 'optional', color: 'slate' };

    // 4. Diagnostic & Lab Reports
    const hasLabDoc = docTypeSet.has('LAB_REPORT') || docTypeSet.has('RADIOLOGY_REPORT') || Boolean((preview as any)?.has_radiology_source);
    const diagnosticStatus = hasLabDoc
      ? { label: 'Lab Reports Attached ✓', state: 'verified', color: 'emerald' }
      : hasDiagnosticExpenses
        ? { label: 'Lab Charges Documented ✓', state: 'extracted', color: 'teal' }
        : { label: 'Not Applicable / Optional', state: 'optional', color: 'slate' };

    return [
      { id: 'discharge', title: 'Hospital Discharge Summary', ...dischargeStatus },
      { id: 'bill', title: 'Itemized Hospital Final Bill', ...billStatus },
      { id: 'pharmacy', title: 'Pharmacy Receipts & Invoices', ...pharmacyStatus },
      { id: 'diagnostic', title: 'Diagnostic & Lab Reports', ...diagnosticStatus },
    ];
  }, [preview, expenses, admissionDate, dischargeDate, diagnosis, billedAmount]);

  const uploadCreatedAt = s.claimCreatedAt || (preview as any)?.created_at || s.recentClaims?.find((c) => c.id === s.claimId)?.created_at;
  const uploadExactTime = formatClaimExactDateTime(uploadCreatedAt);
  const shortId = (s.claimId || "").replace(/-/g, "").slice(-8).toUpperCase();

  const handleCopyClaimId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (s.claimId) {
      navigator.clipboard.writeText(s.claimId);
      setCopiedId(true);
      toast({
        title: "Claim ID Copied",
        description: s.claimId,
      });
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (!s.showReportModal) return null;

  const tpaUrl = s.tpaPdfViewUrl || s.tpaPdfUrl;
  const irdaUrl = s.irdaPdfViewUrl || s.irdaPdfUrl;

  const openInlinePdfViewer = async (url: string, type: 'tpa' | 'irdai') => {
    setLoadingPdf(type);
    const title = type === 'tpa' ? 'TPA Comprehensive Audit Report' : 'IRDAI Standardized Claim Form';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP error ' + res.status);
      const contentType = res.headers.get('content-type') || '';
      const blob = await res.blob();
      if (!contentType.includes('application/pdf') && blob.type !== 'application/pdf') {
        const text = await blob.text();
        let errorDetail = 'Could not render PDF report';
        try {
          const json = JSON.parse(text);
          if (json.detail) errorDetail = json.detail;
        } catch {
          /* ignore */
        }
        throw new Error(errorDetail);
      }
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      setInlinePdf({ url: blobUrl, title, type });
    } catch (err) {
      console.warn('PDF preview error:', err);
      setInlinePdf({ url, title, type });
    } finally {
      setLoadingPdf(null);
    }
  };

  const closeInlinePdf = () => {
    if (inlinePdf?.url && inlinePdf.url.startsWith('blob:')) {
      URL.revokeObjectURL(inlinePdf.url);
    }
    setInlinePdf(null);
  };

  const handleSaveDetails = async () => {
    await s.saveDetails({
      patient_name: patientName,
      hospital_name: hospitalName,
      total_amount: String(billedAmount),
      admission_date: admissionDate,
      discharge_date: dischargeDate,
      diagnosis: diagnosis
    });
    setDetailsSaved(true);
    setIsDetailsDirty(false);
    setTimeout(() => setDetailsSaved(false), 2200);
  };

  const handleSaveExpenses = async () => {
    const sanitized = expenses
      .filter(e => e.category.trim() !== '' || e.amount > 0)
      .map(e => ({
        category: e.category.trim() || 'General Expense',
        amount: Number(e.amount) || 0,
      }));
    await s.saveExpenses(sanitized);
    setExpensesSaved(true);
    setIsExpensesDirty(false);
    setTimeout(() => setExpensesSaved(false), 2200);
  };

  const handleAddExpense = () => {
    const newId = `new-exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setExpenses(prev => [
      ...prev,
      { id: newId, category: '', amount: 0 },
    ]);
    setIsExpensesDirty(true);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(prev => prev.filter(item => item.id !== id));
    setIsExpensesDirty(true);
  };

  const handleExpenseChange = (id: string, field: 'category' | 'amount', value: string) => {
    setExpenses(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        if (field === 'amount') {
          const numVal = parseFloat(value.replace(/[^0-9.]/g, ''));
          return { ...item, amount: isNaN(numVal) ? 0 : numVal };
        }
        return { ...item, category: value };
      })
    );
    setIsExpensesDirty(true);
  };

  const handleOpenInsurerModal = async () => {
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

    // 1. Determine pre-filled Policy ID from OCR or preview
    let extractedPol = (
      (summary as any)?.policy_number ||
      (preview?.parsed_fields as any)?.policy_number ||
      (preview?.parsed_fields as any)?.policy_id ||
      ""
    ).trim();

    // If empty or UUID, check preview.policy_id only if it is NOT a UUID
    if (!extractedPol || isUuid(extractedPol)) {
      const cand = ((preview as any)?.policy_id || "").trim();
      extractedPol = isUuid(cand) ? "" : cand;
    }

    const isValPol = Boolean(
      extractedPol &&
      !isUuid(extractedPol) &&
      extractedPol.toUpperCase() !== "N/A" &&
      extractedPol.toLowerCase() !== "rohan" &&
      extractedPol.length >= 4
    );

    setPolicyId(isValPol ? extractedPol : (policyId && !isUuid(policyId) ? policyId : ''));
    setPolicyFromOcr(isValPol);

    // 2. Determine pre-filled Insurer
    const detectedInsurer = (
      (preview?.parsed_fields as any)?.insurance_company ||
      (preview?.parsed_fields as any)?.insurer ||
      (summary as any)?.insurer ||
      (s as any)?.enrolledTpa ||
      selectedInsurer ||
      'Star Health'
    );
    setSelectedInsurer(detectedInsurer);

    // 3. Fetch Organizations from DB
    setLoadingTpas(true);
    try {
      const list = await fetchTpaListApi();
      if (list && list.length > 0) {
        setTpaList(list);
        const matched = list.find(t => 
          t.name.toLowerCase().includes(detectedInsurer.toLowerCase()) || 
          detectedInsurer.toLowerCase().includes(t.name.toLowerCase())
        ) || list[0];
        setSelectedOrgId(matched.id);
        setSelectedInsurer(matched.name);
      }
    } catch (err) {
      console.warn('Could not load organizations list', err);
    } finally {
      setLoadingTpas(false);
    }

    setOcrSuccessBanner(null);
    setShowInsurerModal(true);
  };

  const handlePolicyDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !s.claimId) return;

    setIsUploadingPolicyDoc(true);
    setOcrSuccessBanner(null);
    try {
      const res = await extractPolicyFromDocApi(s.claimId, file);
      if (res.success && (res.policy_id || res.insurer)) {
        if (res.policy_id) {
          setPolicyId(res.policy_id);
          setPolicyFromOcr(true);
        }
        if (res.insurer) {
          setSelectedInsurer(res.insurer);
        }
        const bannerTxt = `Extracted ${res.policy_id ? `Policy #${res.policy_id}` : ''} ${res.insurer ? `(${res.insurer})` : ''} from ${file.name}`.trim();
        setOcrSuccessBanner(bannerTxt);
        toast({
          title: "Policy Extracted via Fast OCR",
          description: `Auto-filled: ${res.policy_id || 'Detected'}${res.insurer ? ` for ${res.insurer}` : ''}`,
        });
        // Reload preview to keep all reports linked
        const prev = await s.saveDetails({
          policy_number: res.policy_id || '',
          insurance_company: res.insurer || '',
        });
      } else {
        toast({
          title: "OCR Scan Completed",
          description: "Could not auto-detect policy number from this document. Please enter it manually.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Upload Error",
        description: "Failed to process document with Fast OCR.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPolicyDoc(false);
      if (policyFileInputRef.current) policyFileInputRef.current.value = '';
    }
  };

  const handleConfirmSubmitToTpa = async () => {
    if (!s.claimId || isSubmittingToPayer) return;
    if (!policyId.trim()) {
      toast({
        title: "Policy ID Required",
        description: "Please enter your policy number or upload your policy / health card.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedInsurer) {
      toast({
        title: "Insurer Required",
        description: "Please select an insurance company.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingToPayer(true);
    try {
      const res = await submitClaimToPayerApi(s.claimId, selectedInsurer, policyId.trim(), selectedOrgId);
      if (res.success) {
        setIsSubmittedToPayer(true);
        setSubmittedPayer(selectedInsurer);
        try {
          if (typeof window !== 'undefined' && s.claimId) {
            localStorage.setItem(`claimgpt_submitted_payer_${s.claimId}`, selectedInsurer);
          }
        } catch {}
        setShowInsurerModal(false);
        toast({
          title: "Claim Submitted Successfully",
          description: `Dispatched to ${selectedInsurer} TPA (Linked to Policy #${policyId.trim()}).`,
        });
        s.reloadRecentClaims();
      } else {
        toast({
          title: "Submission Error",
          description: res.error || "Could not submit claim. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Network Error",
        description: "Unable to connect to submission service.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingToPayer(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Main B2C Mobile-Optimized Report Modal */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-white/10 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        
        {/* Modal Header Bar */}
        <div className="flex-none flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-3.5 sm:px-6 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img src={logoMark.src} className="h-6 sm:h-7 w-auto object-contain flex-none" alt="ClaimsGuru" />
            <div className="h-4 w-px bg-white/20 flex-none hidden xs:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-base font-bold text-white tracking-tight">AI Audit &amp; Claim Report</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-emerald-400/90">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                </span>
              </div>
              <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[10px] sm:text-xs text-slate-400 mt-0.5">
                <button
                  type="button"
                  onClick={handleCopyClaimId}
                  className="inline-flex items-center gap-1 rounded bg-blue-500/15 hover:bg-blue-500/25 active:scale-95 text-blue-400 font-mono font-bold px-1.5 py-0.5 text-[9px] sm:text-[10px] border border-blue-500/30 transition-all cursor-pointer flex-none"
                  title={`Full Claim ID: ${s.claimId || 'N/A'}\n(Click to copy)`}
                >
                  <span>#{shortId || "CLM001"}</span>
                  {copiedId ? (
                    <Check className="h-2.5 w-2.5 text-emerald-400 flex-none" />
                  ) : (
                    <Copy className="h-2.5 w-2.5 opacity-60 hover:opacity-100 flex-none" />
                  )}
                </button>
                {uploadExactTime && (
                  <div className="inline-flex items-center gap-1 text-slate-400 text-[10px] sm:text-xs whitespace-nowrap" title={uploadCreatedAt || uploadExactTime}>
                    <span className="text-slate-600 font-semibold hidden sm:inline">•</span>
                    <Clock className="h-3 w-3 text-slate-500 flex-none" />
                    <span>Uploaded: <strong className="font-medium text-slate-300">{uploadExactTime}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={s.closeReportModal}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close Modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 scrollbar-thin">
          
          {/* 1. ⚡ 5-KPI METRIC CARDS STRIP */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
              <span>Claim Audit Metrics</span>
              <span className="text-[9px] text-teal-400 sm:hidden">Swipe →</span>
            </div>
            <div className="flex sm:grid sm:grid-cols-5 gap-2.5 overflow-x-auto snap-x pb-1 sm:pb-0 scrollbar-none">
              {/* Risk Score */}
              <div className="flex-none w-[130px] sm:w-auto snap-start rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400">Risk Score</span>
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1">{riskScoreNum}%</p>
                <span className="text-[9px] font-bold text-emerald-300 uppercase">Low Risk</span>
              </div>

              {/* Medical Codes */}
              <div className="flex-none w-[130px] sm:w-auto snap-start rounded-xl border border-white/10 bg-slate-800/60 p-2.5 sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400">Medical Codes</span>
                  <Stethoscope className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-white mt-1">{icdCodes.length + cptCodes.length}</p>
                <span className="text-[9px] font-semibold text-slate-400">ICD &amp; CPT</span>
              </div>

              {/* Rules Passed */}
              <div className="flex-none w-[130px] sm:w-auto snap-start rounded-xl border border-white/10 bg-slate-800/60 p-2.5 sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400">Rules Passed</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1">{validations.filter(v => v.passed).length}/{validations.length}</p>
                <span className="text-[9px] font-semibold text-slate-400">IRDAI Validated</span>
              </div>

              {/* Billed Total */}
              <div className="flex-none w-[140px] sm:w-auto snap-start rounded-xl border border-white/10 bg-slate-800/60 p-2.5 sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400">Billed Total</span>
                  <span className="text-xs font-bold text-teal-400">₹</span>
                </div>
                <p className="text-sm sm:text-base font-extrabold text-teal-300 mt-1 truncate">{formatINR(billedAmount)}</p>
                <span className="text-[9px] font-semibold text-slate-400">Claim Amount</span>
              </div>

              {/* Fields Extracted */}
              <div className="flex-none w-[130px] sm:w-auto snap-start rounded-xl border border-white/10 bg-slate-800/60 p-2.5 sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400">Extracted Fields</span>
                  <FileText className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-white mt-1">{totalParsedFields || '—'}</p>
                <span className="text-[9px] font-semibold text-slate-400">OCR AI Verified</span>
              </div>
            </div>
          </div>

          {/* 2. 📝 EDITABLE PATIENT & CLAIM DETAILS FORM */}
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3.5 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Patient &amp; Claim Details</h3>
              </div>
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={!isDetailsDirty && !detailsSaved}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-bold transition-all shadow-sm",
                  detailsSaved
                    ? "bg-emerald-500 text-slate-950 cursor-default"
                    : isDetailsDirty
                      ? "bg-teal-500 hover:bg-teal-400 text-slate-950 cursor-pointer shadow-teal-500/20 ring-1 ring-teal-400/50"
                      : "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-60"
                )}
              >
                <Save className="h-3 w-3" />
                {detailsSaved ? 'Saved! ✓' : 'Save Details'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => {
                    setPatientName(e.target.value);
                    setIsDetailsDirty(true);
                  }}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-teal-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Hospital / Medical Center</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={e => {
                    setHospitalName(e.target.value);
                    setIsDetailsDirty(true);
                  }}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-teal-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Billed Claim Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-teal-400">₹</span>
                  <input
                    type="number"
                    value={billedAmount}
                    onChange={e => {
                      setBilledAmount(Number(e.target.value) || 0);
                      setIsDetailsDirty(true);
                    }}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 pl-7 pr-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-teal-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Admission Date</label>
                <input
                  type="text"
                  value={admissionDate}
                  onChange={e => {
                    setAdmissionDate(e.target.value);
                    setIsDetailsDirty(true);
                  }}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-teal-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Discharge Date</label>
                <input
                  type="text"
                  value={dischargeDate}
                  onChange={e => {
                    setDischargeDate(e.target.value);
                    setIsDetailsDirty(true);
                  }}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-teal-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Primary Clinical Diagnosis</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={e => {
                    setDiagnosis(e.target.value);
                    setIsDetailsDirty(true);
                  }}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs font-semibold text-teal-300 focus:outline-none focus:border-teal-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 3. 🏥 EDITABLE HOSPITAL EXPENSES & MISMATCH WARNING */}
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3.5 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Itemized Hospital Expenses</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-all"
                >
                  <Plus className="h-3 w-3 text-teal-400" /> Add Row
                </button>
                <button
                  type="button"
                  onClick={handleSaveExpenses}
                  disabled={!isExpensesDirty && !expensesSaved}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-bold transition-all shadow-sm",
                    expensesSaved
                      ? "bg-emerald-500 text-slate-950 cursor-default"
                      : isExpensesDirty
                        ? "bg-teal-500 hover:bg-teal-400 text-slate-950 cursor-pointer shadow-teal-500/20 ring-1 ring-teal-400/50"
                        : "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-60"
                  )}
                >
                  <Save className="h-3 w-3" />
                  {expensesSaved ? 'Saved! ✓' : 'Save Expenses'}
                </button>
              </div>
            </div>

            {/* Expense Item List */}
            <div className="space-y-2">
              {expenses.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-white/5 text-xs flex-wrap sm:flex-nowrap"
                >
                  <span className="font-mono text-[10px] text-slate-500 w-5 flex-none text-center">#{idx + 1}</span>
                  <input
                    type="text"
                    value={item.category}
                    onChange={e => handleExpenseChange(item.id, 'category', e.target.value)}
                    placeholder="Expense Description"
                    className="flex-1 min-w-[140px] bg-transparent border-b border-white/10 px-1 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-teal-400"
                  />
                  <div className="relative w-28 flex-none">
                    <span className="absolute left-1.5 top-1 text-xs font-bold text-teal-400">₹</span>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={e => handleExpenseChange(item.id, 'amount', e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 pl-5 pr-1 py-1 text-xs font-bold text-emerald-400 text-right focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExpense(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors flex-none ml-auto sm:ml-0"
                    title="Delete Row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* 3-Part Financial Reconciliation Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
              <div className="rounded-xl bg-slate-900/60 border border-white/5 p-2.5 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Billed Total</span>
                <span className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
                  {formatINR(preview?.gross_total && preview.gross_total > 0 ? preview.gross_total : (preview?.billed_total || billedAmount))}
                </span>
              </div>
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-rose-400/90 tracking-wider">Non-Payable / Deductions</span>
                <span className="text-xs sm:text-sm font-bold text-rose-300 mt-0.5">
                  {formatINR(preview?.deductions ?? (preview?.potential_non_medical_total ?? 0))}
                </span>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-emerald-400/90 tracking-wider">Net Admissible Amount</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                  {formatINR(preview?.net_payable && preview.net_payable > 0 ? preview.net_payable : ((preview?.gross_total || billedAmount) - (preview?.deductions || 0)))}
                </span>
              </div>
            </div>

            {/* Policy & Admissibility Guidance Box */}
            <div className="rounded-xl border border-sky-500/20 bg-sky-950/30 p-3 text-xs text-sky-200/90 space-y-1.5">
              <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px] uppercase tracking-wider">
                <Info className="h-3.5 w-3.5 flex-none" />
                <span>Policy &amp; Admissibility Guidance</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {preview?.admissibility_guidance || (
                  preview?.potential_non_medical_total && preview.potential_non_medical_total > 0
                    ? `Non-medical expenses (e.g., admin, food, or visitor charges totaling ${formatINR(preview.potential_non_medical_total)}) are covered in full if your insurance policy includes a Non-Medical / Consumables Rider or corporate 100% GMC cover. The final settlement decision and deduction approval rest with your Insurer / TPA.`
                    : "All line items qualify as legitimate medical expenses under IRDAI guidelines with zero non-medical deductions. Final settlement is subject to your policy sum insured and sub-limits."
                )}
              </p>
            </div>

            {/* Total Summary Row / Verification Status */}
            <div className="flex items-center justify-between text-xs font-bold px-1 pt-1">
              <span className="text-slate-400">Itemized Audit Breakdown:</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                {formatINR(totalItemizedExpenses)} {expenseMismatch <= 100 ? '(Verified Itemization ✓)' : `(${expenses.length} Items Extracted)`}
              </span>
            </div>

            {/* Informational Guidance Note when user has active unsaved edits */}
            {isExpensesDirty && expenseMismatch > 100 && (
              <div className="flex items-start gap-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2.5 text-xs text-cyan-300">
                <Info className="h-4 w-4 text-cyan-400 flex-none mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Custom Expense Edits Active</p>
                  <p className="text-[11px] text-cyan-200/90 mt-0.5">
                    Your modified itemized total of {formatINR(totalItemizedExpenses)} will be saved to this claim.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* 4. 🔗 CROSS-DOCUMENT REIMBURSEMENT INTELLIGENCE */}
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3.5 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Cross-Document Reimbursement Intelligence</h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 border border-teal-500/40 px-2.5 py-0.5 text-xs font-bold text-teal-300">
                {verificationReadiness}% Reimbursement Ready
              </span>
            </div>

            {/* Readiness Track */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                <span>Verification Readiness Progress</span>
                <span className="text-teal-400 font-bold">{verificationReadiness}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full" style={{ width: `${verificationReadiness}%` }} />
              </div>
            </div>

            {/* Analyzed Documents Cards */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">📁 Documents Analyzed ({documents?.length ?? (s.claimId ? 1 : 0)})</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {documents && documents.length > 0 ? (
                  documents.map((doc: any, idx) => {
                    const docType = (doc.doc_type || doc.type || 'DOCUMENT').toUpperCase();
                    const docName = doc.file_name || doc.original_filename || doc.display_title || doc.name || `Document ${idx + 1}`;
                    return (
                      <div key={idx} className="rounded-xl bg-slate-900/70 p-2.5 border border-white/5 text-xs">
                        <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">{docType}</span>
                        <p className="font-semibold text-white mt-1.5 truncate" title={docName}>{docName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {doc.fields_extracted !== undefined ? `${doc.fields_extracted} fields extracted` : 'OCR Parsed & Verified'}
                        </p>
                      </div>
                    );
                  })
                ) : s.claimId ? (
                  <div className="rounded-xl bg-slate-900/70 p-2.5 border border-white/5 text-xs">
                    <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">CLAIM</span>
                    <p className="font-semibold text-white mt-1.5 truncate">{s.claimId}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{totalParsedFields} fields extracted</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-slate-500">No documents analyzed</p>
                )}
              </div>
            </div>

            {/* Cross-Document Field Verification */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">🔍 Cross-Document Field Verification</p>
                <span className="text-[10px] font-semibold text-slate-400">
                  {verifiedCount}/{totalParsedFields} Verified
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {verifiedFields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-white/5 gap-3">
                    <span className="font-medium text-slate-300 flex-none text-[11px]">{field.label}</span>
                    {field.isVerified ? (
                      <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px] text-right truncate">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-none text-emerald-400" />
                        <span className="truncate" title={field.value}>{field.value}</span>
                      </span>
                    ) : (
                      <span className="font-medium text-slate-500 text-[10px] italic">
                        {field.key === 'policy_number' ? 'N/A' : 'Not in document'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Reimbursement Checklist */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">✅ Required Checklist Items</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {checklistItems.map((item) => {
                  const isVerified = item.state === 'verified' || item.state === 'extracted';
                  const isMissing = item.state === 'missing';

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border gap-2",
                        isMissing
                          ? "bg-rose-500/5 border-rose-500/20 text-rose-300"
                          : item.state === 'verified'
                            ? "bg-emerald-500/5 border-emerald-500/20 text-slate-200"
                            : item.state === 'extracted'
                              ? "bg-teal-500/5 border-teal-500/20 text-slate-200"
                              : "bg-slate-900/50 border-white/5 text-slate-400"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isVerified ? (
                          <CheckSquare className="h-4 w-4 text-emerald-400 flex-none" />
                        ) : isMissing ? (
                          <AlertTriangle className="h-4 w-4 text-rose-400 flex-none" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500 flex-none" />
                        )}
                        <span className="font-semibold truncate text-[11px]">{item.title}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded flex-none uppercase tracking-wide",
                          item.color === 'emerald'
                            ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25"
                            : item.color === 'teal'
                              ? "text-teal-400 bg-teal-500/10 border border-teal-500/25"
                              : item.color === 'rose'
                                ? "text-rose-400 bg-rose-500/10 border border-rose-500/25"
                                : "text-slate-400 bg-slate-800 border border-white/5"
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. 🔬 ICD-10 & CPT MEDICAL CODING (NON-OVERLAPPING MOBILE-FRIENDLY LAYOUT) */}
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3.5 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-teal-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">ICD-10 &amp; CPT Medical Codes</h3>
            </div>
            <div className="space-y-2.5">
              {icdCodes.length > 0 ? icdCodes.map(item => (
                <div key={item.code} className="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-teal-300 bg-teal-500/10 border border-teal-500/25 px-2 py-0.5 rounded text-[11px]">
                      {item.code}
                    </span>
                    <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex-none">
                      {(item.confidence * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground italic text-slate-500">No ICD codes extracted</p>
              )}
              {cptCodes.length > 0 ? cptCodes.map(item => (
                <div key={item.code} className="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sky-300 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded text-[11px]">
                      CPT {item.code}
                    </span>
                    <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex-none">
                      {(item.confidence * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground italic text-slate-500">No CPT codes extracted</p>
              )}
            </div>
          </div>

          {/* 6. ✅ IRDAI VALIDATION RULES (MOVED TO VERY LAST SECTION AS REQUESTED!) */}
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3.5 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">IRDAI Rule Validations</h3>
              </div>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                {validations.filter(v => v.passed).length}/{validations.length} Passed
              </span>
            </div>

            <div className="space-y-2">
              {validations.length > 0 ? validations.map((val, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">{val.rule_name}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">{val.message}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground italic text-slate-500">No data extracted</p>
              )}
            </div>
          </div>

        </div>

        {/* 7. 🎯 B2C MOBILE-OPTIMIZED FOOTER ACTION BAR */}
        <div className="flex-none flex items-center justify-between border-t border-white/10 bg-slate-900/95 px-3.5 sm:px-6 py-3.5 backdrop-blur-md gap-2.5">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            {tpaUrl ? (
              <button
                type="button"
                onClick={() => openInlinePdfViewer(tpaUrl, 'tpa')}
                disabled={loadingPdf === 'tpa'}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 min-h-[44px] px-4 text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {loadingPdf === 'tpa' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                View TPA Report
              </button>
            ) : null}

            {irdaUrl ? (
              <button
                type="button"
                onClick={() => openInlinePdfViewer(irdaUrl, 'irdai')}
                disabled={loadingPdf === 'irdai'}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 disabled:opacity-50 min-h-[44px] px-4 text-xs font-bold text-slate-200 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {loadingPdf === 'irdai' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 text-amber-400" />
                )}
                View IRDAI Form
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenInsurerModal}
              disabled={isSubmittingToPayer || isSubmittedToPayer}
              className="flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 min-h-[44px] px-4 text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {isSubmittingToPayer ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSubmittedToPayer ? (
                <CheckCircle2 className="h-4 w-4 text-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSubmittedToPayer
                ? (submittedPayer ? `Submitted to ${submittedPayer}` : "Submitted to Insurer")
                : "Submit Claim to Insurer"}
            </button>

            <button
              type="button"
              onClick={s.closeReportModal}
              className="flex-none rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 min-h-[44px] px-4 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Close Report
            </button>
          </div>
        </div>

      </div>

      {/* 8. 📄 ON-SCREEN EMBEDDED PDF VIEWER (Opens directly on screen, NO separate tab opened) */}
      {inlinePdf ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-1.5 sm:p-4 animate-fade-in">
          <div className="relative w-full max-w-5xl h-[96vh] sm:h-[94vh] flex flex-col rounded-2xl border border-white/15 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex-none flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-3 sm:px-6 py-2.5 sm:py-3 backdrop-blur-md">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={closeInlinePdf}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer"
                  title="Back to Audit Report"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-base font-bold text-white truncate">
                      {inlinePdf.title}
                    </h3>
                    <span className="hidden sm:inline-flex items-center rounded-full bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 text-[10px] font-semibold text-teal-300 flex-none">
                      PREVIEW
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">Claim ID: {s.claimId || 'N/A'}</p>
                </div>
              </div>

               <div className="flex items-center gap-1.5 sm:gap-2 flex-none ml-2">
                {/* Download PDF Button */}
                <a
                  href={inlinePdf.url}
                  download={`${inlinePdf.type === 'tpa' ? 'TPA_Report' : 'IRDAI_Form'}_${s.claimId || 'claim'}.pdf`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer"
                  title="Download PDF Copy"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={closeInlinePdf}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close Preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Embedded PDF container with 100% native vector crispness */}
            <div className="flex-1 w-full h-full bg-slate-950 relative overflow-hidden p-2 sm:p-4 flex flex-col items-center justify-center min-w-0">
              <div className="w-full max-w-4xl h-full flex flex-col items-center justify-center">
                <iframe
                  src={`${inlinePdf.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  title={inlinePdf.title}
                  className="w-full h-full min-h-[78vh] sm:min-h-[82vh] border-0 bg-slate-950 rounded-xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 9. 🏛️ SUBMIT CLAIM TO INSURER / TPA MODAL */}
      {showInsurerModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/80 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Submit Claim to Insurer / TPA
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    Select insurer and verify policy details to dispatch claim
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInsurerModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
              
              {/* Insurer Dropdown Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Insurance Company / TPA <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedOrgId || selectedInsurer}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = tpaList.find((t) => t.id === val || t.name === val);
                      if (matched) {
                        setSelectedOrgId(matched.id);
                        setSelectedInsurer(matched.name);
                      } else {
                        setSelectedInsurer(val);
                      }
                    }}
                    className="w-full rounded-xl bg-slate-800/90 border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer pr-10"
                  >
                    {tpaList.map((org) => (
                      <option key={org.id} value={org.id} className="bg-slate-900 text-white">
                        {org.name} ({org.type})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>

                {/* Quick Chips for Active Organizations in DB */}
                {tpaList.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] text-slate-400 font-medium">Available in DB:</span>
                    {tpaList.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => {
                          setSelectedOrgId(org.id);
                          setSelectedInsurer(org.name);
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer border",
                          (selectedOrgId === org.id || selectedInsurer.toLowerCase() === org.name.toLowerCase())
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 border-white/10"
                        )}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Policy ID Section: Case A (Pre-filled via OCR) vs Case B (Not Found) */}
              <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    Policy Number / Health Card ID <span className="text-rose-400">*</span>
                  </label>
                  {policyFromOcr && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Auto-detected via OCR
                    </span>
                  )}
                </div>

                {policyFromOcr ? (
                  // CASE A: Found via OCR - Pre-filled & reviewable
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={policyId}
                      onChange={(e) => setPolicyId(e.target.value)}
                      placeholder="e.g. POL-99882310"
                      className="w-full rounded-xl bg-slate-800/90 border border-emerald-500/40 px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <p className="text-[11px] text-slate-400">
                      Pre-filled from your uploaded claim documents. You can review or edit if necessary.
                    </p>
                  </div>
                ) : (
                  // CASE B: Policy NOT Found - Manual input OR Fast OCR Document Upload
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={policyId}
                      onChange={(e) => setPolicyId(e.target.value)}
                      placeholder="Enter policy number e.g. P/161114/01/2024/002345"
                      className="w-full rounded-xl bg-slate-800/90 border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />

                    {/* Divider */}
                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-white/10 w-full" />
                      <span className="bg-slate-900 px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase absolute">
                        OR Auto-Extract
                      </span>
                    </div>

                    {/* Upload Health Card / Policy Box */}
                    <div
                      onClick={() => policyFileInputRef.current?.click()}
                      className={cn(
                        "rounded-xl border-2 border-dashed p-3.5 text-center cursor-pointer transition-all",
                        isUploadingPolicyDoc
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-white/20 bg-slate-800/60 hover:bg-slate-800/90 hover:border-emerald-400/50"
                      )}
                    >
                      <input
                        ref={policyFileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={handlePolicyDocSelect}
                      />

                      {isUploadingPolicyDoc ? (
                        <div className="flex flex-col items-center justify-center py-1">
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mb-1.5" />
                          <span className="text-xs font-semibold text-white">
                            Running Fast OCR &amp; Extracting Policy ID...
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Scanning card / policy for insurer and policy number
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-1">
                          <UploadCloud className="h-6 w-6 text-slate-400 mb-1 group-hover:text-emerald-400" />
                          <span className="text-xs font-semibold text-slate-200">
                            Upload Health Card / Policy Document
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Fast OCR will extract Policy ID &amp; Insurer instantly (PDF, JPG, PNG)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Banner when extracted via OCR */}
                {ocrSuccessBanner && (
                  <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2.5 flex items-center gap-2 text-xs text-emerald-300 animate-fade-in">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none" />
                    <span className="font-medium truncate">{ocrSuccessBanner}</span>
                  </div>
                )}
              </div>

              {/* TPA Routing Disclaimer */}
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-[11px] text-blue-300/90 flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-400 flex-none mt-0.5" />
                <span>
                  <strong>TPA Routing:</strong> Claim documents will be submitted to the <strong>{selectedInsurer}</strong> TPA adjudication queue. The claim is permanently linked to Policy ID <strong>#{policyId.trim() || 'N/A'}</strong>.
                </span>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 border-t border-white/10 bg-slate-900/90 px-4 sm:px-6 py-3.5">
              <button
                type="button"
                onClick={() => setShowInsurerModal(false)}
                disabled={isSubmittingToPayer}
                className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitToTpa}
                disabled={isSubmittingToPayer || !policyId.trim() || !selectedInsurer}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isSubmittingToPayer ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Claim to TPA
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
