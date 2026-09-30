/**
 * Resilient API client for ClaimsGuru
 * Connects UI to ClaimsGuru Docker backend (http://localhost:8000)
 * Includes Network Resiliency, Bearer Auth & Offline Fallback.
 */

import { getStoredAuthSession } from '@/lib/auth';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('azurecontainerapps.io')) {
      const ingressHost = host.replace(/frontend/i, 'ingress');
      return `https://${ingressHost}`;
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
  }
  const raw = process.env.NEXT_PUBLIC_API_BASE || '';
  if (raw && !raw.includes('127.0.0.1') && !raw.includes('localhost')) {
    return raw;
  }
  return 'http://127.0.0.1:8000';
}

export function getIngressApiUrl(): string {
  const base = getApiBaseUrl();
  return `${base}/ingress`;
}

export function getSubmissionApiUrl(): string {
  const base = getApiBaseUrl();
  return `${base}/submission`;
}

export function getChatApiUrl(): string {
  const base = getApiBaseUrl();
  return `${base}/chat`;
}

export const INGRESS_API = typeof window !== 'undefined' ? getIngressApiUrl() : 'http://127.0.0.1:8000/ingress';
export const SUBMISSION_API = typeof window !== 'undefined' ? getSubmissionApiUrl() : 'http://127.0.0.1:8000/submission';
export const CHAT_API = typeof window !== 'undefined' ? getChatApiUrl() : 'http://127.0.0.1:8000/chat';

export interface ClaimDocumentPreview {
  document_id?: string;
  id?: string;
  original_filename?: string;
  file_name?: string;
  doc_type: string;
  display_title: string;
  page_count: number;
  pages: string[];
}

export interface RealClaimPreview {
  claim_id: string;
  created_at?: string;
  status: string;
  tpa_message?: string | null;
  tpa_requested_docs?: string[];
  documents?: ClaimDocumentPreview[];
  parsed_fields: Record<string, string>;
  icd_codes: Array<{ code: string; description: string; confidence: number; estimated_cost?: number }>;
  cpt_codes: Array<{ code: string; description: string; confidence: number; estimated_cost?: number }>;
  expenses: Array<{ category: string; description?: string; amount: number }>;
  expense_total?: number;
  billed_total?: number;
  gross_total?: number;
  net_payable?: number;
  deductions?: number;
  potential_non_medical_total?: number;
  admissibility_guidance?: string;
  patient_name?: string;
  hospital_name?: string;
  admission_date?: string;
  discharge_date?: string;
  diagnosis?: string;
  policy_id?: string;
  patient_id?: string;
  gender?: string;
  age?: string | number;
  predictions: Array<{ rejection_score: number; top_reasons: Array<{ reason: string; weight: number }> }>;
  validations: Array<{ rule_name: string; severity: string; message: string; passed: boolean }>;
  ocr_excerpt?: string;
  summary: {
    patient_name: string;
    age: string;
    gender: string;
    admission_date: string;
    discharge_date: string;
    hospital: string;
    diagnosis: string;
    total_amount?: string;
    risk_score?: number | null;
  };
}

export interface RecentClaimSummary {
  id: string;
  patient_name: string;
  status: string;
  created_at: string;
  total_amount?: string;
  hospital_name?: string;
  insurance_company?: string;
  payer?: string;
  diagnosis?: string;
  policy_id?: string;
  patient_id?: string;
  documents?: Array<{ id: string; file_name: string; doc_type?: string }>;
  progress?: { percentage: number; step: string };
  has_action_request?: boolean;
  tpa_message?: string;
  tpa_requested_docs?: string[];
}

export const PIPELINE_ACTIVE_STATUSES = new Set([
  "UPLOADED",
  "PROCESSING",
  "OCR_PROCESSING",
  "OCR_IN_PROGRESS",
  "OCR_DONE",
  "PARSING_IN_PROGRESS",
  "CODING_ANALYSIS",
  "RISK_ANALYSIS",
  "VALIDATION_RUNNING",
  "IN_PROGRESS",
]);

/**
 * Check if a claim ID is a local mock/demo ID (e.g., demo-001, CLM-123456)
 * to avoid issuing bad requests to the backend server.
 */
export function isMockId(id?: string | null): boolean {
  if (!id) return true;
  if (id.startsWith('demo-')) return true;
  if (id.startsWith('CLM-')) return true;
  return false;
}

/**
 * Helper to produce Authorization header if token exists
 */
function getAuthHeaders(): Record<string, string> {
  const session = getStoredAuthSession();
  const token = session?.accessToken || session?.idToken;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const uid = session?.user?.id || session?.user?.sub || session?.user?.oid || session?.user?.email;
  if (uid) {
    headers['X-Patient-Id'] = uid;
    headers['X-User-Id'] = uid;
  }
  return headers;
}

/**
 * Resilient safeFetch wrapper with timeout, bearer auth & offline failure catch.
 * Prevents unhandled network exceptions when internet is down or slow.
 */
async function safeFetch(url: string, options?: RequestInit, timeoutMs = 8000): Promise<Response | null> {
  try {
    const authHeaders = getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options?.headers || {}),
      },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    return null;
  }
}

/**
 * Upload a document with offline fallback support
 */
export async function uploadClaimDocument(
  files: File | File[], 
  userName?: string, 
  claimId?: string,
  force: boolean = false,
  patientId?: string
): Promise<{ claim_id: string; document_id: string; status?: string; task_id?: string | null; is_duplicate?: boolean }> {
  const fileArray = Array.isArray(files) ? files : [files];
  const fileNames = fileArray.map(f => f.name.toLowerCase());
  const fallbackClaimId = `CLM-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const formData = new FormData();
    for (const f of fileArray) {
      formData.append("files", f);
    }
    let userSessionEmail: string | undefined = undefined;
    let userSessionId: string | undefined = undefined;
    try {
      const session = getStoredAuthSession();
      if (session?.user) {
        if (session.user.email) userSessionEmail = session.user.email;
        if (session.user.id || session.user.sub || session.user.oid) {
          userSessionId = session.user.id || session.user.sub || session.user.oid;
        }
      }
    } catch (_) {}

    const effectivePatientId = patientId || userSessionId || userSessionEmail;
    if (effectivePatientId) {
      formData.append("patient_id", effectivePatientId);
      formData.append("policy_id", effectivePatientId);
    }
    if (userSessionEmail) {
      formData.append("email", userSessionEmail);
    }
    if (force) {
      formData.append("force", "true");
    }

    const url = claimId 
      ? `${INGRESS_API}/claims/${claimId}/documents` 
      : `${INGRESS_API}/claims/`;

    let res = await safeFetch(url, {
      method: "POST",
      body: formData,
      headers: getAuthHeaders(),
    }, 60000);

    if (!res || !res.ok) {
      res = await safeFetch(claimId ? url : `${INGRESS_API}/claims`, {
        method: "POST",
        body: formData,
        headers: getAuthHeaders(),
      }, 60000);
    }

    if (res && res.ok) {
      const data = await res.json();
      const directClaimId = data.claim_id || data.id;
      const taskId = data.task_id;
      let finalClaimId = directClaimId || "";
      let finalDocId = data.document_id || (data.documents && data.documents[0]?.id) || "doc-1";

      // If backend returned queued task ID without direct claim ID, lookup the created claim
      if (!finalClaimId) {
        for (let attempt = 0; attempt < 20; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 400));
          const queryParams = new URLSearchParams({ limit: "10", t: Date.now().toString() });
          if (userName) {
            queryParams.append("patient_id", userName);
          }
          const claimsListRes = await safeFetch(`${INGRESS_API}/claims?${queryParams.toString()}`, {
            cache: "no-store",
            headers: getAuthHeaders(),
          }, 5000);
          if (claimsListRes && claimsListRes.ok) {
            const claimsData = await claimsListRes.json();
            const claims = claimsData.claims || claimsData.results || (Array.isArray(claimsData) ? claimsData : []);
            
            const matchingClaim = claims.find((c: any) => 
              c.documents && c.documents.some((d: any) => 
                d.file_name && fileNames.some(fn => d.file_name.toLowerCase().includes(fn) || fn.includes(d.file_name.toLowerCase()))
              )
            ) || (claims.length > 0 ? claims[0] : null);

            if (matchingClaim && matchingClaim.id) {
              finalClaimId = matchingClaim.id;
              if (matchingClaim.documents && matchingClaim.documents.length > 0) {
                finalDocId = matchingClaim.documents[0].id;
              }
              break;
            }
          }
        }
      }

      return { 
        claim_id: finalClaimId || fallbackClaimId, 
        document_id: finalDocId,
        status: data.status,
        task_id: data.task_id,
        is_duplicate: Boolean(data.is_duplicate || (data.status === "COMPLETED" && data.task_id === null))
      };
    }
  } catch (err) {
    /* safe catch */
  }

  // If server is reachable but upload had issues, do not simulate false completion
  return { claim_id: "", document_id: "" };
}

/**
 * Poll processing progress safely — checks both ingress progress & submission preview readiness
 */
export async function fetchClaimProgress(claimId: string): Promise<{ percentage: number; step: string; status: string; is_complete: boolean; not_found?: boolean; error?: string }> {
  if (isMockId(claimId)) {
    return { percentage: 100, step: "COMPLETED", status: "COMPLETED", is_complete: true };
  }

  try {
    // 1. Query live ingress progress endpoint (matches port 3000 exact implementation)
    const res = await safeFetch(`${INGRESS_API}/claims/${claimId}/progress?t=${Date.now()}`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    }, 2500);
    if (res) {
      if (res.status === 404) {
        return { percentage: 0, step: "Claim not found", status: "NOT_FOUND", is_complete: false, not_found: true };
      }
      if (res.ok) {
        const data = await res.json();
        let pct = typeof data.percentage === "number" ? data.percentage : 0;
        const stepStr = data.step || data.current_step || "";
        const statusStr = (data.status || "").toUpperCase();

        if (statusStr === "IDENTITY_MISMATCH" || stepStr.toLowerCase().includes("identity mismatch")) {
          return {
            percentage: 0,
            step: "Identity Mismatch",
            status: "IDENTITY_MISMATCH",
            is_complete: false,
            error: data.error || "Identity mismatch detected across documents. Uploaded set removed. Please re-upload the entire set.",
          };
        }

        if (statusStr === "FAILED") {
          return {
            percentage: 0,
            step: stepStr || "Processing Failed",
            status: "FAILED",
            is_complete: false,
            error: data.error || "Claim processing failed. Please retry.",
          };
        }

        const isComplete = Boolean(data.is_complete || statusStr === "COMPLETED" || statusStr === "VALIDATED" || statusStr === "FINISHED" || pct >= 100);

        if (isComplete) {
          return { percentage: 100, step: "COMPLETED", status: "COMPLETED", is_complete: true };
        }

        const normalizedStep = (stepStr && !stepStr.toLowerCase().includes("start")) ? stepStr : (statusStr === "UPLOADED" ? "OCR (extracting text)" : "Parsing (LLM agent reading document)");
        return {
          percentage: Math.max(pct, 20),
          step: normalizedStep,
          status: statusStr || "UPLOADED",
          is_complete: false,
        };
      }
    }

    // 2. Query live ingress status endpoint
    const statusRes = await safeFetch(`${INGRESS_API}/claims/${claimId}/status?t=${Date.now()}`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    }, 2500);
    if (statusRes) {
      if (statusRes.status === 404) {
        return { percentage: 0, step: "Claim not found", status: "NOT_FOUND", is_complete: false, not_found: true };
      }
      if (statusRes.ok) {
        const data = await statusRes.json();
        let pct = typeof data.percentage === "number" ? data.percentage : (typeof data.pct === "number" ? data.pct : 0);
        const stepStr = data.current_step || data.step || "";
        const statusStr = (data.status || "").toUpperCase();

        if (statusStr === "IDENTITY_MISMATCH" || stepStr.toLowerCase().includes("identity mismatch")) {
          return {
            percentage: 0,
            step: "Identity Mismatch",
            status: "IDENTITY_MISMATCH",
            is_complete: false,
          };
        }

        if (statusStr === "FAILED") {
          return {
            percentage: 0,
            step: stepStr || "Processing Failed",
            status: "FAILED",
            is_complete: false,
          };
        }

        const isComplete = Boolean(data.is_complete || statusStr === "COMPLETED" || statusStr === "VALIDATED" || statusStr === "FINISHED" || pct >= 100);

        if (isComplete) {
          return { percentage: 100, step: "COMPLETED", status: "COMPLETED", is_complete: true };
        }

        return {
          percentage: Math.max(pct, 20),
          step: stepStr || "OCR (extracting text)",
          status: statusStr || "UPLOADED",
          is_complete: false,
        };
      }
    }
  } catch (err) {
    /* safe catch */
  }
  return { percentage: 20, step: "OCR (extracting text)", status: "UPLOADED", is_complete: false };
}

/**
 * Fetch full parsed preview report safely from backend
 */
export async function fetchClaimPreview(claimId: string): Promise<RealClaimPreview | null> {
  if (isMockId(claimId)) {
    return null;
  }

  try {
    const res = await safeFetch(`${SUBMISSION_API}/claims/${claimId}/preview?t=${Date.now()}`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    }, 12000);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

/**
 * Fetch most recently processed claim ID safely
 */
export async function fetchLatestClaimId(patientId?: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ limit: "10", t: Date.now().toString() });
    if (patientId) {
      params.append("patient_id", patientId);
    }
    const url = `${INGRESS_API}/claims?${params.toString()}`;
    const res = await safeFetch(url, { cache: "no-store" }, 8000);
    if (!res || !res.ok) return null;
    const data = await res.json();
    const claims = data.claims || data.results || (Array.isArray(data) ? data : []);
    if (claims.length > 0) {
      return claims[0].id || claims[0].claim_id || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch list of recent claims safely
 */
export async function fetchRecentClaims(patientId?: string): Promise<RecentClaimSummary[] | null> {
  try {
    const params = new URLSearchParams({ limit: "50", t: Date.now().toString() });
    let effectivePatientId = patientId;
    if (!effectivePatientId) {
      const session = getStoredAuthSession();
      effectivePatientId = session?.user?.id || session?.user?.email || undefined;
    }
    if (effectivePatientId) {
      params.append("patient_id", effectivePatientId);
    }
    const url = `${INGRESS_API}/claims?${params.toString()}`;
    const res = await safeFetch(url, { cache: "no-store", headers: getAuthHeaders() }, 8000);
    if (!res) return null; // Network/timeout failure — return null so callers don't wipe state
    if (!res.ok) return null;
    const data = await res.json();
    const claims = data.claims || data.results || (Array.isArray(data) ? data : []);

    return claims.map((c: any) => {
      const isAction = c.status === "DOCUMENTS_REQUESTED" || Boolean(c.has_action_request) || Boolean(c.tpa_requested_docs?.length > 0);
      return {
        id: c.id || c.claim_id,
        patient_name: c.patient_name || c.name || c.summary?.patient_name || (c.documents && c.documents.length > 0 ? c.documents[0].file_name : "Claim Record"),
        status: isAction ? "DOCUMENTS_REQUESTED" : (c.status || "PROCESSING").toUpperCase(),
        created_at: c.created_at || "",
        total_amount: c.total_amount || c.amount || "",
        insurance_company: c.insurance_company || c.payer || c.summary?.insurance_company || c.summary?.payer || undefined,
        payer: c.payer || c.insurance_company || undefined,
        hospital_name: c.hospital_name || c.summary?.hospital || undefined,
        diagnosis: c.diagnosis || c.summary?.diagnosis || undefined,
        policy_id: c.policy_id || c.summary?.policy_number || undefined,
        patient_id: c.patient_id || undefined,
        documents: c.documents || [],
        progress: c.progress || (typeof c.percentage === "number" ? { percentage: c.percentage, step: c.current_step } : undefined),
        has_action_request: isAction,
        tpa_message: c.tpa_message,
        tpa_requested_docs: c.tpa_requested_docs || [],
      };
    });
  } catch {
    return null;
  }
}

/**
 * Delete a claim safely from backend
 */
export async function deleteClaimApi(claimId: string): Promise<boolean> {
  if (isMockId(claimId)) return true;
  try {
    const res = await safeFetch(`${INGRESS_API}/claims/${encodeURIComponent(claimId)}`, {
      method: "DELETE",
    }, 6000);
    return Boolean(res && (res.ok || res.status === 204 || res.status === 404));
  } catch (err) {
    return false;
  }
}

/**
 * Delete a specific document from a claim safely from backend
 */
export async function deleteClaimDocumentApi(claimId: string, docId: string): Promise<boolean> {
  if (isMockId(claimId)) return true;
  try {
    const res = await safeFetch(`${INGRESS_API}/claims/${encodeURIComponent(claimId)}/documents/${encodeURIComponent(docId)}`, {
      method: "DELETE",
    }, 6000);
    return Boolean(res && (res.ok || res.status === 204 || res.status === 404));
  } catch (err) {
    return false;
  }
}

/**
 * Register/authenticate user safely in backend audit log
 */
export async function syncUserToBackend(name: string, email: string): Promise<void> {
  try {
    await safeFetch(`${INGRESS_API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    }, 4000);
  } catch (err) {
    /* safe catch */
  }
}

/**
 * Perform login check for user Swagath or default users safely
 */
export function authenticateUser(userOrEmail: string, pass: string): { success: boolean; user?: { name: string; email: string; role: string }; error?: string } {
  const cleanUser = userOrEmail.trim().toLowerCase();
  
  if (cleanUser.includes("swagath") || cleanUser === "swagath" || cleanUser === "swagath@example.com") {
    if (pass === "123455" || pass === "123456" || pass.length >= 4) {
      return {
        success: true,
        user: { name: "Swagath", email: "swagath@example.com", role: "patient" },
      };
    } else {
      return { success: false, error: "Invalid password for Swagath account." };
    }
  }

  if (cleanUser && pass) {
    return {
      success: true,
      user: { name: userOrEmail.split("@")[0] || "Patient", email: userOrEmail, role: "patient" },
    };
  }

  return { success: false, error: "Please enter your username/email and password." };
}

/**
 * Save edited expenses for a claim
 */
export async function saveClaimExpensesApi(claimId: string, expenses: Array<{ category: string; amount: number }>): Promise<boolean> {
  if (isMockId(claimId)) return true;
  try {
    const res = await safeFetch(`${SUBMISSION_API}/claims/${claimId}/expenses`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenses }),
    }, 5000);
    return Boolean(res && res.ok);
  } catch (err) {
    return false;
  }
}

/**
 * Save edited details/fields for a claim
 */
export async function saveClaimDetailsApi(claimId: string, details: Record<string, string>): Promise<boolean> {
  if (isMockId(claimId)) return true;
  try {
    const res = await safeFetch(`${SUBMISSION_API}/claims/${claimId}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: details }),
    }, 5000);
    return Boolean(res && res.ok);
  } catch (err) {
    return false;
  }
}

export interface TpaProviderItem {
  id: string;
  org_id?: string;
  name: string;
  logo: string;
  type: string;
  email?: string;
  phone?: string;
  website?: string;
}

/**
 * Fetch available Insurance / TPA providers
 */
export async function fetchTpaListApi(): Promise<TpaProviderItem[]> {
  try {
    const res = await safeFetch(`${SUBMISSION_API}/tpa-list`, {}, 5000);
    if (!res || !res.ok) return [];
    const data = await res.json();
    return data.tpas || [];
  } catch {
    return [];
  }
}

/**
 * Fast OCR document extraction for policy ID & insurer
 */
export async function extractPolicyFromDocApi(
  claimId: string,
  file: File
): Promise<{ success: boolean; policy_id: string; insurer: string; file_name: string; raw_snippet?: string; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${SUBMISSION_API}/claims/${claimId}/extract-policy`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      return { success: false, policy_id: "", insurer: "", file_name: file.name, message: "Extraction failed" };
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, policy_id: "", insurer: "", file_name: file.name, message: err?.message || "Network error" };
  }
}

/**
 * Submit claim to selected insurer / TPA
 */
export async function submitClaimToPayerApi(
  claimId: string,
  payer: string,
  policyId?: string,
  orgId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${SUBMISSION_API}/submit/${claimId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payer, policy_id: policyId, org_id: orgId }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
    const errData = await res.json().catch(() => null);
    return { success: false, error: errData?.detail || "Submission failed" };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}
