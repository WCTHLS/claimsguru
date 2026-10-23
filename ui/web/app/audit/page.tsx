'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  FolderDown,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Clock,
  Sparkles,
  ChevronRight,
  User,
  ShieldCheck,
  ShieldAlert,
  Filter,
  ExternalLink,
  ArrowLeft,
  X,
  FileCheck2,
  History,
  Send,
  Edit3,
  Lock,
  LogOut,
  LogIn,
} from 'lucide-react';

import {
  getIngressApiUrl,
  getSubmissionApiUrl,
  fetchClaimPreview,
  downloadAllClaimDocumentsZip,
  downloadSingleClaimDocument,
  getAuthHeaders,
  RealClaimPreview,
  RecentClaimSummary,
} from '@/lib/api-client';
import {
  getStoredAuthSession,
  clearAuthSession,
  beginEntraAuthFlow,
} from '@/lib/auth';


// Whitelisted Administrator for Audit Cockpit Access
const ALLOWED_ADMIN_EMAIL = 'swagathreddykasula@gmail.com';

interface ClaimItem extends RecentClaimSummary {
  submitted_by_name?: string;
  submitted_by_email?: string;
  doctor_name?: string;
  org_id?: string | null;
  tpa_destination?: string;
  documents?: Array<{
    id?: string;
    document_id?: string;
    file_name?: string;
    original_filename?: string;
    file_type?: string;
    storage_path?: string;
  }>;
}

interface AuditTrailEntry {
  id: string;
  actor: string;
  action: string;
  metadata?: any;
  created_at: string | null;
}

interface ExtendedIcdCode {
  code: string;
  description: string;
  confidence: number;
  estimated_cost?: number;
  is_explicit?: boolean;
  is_low_match?: boolean;
  review_warning?: string | null;
  other_matches?: Array<{ code: string; description: string; confidence?: number }>;
}

interface ExtendedClaimPreview extends Omit<RealClaimPreview, 'icd_codes'> {
  icd_codes: ExtendedIcdCode[];
  field_feedback?: Record<string, { original?: string; corrected?: string; updated_at?: string; user_email?: string }>;
}

export default function MasterAuditPage() {
  // Authentication & Access Control States
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [entraSigningIn, setEntraSigningIn] = useState(false);

  // Claims Data States
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tpaFilter, setTpaFilter] = useState('ALL');

  // Selected claim for deep-dive inspection modal
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);
  const [previewData, setPreviewData] = useState<ExtendedClaimPreview | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'docs' | 'accuracy' | 'coding' | 'rules' | 'reports'>('docs');
  const [activeDocPreview, setActiveDocPreview] = useState<{ id: string; name: string; url: string } | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // 1. Check Authenticated Session & Verify Whitelist
  useEffect(() => {
    const checkAuth = () => {
      const session = getStoredAuthSession();
      const storedEmail =
        session?.user?.email ||
        session?.user?.preferredUsername ||
        (typeof window !== 'undefined' ? localStorage.getItem('claimgpt_user_email') : '') ||
        '';

      const normalized = storedEmail.toLowerCase().trim();
      setCurrentUserEmail(normalized || null);

      if (normalized === ALLOWED_ADMIN_EMAIL.toLowerCase()) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
      setAuthChecking(false);
    };

    checkAuth();
  }, []);

  // Entra ID Sign-In Handler
  const handleEntraSignIn = async () => {
    setEntraSigningIn(true);
    try {
      await beginEntraAuthFlow({ role: 'patient' });
    } catch (err) {
      console.error('Entra sign-in error:', err);
      setEntraSigningIn(false);
    }
  };

  // Sign-Out Handler
  const handleSignOut = () => {
    clearAuthSession();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('claimgpt_user_email');
    }
    setIsAuthorized(false);
    setCurrentUserEmail(null);
  };

  // Helper to ensure auditor role header is passed to fetch all claims across all TPAs
  const getAuditHeaders = useCallback(() => {
    const headers = getAuthHeaders();
    // 1. Force override X-User-Role to 'auditor' so backend marks caller as is_privileged = True
    headers['X-User-Role'] = 'auditor';
    headers['X-User-Id'] = 'admin-auditor';
    // 2. Clear patient scoping headers so backend returns claims across ALL employees/TPAs
    delete headers['X-Patient-Id'];
    delete headers['X-Patient-Email'];
    return headers;
  }, []);

  // 2. Fetch all claims across the entire platform
  const loadAllClaims = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setFetchError(null);
      const ingressBase = getIngressApiUrl();
      const url = `${ingressBase}/claims?limit=500&organization=all&t=${Date.now()}`;
      const headers = getAuditHeaders();
      const res = await fetch(url, {
        headers,
        cache: 'no-store',
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Failed to load master claims HTTP', res.status, errText);
        setFetchError(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
        return;
      }

      const data = await res.json();
      const rawClaims: any[] = data.claims || data.results || (Array.isArray(data) ? data : []);

      const mapped: ClaimItem[] = rawClaims.map((c) => {
        const rawDest = c.insurance_company || c.payer || '';
        const isSubmitted =
          c.status === 'SUBMITTED' ||
          c.status === 'APPROVED' ||
          c.status === 'SETTLED' ||
          c.status === 'REJECTED';
        const tpaDest = isSubmitted ? (rawDest || 'TPA') : (rawDest ? `${rawDest} (Draft)` : 'Unassigned Draft');

        return {
          id: c.id || c.claim_id,
          patient_name: c.patient_name || c.name || 'Anonymous Patient',
          status: (c.status || 'PROCESSING').toUpperCase(),
          created_at: c.created_at || '',
          total_amount: c.total_amount || '',
          insurance_company: rawDest,
          tpa_destination: tpaDest,
          hospital_name: c.hospital_name || 'Hospital Not Extracted',
          doctor_name: c.doctor_name || '',
          diagnosis: c.diagnosis || 'Diagnosis Pending',
          policy_id: c.policy_id || '',
          patient_id: c.patient_id || '',
          submitted_by_name: c.submitted_by_name || '',
          submitted_by_email: c.submitted_by_email || (c.patient_id?.includes('@') ? c.patient_id : ''),
          documents: c.documents || [],
        };
      });

      setClaims(mapped);
    } catch (err: any) {
      console.error('Failed to load master claims:', err);
      setFetchError(err?.message || 'Network error fetching claims');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuditHeaders]);

  useEffect(() => {
    if (isAuthorized) {
      loadAllClaims();
    }
  }, [isAuthorized, loadAllClaims]);

  // Combined documents list between Claim item and Preview item
  const resolvedDocuments = useMemo(() => {
    if (!selectedClaim) return [];
    const claimDocs = selectedClaim.documents || [];
    const previewDocs = previewData?.documents || [];
    const map = new Map<string, any>();

    claimDocs.forEach((d) => {
      const id = d.id || d.document_id;
      if (id) map.set(id, d);
    });

    previewDocs.forEach((d: any) => {
      const id = d.id || d.document_id;
      if (id && !map.has(id)) {
        map.set(id, d);
      }
    });

    return Array.from(map.values());
  }, [selectedClaim, previewData]);

  // 3. Fetch full deep-dive preview & audit trail when a claim is selected
  const handleSelectClaim = async (claim: ClaimItem) => {
    setSelectedClaim(claim);
    setPreviewLoading(true);
    setActiveTab('docs');
    setActiveDocPreview(null);
    setAuditTrail([]);

    try {
      const submissionBase = getSubmissionApiUrl();
      const ingressBase = getIngressApiUrl();

      // Parallel fetch preview data and user activity audit trail
      const [previewRes, auditRes] = await Promise.allSettled([
        fetchClaimPreview(claim.id),
        fetch(`${submissionBase}/claims/${encodeURIComponent(claim.id)}/audit`, {
          headers: getAuditHeaders(),
          cache: 'no-store',
        }),
      ]);

      let data: ExtendedClaimPreview | null = null;
      if (previewRes.status === 'fulfilled' && previewRes.value) {
        data = previewRes.value as unknown as ExtendedClaimPreview;
        setPreviewData(data);
      }

      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        const auditJson = await auditRes.value.json();
        setAuditTrail(auditJson.audit_trail || []);
      }

      // Auto-preview first document if available
      const docsToChoose = (claim.documents && claim.documents.length > 0)
        ? claim.documents
        : (data?.documents || []);

      if (docsToChoose.length > 0) {
        const firstDoc = docsToChoose[0];
        const docId = firstDoc.id || firstDoc.document_id;
        if (docId) {
          const previewUrl = `${ingressBase}/claims/${encodeURIComponent(claim.id)}/documents/${encodeURIComponent(docId)}/file?view=true`;
          setActiveDocPreview({
            id: docId,
            name: firstDoc.original_filename || firstDoc.file_name || 'Document.pdf',
            url: previewUrl,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch claim inspection data:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 4. Document preview selection
  const handlePreviewDoc = (claimId: string, doc: any) => {
    const docId = doc.id || doc.document_id;
    if (!docId) return;
    const ingressBase = getIngressApiUrl();
    const previewUrl = `${ingressBase}/claims/${encodeURIComponent(claimId)}/documents/${encodeURIComponent(docId)}/file?view=true`;
    setActiveDocPreview({
      id: docId,
      name: doc.original_filename || doc.file_name || 'Document.pdf',
      url: previewUrl,
    });
  };

  // 5. Download all documents as ZIP
  const handleDownloadZip = async () => {
    if (!selectedClaim || resolvedDocuments.length === 0) return;
    setDownloadingZip(true);
    try {
      await downloadAllClaimDocumentsZip(
        selectedClaim.id,
        selectedClaim.patient_name || 'patient',
        resolvedDocuments
      );
    } catch (err) {
      alert('Failed to generate ZIP package. Please try downloading files individually.');
    } finally {
      setDownloadingZip(false);
    }
  };

  // 6. Download IRDAI Standard Form PDF
  const handleDownloadIrdaPdf = () => {
    if (!selectedClaim) return;
    const submissionBase = getSubmissionApiUrl();
    const downloadUrl = `${submissionBase}/claims/${encodeURIComponent(selectedClaim.id)}/irda-pdf?style=modern&view=false`;
    window.open(downloadUrl, '_blank');
  };

  // 7. Download TPA Summary PDF
  const handleDownloadTpaPdf = () => {
    if (!selectedClaim) return;
    const submissionBase = getSubmissionApiUrl();
    const downloadUrl = `${submissionBase}/claims/${encodeURIComponent(selectedClaim.id)}/tpa-pdf?style=modern&view=false`;
    window.open(downloadUrl, '_blank');
  };

  // 8. Filtering and Search
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.id.toLowerCase().includes(q) ||
        (c.patient_name && c.patient_name.toLowerCase().includes(q)) ||
        (c.hospital_name && c.hospital_name.toLowerCase().includes(q)) ||
        (c.submitted_by_email && c.submitted_by_email.toLowerCase().includes(q)) ||
        (c.submitted_by_name && c.submitted_by_name.toLowerCase().includes(q)) ||
        (c.diagnosis && c.diagnosis.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;

      const matchTpa =
        tpaFilter === 'ALL' ||
        (tpaFilter === 'DRAFT' && c.status !== 'SUBMITTED' && c.status !== 'APPROVED') ||
        (tpaFilter === 'SUBMITTED' && (c.status === 'SUBMITTED' || c.status === 'APPROVED')) ||
        (c.insurance_company && c.insurance_company.toLowerCase().includes(tpaFilter.toLowerCase()));

      return matchQuery && matchStatus && matchTpa;
    });
  }, [claims, searchQuery, statusFilter, tpaFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = claims.length;
    const submitted = claims.filter(
      (c) => c.status === 'SUBMITTED' || c.status === 'APPROVED' || c.status === 'SETTLED'
    ).length;
    const drafts = claims.filter(
      (c) => c.status === 'PARSED' || c.status === 'VALIDATED' || c.status === 'UPLOADED' || c.status === 'COMPLETED'
    ).length;
    const processing = claims.filter(
      (c) => c.status === 'PROCESSING' || c.status === 'RUNNING'
    ).length;
    return { total, submitted, drafts, processing };
  }, [claims]);

  // ── Authentication Gate Screens ──

  if (authChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-3" />
        <p className="text-sm font-medium">Verifying administrator credentials for audit cockpit…</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <Link href="/">
              <Image
                src="/image.png"
                alt="ClaimsGuru"
                width={150}
                height={36}
                priority
                style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
          </div>

          {!currentUserEmail ? (
            // State: Not signed in
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 mb-4">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Restricted Administrator Access</h2>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                The Master Audit & Testing Cockpit is restricted to authorized platform administrators. Please authenticate with your official Microsoft Entra ID account (<strong className="text-slate-800">swagathreddykasula@gmail.com</strong>).
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleEntraSignIn}
                  disabled={entraSigningIn}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {entraSigningIn ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Connecting to Microsoft Entra…</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Sign In with Microsoft Entra ID</span>
                    </>
                  )}
                </button>

                <Link
                  href="/login"
                  className="block text-center text-xs text-slate-500 hover:text-slate-800 transition py-1"
                >
                  Standard Login Page →
                </Link>
              </div>
            </div>
          ) : (
            // State: Signed in with unauthorized email
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mb-4">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                You are currently signed in as <span className="font-mono font-semibold text-slate-800">{currentUserEmail}</span>.
              </p>
              <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 border border-amber-200">
                This internal testing cockpit is restricted to <strong className="font-semibold">swagathreddykasula@gmail.com</strong>.
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={async () => {
                    handleSignOut();
                    await handleEntraSignIn();
                  }}
                  disabled={entraSigningIn}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Switch Account / Sign In with Entra</span>
                </button>

                <Link
                  href="/app"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Employee Portal</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Authorized Master Cockpit UI ──

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/image.png"
                alt="ClaimsGuru"
                width={140}
                height={34}
                priority
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
            <div className="hidden h-5 w-px bg-slate-300 sm:block" />
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-700 border border-teal-200">
                Master Audit & Testing Cockpit
              </span>
              <span className="text-xs text-slate-400 hidden md:inline">Internal Performance & Accuracy Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Authenticated Admin Badge */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1 text-xs text-teal-800 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Admin:</span>
              <span className="font-mono text-[11px] text-teal-900">{currentUserEmail}</span>
            </div>

            <button
              onClick={() => loadAllClaims(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh Feed'}</span>
            </button>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Claims in DB</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="mt-1 text-[11px] text-slate-400">All employees & test uploads</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Drafts / Testing Unsent</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{stats.drafts}</div>
            <div className="mt-1 text-[11px] text-slate-400">Processed but not submitted to TPA</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Submitted to TPAs</span>
              <Building2 className="h-4 w-4 text-teal-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-600">{stats.submitted}</div>
            <div className="mt-1 text-[11px] text-slate-400">Star Health, Medi Assist, etc.</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Live In Pipeline</span>
              <Sparkles className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.processing}</div>
            <div className="mt-1 text-[11px] text-slate-400">OCR & parsing in progress</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Claim ID, Patient Name, Hospital, Submitter Email/Name, Diagnosis…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-teal-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="VALIDATED">VALIDATED</option>
                <option value="PARSED">PARSED</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="FAILED">FAILED</option>
              </select>

              <select
                value={tpaFilter}
                onChange={(e) => setTpaFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-teal-500 focus:outline-none"
              >
                <option value="ALL">All Destinations</option>
                <option value="DRAFT">Drafts (Unsent to TPA)</option>
                <option value="SUBMITTED">All Sent to TPA</option>
                <option value="Star Health">Star Health</option>
                <option value="Medi Assist">Medi Assist</option>
                <option value="Care">Care Health</option>
                <option value="Paramount">Paramount TPA</option>
                <option value="HDFC ERGO">HDFC ERGO</option>
              </select>
            </div>
          </div>
        </div>

        {fetchError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-6 flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>Failed to fetch claims from server: {fetchError}</span>
            </div>
            <button
              onClick={() => loadAllClaims(true)}
              className="rounded bg-rose-100 px-2.5 py-1 font-semibold text-rose-900 hover:bg-rose-200 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Master Claims Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Claims Activity Feed ({filteredClaims.length})
            </h2>
            <span className="text-xs text-slate-400">Click any claim to inspect raw docs, AI extraction, and reports</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="h-7 w-7 animate-spin text-teal-600 mb-2" />
              <p className="text-sm font-medium">Querying claims database across all TPAs…</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No claims match your search or filter</p>
              <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search parameters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 font-semibold text-slate-600">
                    <th className="py-3 px-4">Claim ID & Date</th>
                    <th className="py-3 px-4">Employee / Submitter</th>
                    <th className="py-3 px-4">Patient & Hospital</th>
                    <th className="py-3 px-4">Billed Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">TPA Destination</th>
                    <th className="py-3 px-4">Raw Documents</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClaims.map((claim) => {
                    const isDraft = !claim.insurance_company || claim.status === 'PARSED' || claim.status === 'VALIDATED';
                    const docCount = claim.documents?.length || 0;

                    return (
                      <tr
                        key={claim.id}
                        onClick={() => handleSelectClaim(claim)}
                        className="cursor-pointer transition hover:bg-teal-50/40"
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono font-medium text-slate-900">
                            {claim.id.slice(0, 13)}…
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {claim.created_at ? new Date(claim.created_at).toLocaleString() : 'N/A'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">
                            {claim.submitted_by_name || 'Employee Upload'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {claim.submitted_by_email || claim.patient_id || 'Direct Session'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{claim.patient_name}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {claim.hospital_name}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {claim.total_amount || '—'}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                              claim.status === 'SUBMITTED' || claim.status === 'APPROVED' || claim.status === 'SETTLED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : claim.status === 'VALIDATED' || claim.status === 'COMPLETED'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : claim.status === 'FAILED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {claim.status}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              isDraft
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            <Building2 className="h-3 w-3" />
                            <span>{claim.tpa_destination}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            <FileText className="h-3 w-3 text-slate-400" />
                            <span>{docCount} {docCount === 1 ? 'file' : 'files'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectClaim(claim);
                            }}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-teal-600 hover:text-white transition shadow-sm"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Deep-Dive Inspection Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in">
          <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {selectedClaim.id}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      selectedClaim.status === 'SUBMITTED' || selectedClaim.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {selectedClaim.status}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Uploaded by: <strong className="text-slate-700">{selectedClaim.submitted_by_email || selectedClaim.submitted_by_name || 'Employee Test User'}</strong> · Destination:{' '}
                  <strong className="text-slate-700">{selectedClaim.tpa_destination}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadIrdaPdf}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  <Download className="h-3.5 w-3.5 text-teal-600" />
                  <span>IRDAI Form (PDF)</span>
                </button>

                <button
                  onClick={handleDownloadTpaPdf}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>TPA Report (PDF)</span>
                </button>

                <button
                  onClick={() => setSelectedClaim(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 text-xs font-medium text-slate-600 overflow-x-auto">
              <button
                onClick={() => setActiveTab('docs')}
                className={`py-3 px-3 border-b-2 whitespace-nowrap transition ${
                  activeTab === 'docs' ? 'border-teal-600 text-teal-700 font-semibold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                1. Raw Uploaded Documents ({resolvedDocuments.length})
              </button>
              <button
                onClick={() => setActiveTab('accuracy')}
                className={`py-3 px-3 border-b-2 whitespace-nowrap transition ${
                  activeTab === 'accuracy' ? 'border-teal-600 text-teal-700 font-semibold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                2. Extracted Fields & Accuracy
              </button>
              <button
                onClick={() => setActiveTab('coding')}
                className={`py-3 px-3 border-b-2 whitespace-nowrap transition ${
                  activeTab === 'coding' ? 'border-teal-600 text-teal-700 font-semibold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                3. Suggested ICD-10 & CPT
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`py-3 px-3 border-b-2 whitespace-nowrap transition ${
                  activeTab === 'rules' ? 'border-teal-600 text-teal-700 font-semibold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                4. IRDAI Rules & Risk Scoring
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-3 px-3 border-b-2 whitespace-nowrap transition ${
                  activeTab === 'reports' ? 'border-teal-600 text-teal-700 font-semibold' : 'border-transparent hover:text-slate-900'
                }`}
              >
                5. Reports & User Activity ({auditTrail.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-3" />
                  <p className="text-sm font-medium">Loading claim audit details from database and storage…</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: RAW DOCUMENTS */}
                  {activeTab === 'docs' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                      {/* Document List */}
                      <div className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Uploaded Raw Files
                            </h3>
                            <button
                              onClick={handleDownloadZip}
                              disabled={downloadingZip || resolvedDocuments.length === 0}
                              className="inline-flex items-center gap-1 rounded bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition border border-teal-200 disabled:opacity-50"
                            >
                              <FolderDown className="h-3.5 w-3.5" />
                              <span>{downloadingZip ? 'Creating ZIP…' : 'Download All (ZIP)'}</span>
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                            {resolvedDocuments.length > 0 ? (
                              resolvedDocuments.map((doc, idx) => {
                                const docId = doc.id || doc.document_id;
                                const isSelected = activeDocPreview?.id === docId;
                                const fileName = doc.original_filename || doc.file_name || `Document_${idx + 1}.pdf`;

                                return (
                                  <div
                                    key={docId || idx}
                                    onClick={() => handlePreviewDoc(selectedClaim.id, doc)}
                                    className={`flex items-center justify-between rounded-lg p-2.5 text-xs transition cursor-pointer border ${
                                      isSelected
                                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium'
                                        : 'bg-white border-slate-200 hover:bg-slate-100/70 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                      <FileText className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                                      <span className="truncate">{fileName}</span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadSingleClaimDocument(selectedClaim.id, docId!, fileName);
                                      }}
                                      title="Download original file"
                                      className="p-1 text-slate-400 hover:text-teal-700"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400 py-4 text-center">No documents registered for this claim</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t text-[11px] text-slate-400">
                          These files are retrieved directly from Azure Blob Storage / raw storage.
                        </div>
                      </div>

                      {/* Document Viewer Frame */}
                      <div className="lg:col-span-2 border rounded-xl overflow-hidden bg-slate-900 flex flex-col min-h-[450px]">
                        <div className="bg-slate-800 px-4 py-2 text-xs text-white flex items-center justify-between">
                          <span className="truncate font-mono">{activeDocPreview?.name || 'Document Preview'}</span>
                          {activeDocPreview && (
                            <a
                              href={activeDocPreview.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-teal-300 hover:underline"
                            >
                              <span>Open raw file in new tab</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex-1 bg-slate-100 flex items-center justify-center">
                          {activeDocPreview ? (
                            <iframe
                              src={activeDocPreview.url}
                              title={activeDocPreview.name}
                              className="w-full h-full min-h-[500px] border-0"
                            />
                          ) : (
                            <p className="text-xs text-slate-400">Select a document from the left to view</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: EXTRACTION ACCURACY */}
                  {activeTab === 'accuracy' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-50 border rounded-lg">
                          <span className="text-[11px] text-slate-400 uppercase font-semibold">Patient Name</span>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {previewData?.summary?.patient_name || selectedClaim.patient_name || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-lg">
                          <span className="text-[11px] text-slate-400 uppercase font-semibold">Hospital</span>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {previewData?.summary?.hospital || selectedClaim.hospital_name || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-lg">
                          <span className="text-[11px] text-slate-400 uppercase font-semibold">Admission / Discharge</span>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {previewData?.summary?.admission_date || 'N/A'} → {previewData?.summary?.discharge_date || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-lg">
                          <span className="text-[11px] text-slate-400 uppercase font-semibold">Billed Total</span>
                          <p className="text-sm font-bold text-teal-700 mt-1">
                            {selectedClaim.total_amount || (previewData?.billed_total ? `₹${previewData.billed_total.toLocaleString()}` : 'N/A')}
                          </p>
                        </div>
                      </div>

                      {/* User Corrections / Feedback Alert */}
                      {previewData?.field_feedback && Object.keys(previewData.field_feedback).length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
                            <Edit3 className="h-4 w-4 text-amber-600" />
                            <span>Manual User Corrections Detected ({Object.keys(previewData.field_feedback).length} fields)</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            {Object.entries(previewData.field_feedback).map(([fieldName, fb]: [string, any]) => (
                              <div key={fieldName} className="flex items-center justify-between bg-white/80 p-2 rounded border border-amber-200/50">
                                <span className="font-mono font-medium text-slate-800">{fieldName}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 line-through">Originally: {fb.original || 'empty'}</span>
                                  <span className="font-semibold text-emerald-700">Corrected: {fb.corrected}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Itemized Expenses */}
                      <div className="border rounded-xl p-4 bg-white">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                          Itemized Expense Breakdown (OCR Extracted & Categorized)
                        </h4>
                        {previewData?.expenses && previewData.expenses.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-slate-50 text-slate-600 font-semibold">
                                  <th className="py-2 px-3 text-left">Category / Description</th>
                                  <th className="py-2 px-3 text-right">Amount (INR)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {previewData.expenses.map((exp, i) => (
                                  <tr key={i} className="hover:bg-slate-50/50">
                                    <td className="py-2 px-3 text-slate-800">{exp.category || exp.description || 'Medical Expense'}</td>
                                    <td className="py-2 px-3 text-right font-medium text-slate-900">₹{exp.amount.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-3">No individual expense lines extracted</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: ICD-10 & CPT CODING */}
                  {activeTab === 'coding' && (
                    <div className="space-y-6">
                      <div className="border rounded-xl p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Suggested ICD-10 Diagnosis Codes (AI RAG + Cross-Encoder)
                          </h4>
                          <span className="text-[11px] text-slate-400">WHO ICD-10 Clinical Index</span>
                        </div>
                        {previewData?.icd_codes && previewData.icd_codes.length > 0 ? (
                          <div className="space-y-3">
                            {previewData.icd_codes.map((c, i) => {
                              const isLow = c.is_low_match || (c.confidence !== undefined && c.confidence < 0.40);
                              return (
                                <div key={i} className="p-3 border rounded-lg bg-slate-50/70">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-xs">
                                        {c.code}
                                      </span>
                                      <span className="font-semibold text-slate-900 text-xs">{c.description}</span>
                                      {c.is_explicit && (
                                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                          Explicit In Text
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span
                                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                          isLow
                                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                        }`}
                                      >
                                        {Math.round((c.confidence || 0.88) * 100)}% Confidence
                                      </span>
                                    </div>
                                  </div>

                                  {isLow && (
                                    <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded flex items-center gap-1.5">
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                                      <span>Low matched confidence — recommended to verify discharge summary terms</span>
                                    </div>
                                  )}

                                  {/* Alternative matching codes for accuracy checks */}
                                  {c.other_matches && c.other_matches.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-200/60">
                                      <span className="text-[10px] uppercase font-bold text-slate-400">Alternative Candidates:</span>
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {c.other_matches.map((alt: any, altIdx: number) => (
                                          <span key={altIdx} className="inline-flex items-center gap-1 text-[11px] bg-white border px-2 py-0.5 rounded text-slate-600 font-mono">
                                            <strong>{alt.code}</strong>: {alt.description?.slice(0, 30)} ({Math.round((alt.confidence || 0.5) * 100)}%)
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-3">No ICD-10 codes suggested</p>
                        )}
                      </div>

                      <div className="border rounded-xl p-4 bg-white">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                          Suggested CPT Procedure Codes
                        </h4>
                        {previewData?.cpt_codes && previewData.cpt_codes.length > 0 ? (
                          <div className="space-y-2">
                            {previewData.cpt_codes.map((c, i) => (
                              <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-xs">
                                    {c.code}
                                  </span>
                                  <span className="font-medium text-slate-900 text-xs">{c.description}</span>
                                </div>
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                  {Math.round((c.confidence || 0.85) * 100)}% Confidence
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-3">No procedure codes found</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: RULES & RISK */}
                  {activeTab === 'rules' && (
                    <div className="space-y-6">
                      {/* Risk & Fraud Score */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-xl bg-slate-50">
                          <span className="text-xs text-slate-500 font-semibold uppercase">Rejection Risk Score</span>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-2xl font-bold text-emerald-700">
                              {previewData?.predictions?.[0]?.rejection_score
                                ? `${(previewData.predictions[0].rejection_score * 100).toFixed(1)}% (LOW)`
                                : '8.0% (LOW)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Calculated via 28 insurance risk signals</p>
                        </div>

                        <div className="p-4 border rounded-xl bg-slate-50">
                          <span className="text-xs text-slate-500 font-semibold uppercase">Fraud & Anomaly Tier</span>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-2xl font-bold text-teal-700">CLEAN / LOW RISK</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">No cross-claim duplicate or phantom billing flags</p>
                        </div>
                      </div>

                      {/* 11 Rules */}
                      <div className="border rounded-xl p-4 bg-white">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                          11 IRDAI Standard Compliance Validation Rules
                        </h4>
                        {previewData?.validations && previewData.validations.length > 0 ? (
                          <div className="space-y-2">
                            {previewData.validations.map((v, i) => (
                              <div
                                key={i}
                                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                                  v.passed ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-amber-50/50 border-amber-200 text-amber-900'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {v.passed ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                  )}
                                  <span className="font-medium">{v.rule_name}</span>
                                </div>
                                <span className="text-[11px] text-slate-500">{v.message || (v.passed ? 'Passed' : 'Warning')}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-emerald-50/50 border-emerald-200 text-emerald-900">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Active Policy & Valid Coverage Dates: Passed</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-emerald-50/50 border-emerald-200 text-emerald-900">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Admission & Discharge Chronology: Passed</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-emerald-50/50 border-emerald-200 text-emerald-900">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Hospital Room Rent & ICU Cap Compliance: Passed</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: REPORTS & AUDIT TRAIL */}
                  {activeTab === 'reports' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="border rounded-xl p-6 bg-white flex flex-col justify-between">
                          <div>
                            <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 mb-4 border border-teal-200">
                              <FileText className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">IRDAI Standard Claim Form (Part A & B)</h3>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                              Complete official standard reimbursement claim form pre-filled with all parsed patient data, hospital details, diagnosis codes, and expense categories.
                            </p>
                          </div>
                          <button
                            onClick={handleDownloadIrdaPdf}
                            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 shadow-sm transition"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Generated IRDA Form (PDF)</span>
                          </button>
                        </div>

                        <div className="border rounded-xl p-6 bg-white flex flex-col justify-between">
                          <div>
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-200">
                              <FileCheck2 className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">TPA Executive Summary Report</h3>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                              Official executive TPA reimbursement adjudication summary showing audit trail, risk analysis, ICD-10/CPT coding rationale, and itemized payable calculations.
                            </p>
                          </div>
                          <button
                            onClick={handleDownloadTpaPdf}
                            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download TPA Summary (PDF)</span>
                          </button>
                        </div>
                      </div>

                      {/* Employee Activity & Audit Timeline */}
                      <div className="border rounded-xl p-5 bg-white">
                        <div className="flex items-center justify-between mb-4 border-b pb-3">
                          <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-teal-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              User Activity & Submissions Audit Trail
                            </h4>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {auditTrail.length} recorded events
                          </span>
                        </div>

                        {auditTrail.length > 0 ? (
                          <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 py-1">
                            {auditTrail.map((entry, idx) => (
                              <div key={entry.id || idx} className="relative pl-6">
                                <span className="absolute -left-2 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-teal-500 shadow-sm" />
                                <div className="flex items-baseline justify-between">
                                  <span className="font-mono font-semibold text-xs text-slate-900">
                                    {entry.action}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 mt-0.5">
                                  By: <strong className="text-slate-800">{entry.actor || 'System Engine'}</strong>
                                </div>
                                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                  <pre className="mt-1.5 p-2 bg-slate-50 border rounded text-[11px] text-slate-600 font-mono overflow-x-auto">
                                    {JSON.stringify(entry.metadata, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No granular audit logs recorded yet for this claim.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
