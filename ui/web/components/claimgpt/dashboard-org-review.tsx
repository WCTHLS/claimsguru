'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import fullLogo from './ClaimsGuru Black PNG.png';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  History,
  Info,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
  XCircle,
  Building2,
  FileCheck2,
  LogOut,
  ArrowLeft,
} from 'lucide-react';

import { getStoredAuthSession, clearAuthSession } from '@/lib/auth';
import { LanguageSwitcher } from '@/components/claimgpt/language-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ClaimReportModal } from '@/components/claimgpt/claim-report-modal';
import { DocumentPreviewModal } from '@/components/claimgpt/document-preview-modal';
import { UserProfileModal } from '@/components/claimgpt/user-profile-modal';
import { NotificationBell } from '@/components/claimgpt/notification-bell';
import { CountUp, SpotlightCard, StaggerContainer, StaggerItem } from '@/components/claimgpt/effects';
import { formatINR, useAuditorState } from '@/components/claimgpt/use-auditor-state';
import { cn } from '@/lib/utils';

import { getIngressApiUrl, getSubmissionApiUrl, getChatApiUrl, getApiBaseUrl } from '@/lib/api-client';

export const INGRESS_API = typeof window !== 'undefined' ? getIngressApiUrl() : 'http://127.0.0.1:8000/ingress';
export const SUBMISSION_API = typeof window !== 'undefined' ? getSubmissionApiUrl() : 'http://127.0.0.1:8000/submission';
export const CHAT_API = typeof window !== 'undefined' ? getChatApiUrl() : 'http://127.0.0.1:8000/chat';
export const SEARCH_API = typeof window !== 'undefined' ? `${getApiBaseUrl()}/search` : 'http://127.0.0.1:8000/search';

export interface Doc {
  id: string;
  file_name: string;
  file_type?: string;
}

export interface Claim {
  id: string;
  policy_id: string | null;
  patient_id: string | null;
  status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  documents: Doc[];
}

export interface ClaimSummary {
  patient_name?: string;
  policy_number?: string;
  hospital?: string;
  diagnosis?: string;
  age?: string;
  gender?: string;
  doctor?: string;
  admission_date?: string;
  discharge_date?: string;
  history_of_present_illness?: string;
  treatment?: string;
}

export interface ClaimPreviewData {
  summary?: ClaimSummary;
  billed_total?: number;
  predictions?: { rejection_score: number; top_reasons: { reason: string; weight?: number }[] }[];
  validations?: { rule_name: string; passed: boolean; message: string; severity: string }[];
  documents?: Doc[];
  icd_codes?: { code: string; description: string }[];
  cpt_codes?: { code: string; description: string }[];
  expenses?: { category: string; description?: string; amount: number }[];
}

export interface FieldFeedbackEntry {
  original: string | null;
  corrected: string | null;
  updated_at: string | null;
  user_email: string | null;
  document_id: string | null;
}

export interface EnrichedClaim extends Claim {
  summary?: ClaimSummary;
  billed_total?: number;
  edited_fields?: string[];
  field_feedback?: Record<string, FieldFeedbackEntry>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STATUS_OPTIONS = [
  'ALL',
  'SUBMITTED',
  'COMPLETED',
  'APPROVED',
  'REJECTED',
  'MODIFICATION_REQUESTED',
  'DOCUMENTS_REQUESTED',
  'MANUAL_REVIEW_REQUIRED',
  'WORKFLOW_FAILED',
  'SETTLED',
];

const PAGE_SIZE = 20;

function formatStatus(status: string) {
  if (status === 'DOCUMENTS_UPLOADED') return 'Docs Uploaded';
  return status.replace(/_/g, ' ');
}

function getStatusBadgeStyle(s: string) {
  const status = (s || '').toUpperCase();
  if (status === 'SETTLED') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (status === 'COMPLETED' || status === 'VALIDATED' || status === 'APPROVED')
    return 'bg-teal-100 text-teal-800 border-teal-300';
  if (status === 'DOCUMENTS_UPLOADED' || status === 'RESUBMITTED')
    return 'bg-purple-100 text-purple-800 border-purple-300';
  if (status === 'SUBMITTED' || status === 'PREDICTED' || status === 'PROCESSING')
    return 'bg-sky-100 text-sky-800 border-sky-300';
  if (status.includes('FAIL') || status === 'REJECTED') return 'bg-rose-100 text-rose-800 border-rose-300';
  if (
    status === 'MANUAL_REVIEW_REQUIRED' ||
    status === 'MODIFICATION_REQUESTED' ||
    status === 'DOCUMENTS_REQUESTED'
  )
    return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-slate-100 text-slate-700 border-slate-300';
}

function getPriorityLevel(c: EnrichedClaim): 'high' | 'medium' | 'low' {
  const st = (c.status || '').toUpperCase();
  if (['MANUAL_REVIEW_REQUIRED', 'VALIDATION_FAILED', 'REJECTED', 'WORKFLOW_FAILED'].includes(st)) return 'high';
  if (['PROCESSING', 'MODIFICATION_REQUESTED', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_UPLOADED'].includes(st)) return 'medium';
  return 'low';
}

function getPatientName(c: EnrichedClaim) {
  if (c.summary?.patient_name && c.summary.patient_name !== 'N/A') return c.summary.patient_name;
  return c.patient_id ? `${c.patient_id.substring(0, 10)}...` : 'Patient Record';
}

function getPolicyNum(c: EnrichedClaim) {
  if (c.summary?.policy_number && c.summary.policy_number !== 'N/A') return c.summary.policy_number;
  return c.policy_id || 'N/A';
}

/** Fallback mock claims for standalone offline demonstration */
const MOCK_CLAIMS: EnrichedClaim[] = [
  {
    id: 'CLM-APOLLO-9041',
    policy_id: 'POL-77382',
    patient_id: 'PAT-48201',
    status: 'MANUAL_REVIEW_REQUIRED',
    source: 'web_portal',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    documents: [
      { id: 'doc-101', file_name: 'apollo_discharge_summary.pdf', file_type: 'application/pdf' },
      { id: 'doc-102', file_name: 'hospital_final_bill.pdf', file_type: 'application/pdf' },
    ],
    billed_total: 145000,
    edited_fields: ['diagnosis', 'hospital'],
    summary: {
      patient_name: 'Rahul Sharma',
      policy_number: 'POL-77382',
      hospital: 'Apollo Hospitals, Greams Road',
      diagnosis: 'Acute Appendicitis w/ Laparoscopic Appendectomy',
      age: '38',
      gender: 'Male',
      doctor: 'Dr. V. K. Seshadri',
      admission_date: '2026-08-05',
      discharge_date: '2026-08-08',
      treatment: 'Laparoscopic Surgery under GA',
    },
    field_feedback: {
      diagnosis: {
        original: 'Acute Appendicitis',
        corrected: 'Acute Appendicitis w/ Laparoscopic Appendectomy',
        updated_at: new Date().toISOString(),
        user_email: 'reviewer@apollo.org',
        document_id: 'doc-101',
      },
    },
  },
  {
    id: 'CLM-APOLLO-8892',
    policy_id: 'POL-91024',
    patient_id: 'PAT-19302',
    status: 'VALIDATED',
    source: 'mobile_app',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    documents: [
      { id: 'doc-201', file_name: 'cardiac_evaluation.pdf', file_type: 'application/pdf' },
    ],
    billed_total: 280000,
    summary: {
      patient_name: 'Ananya Roy',
      policy_number: 'POL-91024',
      hospital: 'Apollo Speciality Hospital',
      diagnosis: 'Coronary Artery Disease - Angioplasty',
      age: '54',
      gender: 'Female',
      doctor: 'Dr. Priya Sundaram',
      admission_date: '2026-08-02',
      discharge_date: '2026-08-06',
    },
  },
  {
    id: 'CLM-APOLLO-7650',
    policy_id: 'POL-66190',
    patient_id: 'PAT-88192',
    status: 'APPROVED',
    source: 'web_portal',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    documents: [
      { id: 'doc-301', file_name: 'ortho_surgery_summary.pdf', file_type: 'application/pdf' },
    ],
    billed_total: 92000,
    summary: {
      patient_name: 'Vikram Patel',
      policy_number: 'POL-66190',
      hospital: 'Apollo Multi-Specialty Hospital',
      diagnosis: 'Left Knee Arthroscopy',
      age: '42',
      gender: 'Male',
      doctor: 'Dr. Rajesh Nair',
      admission_date: '2026-08-01',
      discharge_date: '2026-08-03',
    },
  },
];

export function DashboardOrgReview({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const session = getStoredAuthSession();

  const [allClaims, setAllClaims] = useState<EnrichedClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const filteredClaims = useMemo(() => {
    if (statusFilter === 'ALL') return allClaims;
    return allClaims.filter((c) => (c.status || '').toUpperCase() === statusFilter);
  }, [allClaims, statusFilter]);

  /* Drawer & Modals */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  /* Expanded Row State */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<ClaimPreviewData | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedTab, setExpandedTab] = useState<'overview' | 'documents' | 'chat'>('overview');

  /* Quick Actions (Approve / Reject / Send Back) */
  const [actionClaimId, setActionClaimId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'send_back' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /* Settlement Maker-Checker Flow */
  const [sendMoneyClaim, setSendMoneyClaim] = useState<EnrichedClaim | null>(null);
  const [sendMoneyAmount, setSendMoneyAmount] = useState('');
  const [sendMoneySubmitting, setSendMoneySubmitting] = useState(false);
  const [sendMoneySuccess, setSendMoneySuccess] = useState<string | null>(null);
  const [sendMoneyError, setSendMoneyError] = useState<string | null>(null);
  const [pendingAuth, setPendingAuth] = useState<Record<string, { by: string; at: string; amount: string }>>({});

  const auditor = useAuditorState();
  const userName = session?.user?.name || 'Reviewer';
  const userEmail = session?.user?.email || `reviewer@${orgSlug || 'apollo'}.org`;

  /* Document & Summary Viewer Modals */
  const [reportModalClaimId, setReportModalClaimId] = useState<string | null>(null);
  const [docPreviewModal, setDocPreviewModal] = useState<{
    open: boolean;
    claimId: string | null;
    initialDocId?: string | null;
    documents?: any[];
    patientName?: string;
  }>({
    open: false,
    claimId: null,
  });

  /* Edits History Modal */
  const [editsModalClaim, setEditsModalClaim] = useState<EnrichedClaim | null>(null);

  /* Patient Message Modal */
  const [msgClaim, setMsgClaim] = useState<EnrichedClaim | null>(null);
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  /* Inline Chat State */
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatSessionRef = useRef<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* Header Search Focus & Keyboard shortcuts */
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const token = session?.accessToken;
    const headers: Record<string, string> = {
      "X-User-Role": session?.role || "reviewer",
      ...(orgSlug ? { "X-Organization-Slug": orgSlug } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
      let rawClaims: Claim[] = [];
      let rawTotal = 0;

      const orgParam = orgSlug ? `&organization=${encodeURIComponent(orgSlug)}` : '';

      if (search.trim()) {
        const searchRes = await fetch(`${SEARCH_API}/?q=${encodeURIComponent(search)}&limit=${PAGE_SIZE}`, { headers }).catch(() => null);
        if (searchRes && searchRes.ok) {
          const data = await searchRes.json();
          const results = data.results || [];
          const details = await Promise.all(
            results.map((r: any) =>
              fetch(`${INGRESS_API}/claims/${r.claim_id}${orgParam ? `?${orgParam.slice(1)}` : ''}`, { headers })
                .then((res) => (res.ok ? res.json() : null))
                .catch(() => null)
            )
          );
          rawClaims = details.filter(Boolean);
          rawTotal = rawClaims.length;
        }
      } else {
        const res = await fetch(`${INGRESS_API}/claims?offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}${orgParam}`, { headers }).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          rawClaims = data.claims || data.results || (Array.isArray(data) ? data : []);
          rawTotal = data.total || rawClaims.length;
        }
      }

      // Enrich claims with submission preview data
      let enriched: EnrichedClaim[] = await Promise.all(
        rawClaims.map(async (c) => {
          try {
            const prevRes = await fetch(`${SUBMISSION_API}/claims/${c.id}/preview`, { headers }).catch(() => null);
            if (prevRes && prevRes.ok) {
              const prevData = await prevRes.json();
              return {
                ...c,
                summary: prevData.summary || (c as any).summary,
                billed_total: prevData.billed_total ?? (c as any).billed_total,
                edited_fields: prevData.field_feedback ? Object.keys(prevData.field_feedback) : (c as any).edited_fields,
                field_feedback: prevData.field_feedback || (c as any).field_feedback,
                insurance_company: (c as any).insurance_company || prevData.payer || (prevData.summary as any)?.insurer || null,
              };
            }
          } catch {
            /* ignore */
          }
          return c as EnrichedClaim;
        })
      );

      // On dedicated TPA review portals, strictly show only claims submitted to that TPA/insurer
      if (orgSlug && !['admin', 'system', 'claimsguru', 'global'].includes(orgSlug.toLowerCase())) {
        const orgKey = orgSlug.replace(/[-_]/g, ' ').toLowerCase();
        const keywords = orgKey.split(' ').filter(k => !['org', 'tpa', 'hospital', 'review', 'admin'].includes(k));
        if (keywords.length > 0) {
          enriched = enriched.filter(c => {
            const payer = ((c as any).insurance_company || (c as any).payer || (c.summary as any)?.insurer || '').toLowerCase();
            return payer && keywords.some(k => payer.includes(k));
          });
          rawTotal = enriched.length;
        }
      }

      setAllClaims(enriched);
      setTotal(rawTotal);
    } catch {
      setAllClaims([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, session?.role, orgSlug, page, search, refreshKey]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  /* Build search suggestions */
  useEffect(() => {
    const suggs = new Set<string>();
    allClaims.forEach((c) => {
      if (c.summary?.patient_name && c.summary.patient_name !== 'N/A') suggs.add(c.summary.patient_name);
      if (c.summary?.policy_number && c.summary.policy_number !== 'N/A') suggs.add(c.summary.policy_number);
      if (c.summary?.hospital && c.summary.hospital !== 'N/A') suggs.add(c.summary.hospital);
      if (c.summary?.diagnosis && c.summary.diagnosis !== 'N/A') suggs.add(c.summary.diagnosis);
      if (c.id) suggs.add(c.id);
    });
    setSuggestions(Array.from(suggs));
  }, [allClaims]);

  /* Expand / Collapse Claim Detail */
  async function toggleExpand(claimId: string) {
    if (expandedId === claimId) {
      setExpandedId(null);
      setExpandedPreview(null);
      setExpandedTab('overview');
      setChatMessages([]);
      return;
    }
    setExpandedId(claimId);
    setExpandedTab('overview');
    setExpandedLoading(true);
    setChatMessages([]);
    chatSessionRef.current = `org-review-${claimId}-${Date.now()}`;

    const token = session?.accessToken;
    const headers: Record<string, string> = {
      "X-User-Role": session?.role || "reviewer",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
      const res = await fetch(`${SUBMISSION_API}/claims/${claimId}/preview`, { headers }).catch(() => null);
      if (res && res.ok) {
        const preview = await res.json();
        setExpandedPreview(preview);
      } else {
        const found = allClaims.find((c) => c.id === claimId);
        setExpandedPreview({
          summary: found?.summary,
          billed_total: found?.billed_total,
          predictions: [],
          validations: [],
          icd_codes: [],
          cpt_codes: [],
        });
      }
    } catch {
      setExpandedPreview(null);
    } finally {
      setExpandedLoading(false);
    }
  }

  /* Resilient Reviewer Action Dispatcher */
  async function callReviewerAction(claimId: string, payload: { action: string; reason?: string; requested_documents?: string[] }) {
    const token = session?.accessToken;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Role': session?.role || session?.accountRole || 'reviewer',
      ...(session?.user?.email || session?.user?.id ? { 'X-User-Id': session.user.email || session.user.id } : {}),
      ...(orgSlug ? { 'X-Organization-Slug': orgSlug } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const endpoints = [
      `${SUBMISSION_API}/claims/${claimId}/tpa-action`,
      `${INGRESS_API}/claims/${claimId}/tpa-action`,
    ];

    let lastError: Error | null = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json().catch(() => ({ status: 'success' }));
        }
        const errData = await res.json().catch(() => ({}));
        lastError = new Error(errData.detail || errData.message || `Action failed with HTTP ${res.status}`);
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error('Network error calling reviewer action');
  }

  /* Quick Actions (Approve / Reject / Send Back) */
  function openQuickAction(claimId: string, action: 'approve' | 'reject' | 'send_back', e?: React.MouseEvent) {
    e?.stopPropagation();
    setActionClaimId(claimId);
    setActionType(action);
    setActionReason('');
    setActionSuccess(null);
    setActionError(null);
  }

  async function submitQuickAction() {
    if (!actionClaimId || !actionType) return;
    setActionSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const data = await callReviewerAction(actionClaimId, {
        action: actionType,
        reason: actionReason.trim(),
      });

      let newStatus = actionType === 'approve' ? 'APPROVED' : actionType === 'reject' ? 'REJECTED' : 'MODIFICATION_REQUESTED';
      if (data && data.new_status) {
        newStatus = data.new_status;
      }

      setActionSuccess(`Claim updated to ${formatStatus(newStatus)} successfully.`);
      setAllClaims((prev) => prev.map((c) => (c.id === actionClaimId ? { ...c, status: newStatus } : c)));
      if (expandedId === actionClaimId) {
        setExpandedPreview((prev: any) => (prev ? { ...prev, status: newStatus } : null));
      }

      setTimeout(() => {
        setActionClaimId(null);
        setActionType(null);
        setActionReason('');
        setActionSuccess(null);
        setActionError(null);
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Action failed. Please check connection and try again.');
    } finally {
      setActionSubmitting(false);
    }
  }

  /* Settlement Maker-Checker Flow */
  function openSendMoney(c: EnrichedClaim, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSendMoneyClaim(c);
    setSendMoneyAmount((c.billed_total || 0).toString());
    setSendMoneySuccess(null);
    setSendMoneyError(null);
  }

  function requestSettlement(c: EnrichedClaim, e?: React.MouseEvent) {
    e?.stopPropagation();
    openSendMoney(c, e);
  }

  async function submitSendMoney() {
    if (!sendMoneyClaim) return;
    setSendMoneySubmitting(true);
    setSendMoneySuccess(null);
    setSendMoneyError(null);

    try {
      const amountVal = parseFloat(sendMoneyAmount) || sendMoneyClaim.billed_total || 0;
      await callReviewerAction(sendMoneyClaim.id, {
        action: 'send_money',
        reason: `Settlement authorized: ₹${amountVal.toLocaleString()}`,
      });

      setSendMoneySuccess('Settlement authorized & payout recorded successfully.');
      setAllClaims((prev) => prev.map((c) => (c.id === sendMoneyClaim.id ? { ...c, status: 'SETTLED' } : c)));
      if (expandedId === sendMoneyClaim.id) {
        setExpandedPreview((prev: any) => (prev ? { ...prev, status: 'SETTLED' } : null));
      }
      setPendingAuth((prev) => {
        const updated = { ...prev };
        delete updated[sendMoneyClaim.id];
        return updated;
      });

      setTimeout(() => {
        setSendMoneyClaim(null);
        setSendMoneySuccess(null);
        setSendMoneyError(null);
      }, 1500);
    } catch (err: any) {
      setSendMoneyError(err.message || 'Authorization failed. Please try again.');
    } finally {
      setSendMoneySubmitting(false);
    }
  }

  /* Patient Message Modal */
  async function sendMessage() {
    if (!msgClaim || !msgText.trim()) return;
    setMsgSending(true);
    setMsgError(null);
    setMsgSent(false);

    try {
      await callReviewerAction(msgClaim.id, {
        action: 'request_docs',
        reason: msgText.trim(),
        requested_documents: [msgText.trim()],
      });

      setMsgSent(true);
      setAllClaims((prev) => prev.map((c) => (c.id === msgClaim.id ? { ...c, status: 'DOCUMENTS_REQUESTED' } : c)));
      if (expandedId === msgClaim.id) {
        setExpandedPreview((prev: any) => (prev ? { ...prev, status: 'DOCUMENTS_REQUESTED' } : null));
      }

      setTimeout(() => {
        setMsgClaim(null);
        setMsgSent(false);
        setMsgText('');
        setMsgError(null);
      }, 1800);
    } catch (err: any) {
      setMsgError(err.message || 'Failed to dispatch document request. Please try again.');
    } finally {
      setMsgSending(false);
    }
  }

  /* Streaming AI Chat for Claim */
  async function sendInlineChat(e?: FormEvent) {
    e?.preventDefault();
    const msg = chatInput.trim();
    if (!msg || chatLoading || !expandedId) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);

    const token = session?.accessToken;

    try {
      const res = await fetch(`${CHAT_API}/${chatSessionRef.current}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: msg, claim_id: expandedId, language: 'en' }),
      });

      if (!res.ok) throw new Error('Chat request failed');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';

      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantMsg += chunk;
          setChatMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: assistantMsg };
            return next;
          });
        }
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to connect to AI assistant service. Please check network connectivity.',
        },
      ]);
    } finally {
      setChatLoading(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /* Global Summary Metrics (Fixed across tabs & status filters) */
  const totalClaimsCount = allClaims.length;

  const pendingCount = allClaims.filter((c) =>
    ['PENDING', 'PROCESSING', 'PREDICTED', 'MANUAL_REVIEW_REQUIRED', 'SUBMITTED', 'DOCUMENTS_REQUESTED', 'MODIFICATION_REQUESTED'].includes((c.status || '').toUpperCase())
  ).length;

  const settledTotal = allClaims.reduce((acc, c) => acc + (c.billed_total || 0), 0);

  const highRiskCount = allClaims.filter((c) => getPriorityLevel(c) === 'high').length;

  const orgDisplayName = orgSlug ? orgSlug.toUpperCase() : 'ORGANIZATION';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100/80 text-foreground font-sans">
      {/* Drawer & User Profile Modals */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        s={auditor}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Top Clinical Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/star-health/review" className="flex items-center gap-2">
              <img src={fullLogo.src} className="h-7 sm:h-8 w-auto flex-none" alt="ClaimsGuru Logo" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
                TPA Reviewer
              </span>
            </div>
          </div>

          {/* Search Header Bar */}
          <div className="relative ml-4 hidden flex-1 max-w-md md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search patients, policy IDs, hospital bills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {searchFocused && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-50">
                {suggestions
                  .filter((s) => s.toLowerCase().includes(search.toLowerCase()))
                  .slice(0, 6)
                  .map((s, idx) => (
                    <button
                      key={idx}
                      onMouseDown={() => setSearch(s)}
                      className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs hover:bg-slate-100 text-slate-700"
                    >
                      <Search className="h-3 w-3 text-slate-400" />
                      <span>{s}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* User Controls, Back to Admin & Log Out */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push(`/${orgSlug}/admin`)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Admin</span>
            </button>

            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              title="Refresh claims"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
            <LanguageSwitcher variant="light" />
            <NotificationBell variant="clinical" />

            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-900">{userName}</span>
              <span className="text-[10px] text-slate-500">{userEmail}</span>
            </div>

            <Avatar
              onClick={() => setIsProfileOpen(true)}
              className="h-9 w-9 border border-slate-200 cursor-pointer hover:scale-105 transition-transform"
            >
              <AvatarFallback className="bg-teal-600 text-xs font-semibold text-white">
                {(session?.user?.name || 'R').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <button
              onClick={() => {
                clearAuthSession();
                router.push('/login');
              }}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
              title="Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Review Workspace Container */}
      <main className="relative z-10 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <StaggerContainer className="mx-auto max-w-7xl space-y-6 pb-24">
          {/* Welcome Title Banner */}
          <StaggerItem index={0}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                    Reviewer: {userName}
                  </span>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 px-2.5 py-0.5 text-xs">
                    Org: {orgSlug}
                  </Badge>
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {orgDisplayName} Claim Review Workspace
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Audit submitted claims, review AI risk predictions, authorize settlements &amp; request missing documentation.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => router.push(`/${orgSlug}/admin`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </button>
                <button
                  onClick={() => {
                    clearAuthSession();
                    router.push('/login');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </div>
          </StaggerItem>

          {/* Metrics Summary Cards */}
          <StaggerItem index={1}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SpotlightCard className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Claims</span>
                  <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">
                  <CountUp end={totalClaimsCount} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Submitted to {orgDisplayName}</p>
              </SpotlightCard>

              <SpotlightCard className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Action</span>
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-amber-600">
                  <CountUp end={pendingCount} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Awaiting approval or info</p>
              </SpotlightCard>

              <SpotlightCard className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Claim Value</span>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{formatINR(settledTotal)}</div>
                <p className="mt-1 text-xs text-slate-500">Billed amount sum</p>
              </SpotlightCard>

              <SpotlightCard className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">High Risk / Flagged</span>
                  <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-rose-600">
                  <CountUp end={highRiskCount} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Requires manual review</p>
              </SpotlightCard>
            </div>
          </StaggerItem>

          {/* Filter Toolbar */}
          <StaggerItem index={2}>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <Filter className="h-4 w-4 text-slate-400 flex-none" />
                  <span className="text-xs font-semibold text-slate-600 flex-none mr-1">Status:</span>
                  {['ALL', 'APPROVED', 'MANUAL_REVIEW_REQUIRED', 'DOCUMENTS_REQUESTED', 'REJECTED', 'SETTLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st);
                        setPage(0);
                      }}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap',
                        statusFilter === st
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {formatStatus(st)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(0);
                    }}
                    className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {formatStatus(opt)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* Claims List Table / Cards */}
          <StaggerItem index={3}>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-slate-900 text-sm">Submitted Claims Record</h3>
                <span className="text-xs text-slate-500">
                  Showing {filteredClaims.length} of {allClaims.length} claims
                </span>
              </div>

              {loading ? (
                <div className="flex py-16 justify-center items-center gap-3 text-slate-500 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  <span>Loading claims record for {orgDisplayName}...</span>
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-sm">
                  <FileText className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                  <p>No claims found for status filter &quot;{formatStatus(statusFilter)}&quot;.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredClaims.map((c) => {
                    const isExpanded = expandedId === c.id;
                    const priority = getPriorityLevel(c);
                    const isPendingAuth = Boolean(pendingAuth[c.id]);

                    return (
                      <div key={c.id} className="transition-colors hover:bg-slate-50/80">
                        {/* Main Claim Header Row */}
                        <div
                          onClick={() => toggleExpand(c.id)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 cursor-pointer gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <div
                              className={cn(
                                'flex h-10 w-10 flex-none items-center justify-center rounded-lg border text-xs font-bold',
                                priority === 'high'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : priority === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-teal-50 text-teal-700 border-teal-200'
                              )}
                            >
                              {priority === 'high' ? 'HIGH' : priority === 'medium' ? 'MED' : 'LOW'}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900">{c.id}</span>
                                <Badge className={cn('text-[11px] border font-medium', getStatusBadgeStyle(c.status))}>
                                  {formatStatus(c.status)}
                                </Badge>
                                {c.edited_fields && c.edited_fields.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditsModalClaim(c);
                                    }}
                                    className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200 hover:bg-purple-100"
                                  >
                                    <History className="h-3 w-3" />
                                    <span>{c.edited_fields.length} edits feedback</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                <span className="font-semibold text-slate-800">{getPatientName(c)}</span>
                                <span>Policy: {getPolicyNum(c)}</span>
                                {c.summary?.hospital && (
                                  <span className="truncate max-w-[200px]" title={c.summary.hospital}>
                                    {c.summary.hospital}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Controls & Amount */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 flex-none pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="text-left sm:text-right">
                              <span className="block text-sm font-bold text-slate-900">
                                {c.billed_total ? formatINR(c.billed_total) : '—'}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                {new Date(c.created_at || Date.now()).toLocaleDateString()}
                              </span>
                            </div>                            {/* Status-Aware Action Buttons */}
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {c.status === 'SETTLED' ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-300">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Settled & Paid</span>
                                </span>
                              ) : (
                                <>
                                  {c.status !== 'APPROVED' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => openQuickAction(c.id, 'approve', e)}
                                      className="h-8 border-teal-300 text-teal-700 hover:bg-teal-50 font-medium"
                                      title="Approve Claim"
                                    >
                                      <Check className="h-3.5 w-3.5 sm:mr-1" />
                                      <span className="hidden sm:inline">Approve</span>
                                    </Button>
                                  )}

                                  {c.status !== 'REJECTED' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => openQuickAction(c.id, 'reject', e)}
                                      className="h-8 border-rose-300 text-rose-700 hover:bg-rose-50 font-medium"
                                      title="Reject Claim"
                                    >
                                      <X className="h-3.5 w-3.5 sm:mr-1" />
                                      <span className="hidden sm:inline">Reject</span>
                                    </Button>
                                  )}

                                  {c.status !== 'MODIFICATION_REQUESTED' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => openQuickAction(c.id, 'send_back', e)}
                                      className="h-8 border-sky-300 text-sky-700 hover:bg-sky-50 font-medium"
                                      title="Send Back / Request Modifications"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5 sm:mr-1" />
                                      <span className="hidden sm:inline">Send Back</span>
                                    </Button>
                                  )}

                                  {c.status === 'DOCUMENTS_REQUESTED' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMsgClaim(c);
                                        setMsgText('');
                                        setMsgSent(false);
                                        setMsgError(null);
                                      }}
                                      className="h-8 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium"
                                      title="Awaiting Patient Documents - Click to update note"
                                    >
                                      <Clock className="h-3.5 w-3.5 sm:mr-1 text-amber-600 animate-spin" />
                                      <span className="hidden sm:inline">Awaiting Docs</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMsgClaim(c);
                                        setMsgText('');
                                        setMsgSent(false);
                                        setMsgError(null);
                                      }}
                                      className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50 font-medium"
                                      title="Request Missing Documents or Message Submitter"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5 sm:mr-1" />
                                      <span className="hidden sm:inline">Request Docs</span>
                                    </Button>
                                  )}

                                  {c.status === 'APPROVED' && (
                                    <Button
                                      size="sm"
                                      onClick={(e) => requestSettlement(c, e)}
                                      className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-medium"
                                      title="Authorize Payout & Settle Claim"
                                    >
                                      <DollarSign className="h-3.5 w-3.5 sm:mr-1" />
                                      <span className="hidden sm:inline">Settle & Pay</span>
                                    </Button>
                                  )}
                                </>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleExpand(c.id)}
                                className="h-8 text-slate-500 hover:text-slate-900"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Card Workspace Details */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-slate-50/90 p-4 sm:p-6 space-y-4">
                            {/* Inner Navigation Tabs */}
                            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                              <button
                                onClick={() => setExpandedTab('overview')}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                                  expandedTab === 'overview'
                                    ? 'bg-teal-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-200'
                                )}
                              >
                                <Info className="h-3.5 w-3.5" />
                                <span>Verification Overview</span>
                              </button>

                              <button
                                onClick={() => setExpandedTab('documents')}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                                  expandedTab === 'documents'
                                    ? 'bg-teal-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-200'
                                )}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Documents ({c.documents?.length || 0})</span>
                              </button>

                              <button
                                onClick={() => setExpandedTab('chat')}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                                  expandedTab === 'chat'
                                    ? 'bg-teal-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-200'
                                )}
                              >
                                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                                <span>Ask ClaimsGuru AI</span>
                              </button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  auditor.openReportModal(c.id);
                                }}
                                className="ml-auto h-7 text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                <span>Full Audit Report</span>
                              </Button>
                            </div>

                            {/* Tab Content: Overview */}
                            {expandedTab === 'overview' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* AI Rejection Risk Card */}
                                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                      AI Rejection Prediction Score
                                    </h4>
                                    <span
                                      className={cn(
                                        'rounded-full px-2 py-0.5 text-xs font-bold',
                                        (expandedPreview?.predictions?.[0]?.rejection_score || 0) > 40
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-teal-100 text-teal-800'
                                      )}
                                    >
                                      {expandedPreview?.predictions?.[0]?.rejection_score ?? 15}% Risk
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    <span className="text-xs text-slate-500 font-medium">Top Risk Indicators:</span>
                                    {expandedPreview?.predictions?.[0]?.top_reasons?.map((r, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between text-xs rounded bg-slate-50 p-2 text-slate-700 border border-slate-100"
                                      >
                                        <span>{r.reason}</span>
                                        {r.weight && (
                                          <span className="font-mono text-[10px] text-slate-400">
                                            w={r.weight.toFixed(2)}
                                          </span>
                                        )}
                                      </div>
                                    )) || (
                                      <p className="text-xs text-slate-400 italic">No elevated risk triggers found.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Clinical Extraction Summary Card */}
                                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Parsed Clinical Details
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-slate-400 block">Diagnosis:</span>
                                      <span className="font-semibold text-slate-800">
                                        {c.summary?.diagnosis || 'N/A'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block">Attending Doctor:</span>
                                      <span className="font-semibold text-slate-800">{c.summary?.doctor || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block">Admission Date:</span>
                                      <span className="text-slate-700">{c.summary?.admission_date || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block">Discharge Date:</span>
                                      <span className="text-slate-700">{c.summary?.discharge_date || 'N/A'}</span>
                                    </div>
                                  </div>

                                  {/* ICD & CPT Codes */}
                                  {(expandedPreview?.icd_codes?.length || expandedPreview?.cpt_codes?.length) ? (
                                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
                                      {expandedPreview?.icd_codes?.map((code, idx) => (
                                        <span
                                          key={idx}
                                          className="rounded bg-sky-50 px-2 py-0.5 font-mono text-sky-800 border border-sky-200"
                                        >
                                          ICD: {code.code} - {code.description}
                                        </span>
                                      ))}
                                      {expandedPreview?.cpt_codes?.map((code, idx) => (
                                        <span
                                          key={idx}
                                          className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-indigo-800 border border-indigo-200"
                                        >
                                          CPT: {code.code} - {code.description}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {/* Tab Content: Documents */}
                            {expandedTab === 'documents' && (
                              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                  Claim Documents &amp; Attachments
                                </h4>
                                {c.documents && c.documents.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {c.documents.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FileText className="h-4 w-4 text-teal-600 flex-none" />
                                          <span className="text-xs font-medium text-slate-800 truncate" title={doc.file_name}>
                                            {doc.file_name}
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            setDocPreviewModal({
                                              open: true,
                                              claimId: c.id,
                                              initialDocId: doc.id,
                                              documents: c.documents,
                                              patientName: getPatientName(c),
                                            })
                                          }
                                          className="h-7 text-xs text-teal-700 hover:text-teal-900"
                                        >
                                          <Eye className="h-3.5 w-3.5 mr-1" />
                                          Preview
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">No document attachments uploaded for this claim.</p>
                                )}
                              </div>
                            )}

                            {/* Tab Content: AI Assistant Chat */}
                            {expandedTab === 'chat' && (
                              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                  <Sparkles className="h-4 w-4 text-teal-600" />
                                  <span className="text-xs font-bold text-slate-800">
                                    AI Co-Pilot for Claim {c.id}
                                  </span>
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-2 p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                                  {chatMessages.length === 0 ? (
                                    <p className="text-slate-400 italic text-center py-4">
                                      Ask AI any questions about medical necessity, policy coverage rules, or bill line items.
                                    </p>
                                  ) : (
                                    chatMessages.map((m, idx) => (
                                      <div
                                        key={idx}
                                        className={cn(
                                          'p-2.5 rounded-lg max-w-[85%]',
                                          m.role === 'user'
                                            ? 'ml-auto bg-teal-600 text-white'
                                            : 'bg-white border border-slate-200 text-slate-800'
                                        )}
                                      >
                                        <p className="whitespace-pre-wrap">{m.content}</p>
                                      </div>
                                    ))
                                  )}
                                  <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={sendInlineChat} className="flex gap-2">
                                  <Input
                                    placeholder="Type your question about this claim..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="h-9 text-xs bg-slate-50"
                                  />
                                  <Button type="submit" disabled={chatLoading} className="h-9 bg-teal-600 text-white">
                                    {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                  </Button>
                                </form>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </StaggerItem>
        </StaggerContainer>
      </main>

      {/* Quick Action Modal (Approve / Reject / Send Back) */}
      {actionClaimId && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 capitalize">
                {actionType === 'approve' ? 'Approve Claim' : actionType === 'reject' ? 'Reject Claim' : 'Request Info / Send Back'}
              </h3>
              <button onClick={() => setActionClaimId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide justification or audit reason for updating claim <span className="font-bold font-mono">{actionClaimId}</span>:
            </p>

            <textarea
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Enter audit notes / reason for policy record..."
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:border-teal-500 focus:outline-none"
            />

            {actionError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 flex-none text-rose-600" />
                <span>{actionError}</span>
              </p>
            )}

            {actionSuccess && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 flex-none text-emerald-600" />
                <span>{actionSuccess}</span>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActionClaimId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={actionSubmitting}
                onClick={submitQuickAction}
                className={cn(
                  'text-white',
                  actionType === 'approve'
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : actionType === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-sky-600 hover:bg-sky-700'
                )}
              >
                {actionSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Action'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Authorization Modal */}
      {sendMoneyClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Authorize Payout Settlement</h3>
              <button onClick={() => setSendMoneyClaim(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Maker-checker payout authorization for claim <span className="font-bold font-mono">{sendMoneyClaim.id}</span>:
            </p>

            <div>
              <Label className="text-xs font-semibold">Settlement Amount (INR)</Label>
              <Input
                type="number"
                value={sendMoneyAmount}
                onChange={(e) => setSendMoneyAmount(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
            </div>

            {sendMoneyError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 flex-none text-rose-600" />
                <span>{sendMoneyError}</span>
              </p>
            )}

            {sendMoneySuccess && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 flex-none text-emerald-600" />
                <span>{sendMoneySuccess}</span>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSendMoneyClaim(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={sendMoneySubmitting}
                onClick={submitSendMoney}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {sendMoneySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authorize Payout'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Field Feedback Edits Modal */}
      {editsModalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Field Feedback &amp; Correction History</h3>
              <button onClick={() => setEditsModalClaim(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {editsModalClaim.field_feedback ? (
                Object.entries(editsModalClaim.field_feedback).map(([field, entry]) => (
                  <div key={field} className="rounded-lg border border-purple-100 bg-purple-50/50 p-3 text-xs space-y-1">
                    <span className="font-semibold text-purple-900 uppercase tracking-wider text-[10px] block">
                      Field: {field}
                    </span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Original Extracted:</span>
                        <span className="text-slate-700 line-through">{entry.original || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Corrected Value:</span>
                        <span className="font-semibold text-emerald-700">{entry.corrected || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No feedback entries recorded.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setEditsModalClaim(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Message & Document Request Modal */}
      {msgClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Request Documents from Submitter</h3>
                  <p className="text-[11px] text-slate-500">Claim ID: {msgClaim.id.slice(0, 8)}</p>
                </div>
              </div>
              <button onClick={() => setMsgClaim(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Send an official missing document clarification note to <span className="font-semibold text-slate-900">{getPatientName(msgClaim)}</span>:
            </p>

            <textarea
              rows={4}
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="e.g. Please provide discharge summary page 2 with doctor stamp, or itemized pharmacy bill breakdown..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
            />

            {msgError && (
              <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                <AlertTriangle className="h-4 w-4 flex-none text-rose-600" /> {msgError}
              </p>
            )}

            {msgSent && (
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 flex-none text-emerald-600" /> Request dispatched to submitter dashboard &amp; notification bell!
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setMsgClaim(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={msgSending || !msgText.trim()}
                onClick={sendMessage}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                {msgSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Request to Submitter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {auditor.showReportModal && <ClaimReportModal s={auditor} />}

      {/* Document Preview Modal */}
      {docPreviewModal.open && (
        <DocumentPreviewModal
          isOpen={docPreviewModal.open}
          onClose={() => setDocPreviewModal({ open: false, claimId: null, initialDocId: null, documents: [] })}
          claimId={docPreviewModal.claimId}
          initialDocId={docPreviewModal.initialDocId}
          documents={docPreviewModal.documents}
          patientName={docPreviewModal.patientName}
        />
      )}
    </div>
  );
}
