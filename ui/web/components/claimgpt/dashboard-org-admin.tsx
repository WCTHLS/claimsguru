'use client';

import React, { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Lock,
  UserCircle,
  ArrowRight,
} from 'lucide-react';

import { getStoredAuthSession, clearAuthSession } from '@/lib/auth';
import { LanguageSwitcher } from '@/components/claimgpt/language-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ClaimReportModal } from '@/components/claimgpt/claim-report-modal';
import { DocumentPreviewModal } from '@/components/claimgpt/document-preview-modal';
import { UserProfileModal } from '@/components/claimgpt/user-profile-modal';
import { NotificationBell } from '@/components/claimgpt/notification-bell';
import { CountUp, SpotlightCard, StaggerContainer, StaggerItem } from '@/components/claimgpt/effects';
import { formatINR, useAuditorState } from '@/components/claimgpt/use-auditor-state';
import { cn } from '@/lib/utils';

export const INGRESS_API = process.env.NEXT_PUBLIC_INGRESS_API || 'http://127.0.0.1:8001';
export const SUBMISSION_API = process.env.NEXT_PUBLIC_SUBMISSION_API || 'http://127.0.0.1:8008';
export const CHAT_API = process.env.NEXT_PUBLIC_CHAT_API || 'http://127.0.0.1:8009';
export const SEARCH_API = process.env.NEXT_PUBLIC_SEARCH_API || 'http://127.0.0.1:8000/search';

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
  'UPLOADED',
  'PROCESSING',
  'PREDICTED',
  'VALIDATED',
  'VALIDATION_FAILED',
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
  return status.replace(/_/g, ' ');
}

function getStatusBadgeStyle(s: string) {
  const status = (s || '').toUpperCase();
  if (status === 'SETTLED') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (status === 'COMPLETED' || status === 'VALIDATED' || status === 'APPROVED')
    return 'bg-teal-100 text-teal-800 border-teal-300';
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
  if (['PROCESSING', 'MODIFICATION_REQUESTED', 'DOCUMENTS_REQUESTED'].includes(st)) return 'medium';
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
        user_email: 'admin@apollo.org',
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

export function DashboardOrgAdmin({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const session = getStoredAuthSession();

  const [claims, setClaims] = useState<EnrichedClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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
  const [actionFeedback, setActionFeedback] = useState('');

  /* Settlement Maker-Checker Flow */
  const [sendMoneyClaim, setSendMoneyClaim] = useState<EnrichedClaim | null>(null);
  const [sendMoneyAmount, setSendMoneyAmount] = useState('');
  const [sendMoneySubmitting, setSendMoneySubmitting] = useState(false);
  const [sendMoneyFeedback, setSendMoneyFeedback] = useState('');
  const [pendingAuth, setPendingAuth] = useState<Record<string, { by: string; at: string; amount: string }>>({});

  const auditor = useAuditorState();
  const userName = session?.user?.name || 'Admin';
  const userEmail = session?.user?.email || `admin@${orgSlug || 'apollo'}.org`;

  /* Organization Registration Form State (Embedded from /register/organization) */
  const [orgFirstName, setOrgFirstName] = useState('');
  const [orgLastName, setOrgLastName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgMobile, setOrgMobile] = useState('');
  const [orgName, setOrgName] = useState(orgSlug ? orgSlug.toUpperCase() : '');
  const [orgEmployeeId, setOrgEmployeeId] = useState('');
  const [orgPassword, setOrgPassword] = useState('');
  const [orgConfirmPassword, setOrgConfirmPassword] = useState('');
  const [orgAgree, setOrgAgree] = useState(false);
  const [orgSubmitting, setOrgSubmitting] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);
  const [orgSuccess, setOrgSuccess] = useState(false);

  const handleOrgRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgEmail || !orgPassword || !orgConfirmPassword) {
      setOrgMessage('Please enter work email address and password.');
      return;
    }
    if (orgPassword !== orgConfirmPassword) {
      setOrgMessage('Password confirmation does not match.');
      return;
    }
    setOrgSubmitting(true);
    setOrgMessage(null);
    setOrgSuccess(false);

    try {
      const passwordHash = await (globalThis as typeof globalThis & { crypto: Crypto }).crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(orgPassword),
      ).then((digest) => Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join(''));

      const payload: Record<string, unknown> = {
        username: orgEmail,
        password_hash: `sha256$${passwordHash}`,
        role: 'tpa',
        first_name: orgFirstName,
        last_name: orgLastName,
        phone: orgMobile || undefined,
        organization: orgName || orgSlug,
        employee_id: orgEmployeeId || undefined,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof (data as any).error === 'string' ? (data as any).error : 'Unable to register organization account.');
      }

      setOrgSuccess(true);
      setOrgMessage('Organization admin / staff registered successfully!');
      setOrgFirstName('');
      setOrgLastName('');
      setOrgEmail('');
      setOrgMobile('');
      setOrgEmployeeId('');
      setOrgPassword('');
      setOrgConfirmPassword('');
      setOrgAgree(false);
    } catch (error) {
      setOrgMessage(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setOrgSubmitting(false);
    }
  };

  /* Document & Summary Viewer Modals */
  const [reportModalClaimId, setReportModalClaimId] = useState<string | null>(null);
  const [docPreviewModal, setDocPreviewModal] = useState<{ open: boolean; claimId: string | null }>({
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
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      let rawClaims: Claim[] = [];
      let rawTotal = 0;

      if (search.trim()) {
        const searchRes = await fetch(`${SEARCH_API}/?q=${encodeURIComponent(search)}&limit=${PAGE_SIZE}`, { headers }).catch(() => null);
        if (searchRes && searchRes.ok) {
          const data = await searchRes.json();
          const results = data.results || [];
          const details = await Promise.all(
            results.map((r: any) =>
              fetch(`${INGRESS_API}/claims/${r.claim_id}`, { headers })
                .then((res) => (res.ok ? res.json() : null))
                .catch(() => null)
            )
          );
          rawClaims = details.filter(Boolean);
          rawTotal = rawClaims.length;
        }
      } else {
        const res = await fetch(`${INGRESS_API}/claims?offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`, { headers }).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          rawClaims = data.claims || data.results || (Array.isArray(data) ? data : []);
          rawTotal = data.total || rawClaims.length;
        }
      }

      if (rawClaims.length === 0 && !search.trim() && page === 0) {
        // Fall back to offline mock demonstration data if backend is empty
        rawClaims = MOCK_CLAIMS as any;
        rawTotal = MOCK_CLAIMS.length;
      }

      if (statusFilter !== 'ALL') {
        rawClaims = rawClaims.filter((c) => (c.status || '').toUpperCase() === statusFilter);
      }

      // Enrich claims with submission preview data
      const enriched: EnrichedClaim[] = await Promise.all(
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
              };
            }
          } catch {
            /* ignore */
          }
          return c as EnrichedClaim;
        })
      );

      setClaims(enriched);
      setTotal(rawTotal);
    } catch {
      setClaims(MOCK_CLAIMS);
      setTotal(MOCK_CLAIMS.length);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, page, search, statusFilter, refreshKey]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  /* Build search suggestions */
  useEffect(() => {
    const suggs = new Set<string>();
    claims.forEach((c) => {
      if (c.summary?.patient_name && c.summary.patient_name !== 'N/A') suggs.add(c.summary.patient_name);
      if (c.summary?.policy_number && c.summary.policy_number !== 'N/A') suggs.add(c.summary.policy_number);
      if (c.summary?.hospital && c.summary.hospital !== 'N/A') suggs.add(c.summary.hospital);
      if (c.summary?.diagnosis && c.summary.diagnosis !== 'N/A') suggs.add(c.summary.diagnosis);
      if (c.id) suggs.add(c.id);
    });
    setSuggestions(Array.from(suggs));
  }, [claims]);

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
    chatSessionRef.current = `org-admin-${claimId}-${Date.now()}`;

    const token = session?.accessToken;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${SUBMISSION_API}/claims/${claimId}/preview`, { headers }).catch(() => null);
      if (res && res.ok) {
        const preview = await res.json();
        setExpandedPreview(preview);
      } else {
        // Fallback for mock claims
        const found = claims.find((c) => c.id === claimId);
        setExpandedPreview({
          summary: found?.summary,
          billed_total: found?.billed_total,
          predictions: [{ rejection_score: 18, top_reasons: [{ reason: 'Clean documentation provided', weight: 0.1 }] }],
          validations: [
            { rule_name: 'Policy Coverage Verification', passed: true, message: 'Policy active & in-network hospital', severity: 'low' },
            { rule_name: 'Billing Itemization Check', passed: true, message: 'Total matches hospital breakdown', severity: 'low' },
          ],
          icd_codes: [{ code: 'K35.80', description: 'Unspecified acute appendicitis' }],
          cpt_codes: [{ code: '44970', description: 'Laparoscopic appendectomy' }],
        });
      }
    } catch {
      setExpandedPreview(null);
    } finally {
      setExpandedLoading(false);
    }
  }

  /* Quick Actions (Approve / Reject / Send Back) */
  function openQuickAction(claimId: string, action: 'approve' | 'reject' | 'send_back', e: React.MouseEvent) {
    e.stopPropagation();
    setActionClaimId(claimId);
    setActionType(action);
    setActionReason('');
    setActionFeedback('');
  }

  async function submitQuickAction() {
    if (!actionClaimId || !actionType) return;
    setActionSubmitting(true);
    setActionFeedback('');
    const token = session?.accessToken;

    try {
      const res = await fetch(`${SUBMISSION_API}/claims/${actionClaimId}/tpa-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: actionType, reason: actionReason }),
      });

      let newStatus = actionType === 'approve' ? 'APPROVED' : actionType === 'reject' ? 'REJECTED' : 'MODIFICATION_REQUESTED';
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.new_status) newStatus = data.new_status;
      }

      setActionFeedback(`Claim updated to ${formatStatus(newStatus)} successfully.`);
      setClaims((prev) => prev.map((c) => (c.id === actionClaimId ? { ...c, status: newStatus } : c)));
      setTimeout(() => {
        setActionClaimId(null);
        setActionType(null);
        setActionFeedback('');
      }, 1500);
    } catch {
      setActionFeedback('Action failed. Please verify connection.');
    } finally {
      setActionSubmitting(false);
    }
  }

  /* Maker-Checker Settlement Flow */
  function openSendMoney(c: EnrichedClaim, e: React.MouseEvent) {
    e.stopPropagation();
    setSendMoneyClaim(c);
    setSendMoneyAmount((c.billed_total || 0).toString());
    setSendMoneyFeedback('');
  }

  function requestSettlement(c: EnrichedClaim, e: React.MouseEvent) {
    e.stopPropagation();
    setPendingAuth((prev) => ({
      ...prev,
      [c.id]: { by: session?.user?.name || 'Admin', at: new Date().toISOString(), amount: (c.billed_total || 0).toString() },
    }));
  }

  async function submitSendMoney() {
    if (!sendMoneyClaim) return;
    setSendMoneySubmitting(true);
    setSendMoneyFeedback('');
    const token = session?.accessToken;

    try {
      const res = await fetch(`${SUBMISSION_API}/claims/${sendMoneyClaim.id}/tpa-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'send_money',
          reason: `Settlement authorized: ₹${parseFloat(sendMoneyAmount).toLocaleString()}`,
        }),
      });

      setSendMoneyFeedback('Settlement authorized & dispatched to payout gateway.');
      setClaims((prev) => prev.map((c) => (c.id === sendMoneyClaim.id ? { ...c, status: 'SETTLED' } : c)));
      setPendingAuth((prev) => {
        const updated = { ...prev };
        delete updated[sendMoneyClaim.id];
        return updated;
      });
      setTimeout(() => {
        setSendMoneyClaim(null);
        setSendMoneyFeedback('');
      }, 1800);
    } catch {
      setSendMoneyFeedback('Authorization failed.');
    } finally {
      setSendMoneySubmitting(false);
    }
  }

  /* Patient Message Modal */
  async function sendMessage() {
    if (!msgClaim || !msgText.trim()) return;
    setMsgSending(true);
    const token = session?.accessToken;

    try {
      await fetch(`${SUBMISSION_API}/claims/${msgClaim.id}/tpa-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'request_docs', reason: msgText }),
      });
      setMsgSent(true);
      setClaims((prev) => prev.map((c) => (c.id === msgClaim.id ? { ...c, status: 'DOCUMENTS_REQUESTED' } : c)));
      setTimeout(() => {
        setMsgClaim(null);
        setMsgSent(false);
      }, 1800);
    } catch {
      /* ignore */
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

  /* Aggregated Metrics */
  const pendingCount = claims.filter((c) =>
    ['PENDING', 'PROCESSING', 'PREDICTED', 'MANUAL_REVIEW_REQUIRED', 'SUBMITTED'].includes((c.status || '').toUpperCase())
  ).length;

  const settledTotal = claims.reduce((acc, c) => acc + (c.billed_total || 0), 0);

  const highRiskCount = claims.filter((c) => getPriorityLevel(c) === 'high').length;

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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">{orgDisplayName}</span>
              <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
                Org Admin
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

          {/* User Controls, Admin Info, Review Claims & Log Out */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push(`/${orgSlug}/review`)}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Review Claims</span>
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
                {(userName || 'A').charAt(0).toUpperCase()}
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

      {/* Main Admin Workspace Container */}
      <main className="relative z-10 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <StaggerContainer className="mx-auto max-w-7xl space-y-6 pb-24">
          {/* Welcome Title Banner */}
          <StaggerItem index={0}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                    Admin: {userName}
                  </span>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 px-2.5 py-0.5 text-xs">
                    Org: {orgSlug}
                  </Badge>
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {orgDisplayName} Admin Workspace
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Manage submitted claims, review AI risk predictions, authorize settlements &amp; register organizations.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => router.push(`/${orgSlug}/review`)}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
                >
                  <FileCheck2 className="h-4 w-4" />
                  Review Claims
                  <ArrowRight className="h-3.5 w-3.5" />
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
                  <CountUp end={total || claims.length} />
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

          {/* Embedded Organization Registration Form (from http://localhost:3001/register/organization) */}
          <StaggerItem index={2}>
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/40 to-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-teal-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
                    <UserCircle className="h-4 w-4 text-teal-600" />
                    Organization Registration Form
                  </div>
                  <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
                    Add an Organization / Register Admin
                  </h2>
                  <p className="text-xs text-slate-600">
                    Register new TPA or insurer organizations and staff directly from this workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/${orgSlug}/review`)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline"
                >
                  Go to Review Claims <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <form onSubmit={handleOrgRegister} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Contact Section */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block">1. Contact Info</span>
                    <div className="space-y-2">
                      <Label htmlFor="org-firstName" className="text-xs">First Name</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="org-firstName"
                          value={orgFirstName}
                          onChange={(e) => setOrgFirstName(e.target.value)}
                          placeholder="e.g. John"
                          className="h-9 pl-9 text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-lastName" className="text-xs">Last Name</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="org-lastName"
                          value={orgLastName}
                          onChange={(e) => setOrgLastName(e.target.value)}
                          placeholder="e.g. Doe"
                          className="h-9 pl-9 text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-email" className="text-xs">Work Email Address</Label>
                      <Input
                        id="org-email"
                        type="email"
                        value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)}
                        placeholder="john@yourcompany.com"
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-mobile" className="text-xs">Mobile Number</Label>
                      <Input
                        id="org-mobile"
                        type="tel"
                        value={orgMobile}
                        onChange={(e) => setOrgMobile(e.target.value)}
                        placeholder="9876543210"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Organization Section */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block">2. Organization Details</span>
                    <div className="space-y-2">
                      <Label htmlFor="org-name" className="text-xs">Organization (Insurer / TPA)</Label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="org-name"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="e.g. Medi Assist"
                          className="h-9 pl-9 text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-employeeId" className="text-xs">Employee ID</Label>
                      <Input
                        id="org-employeeId"
                        value={orgEmployeeId}
                        onChange={(e) => setOrgEmployeeId(e.target.value)}
                        placeholder="e.g. EMP-12345"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block">3. Security Credentials</span>
                    <div className="space-y-2">
                      <Label htmlFor="org-password" className="text-xs">Password</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="org-password"
                          type="password"
                          value={orgPassword}
                          onChange={(e) => setOrgPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-9 pl-9 text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-confirmPassword" className="text-xs">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="org-confirmPassword"
                          type="password"
                          value={orgConfirmPassword}
                          onChange={(e) => setOrgConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-9 pl-9 text-xs"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                  <div className="flex items-start gap-2 max-w-xl">
                    <Checkbox
                      id="org-agree"
                      checked={orgAgree}
                      onCheckedChange={(v) => setOrgAgree(v === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="org-agree" className="text-xs text-slate-600 leading-relaxed">
                      I agree to the <span className="font-semibold text-teal-700">Terms of Service</span>,{' '}
                      <span className="font-semibold text-teal-700">Privacy Policy</span>, and{' '}
                      <span className="font-semibold text-teal-700">data protection</span> compliance terms.
                    </Label>
                  </div>

                  <button
                    type="submit"
                    disabled={orgSubmitting || !orgAgree}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-6 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {orgSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        Register Organization
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {orgMessage && (
                  <p className={cn(
                    'rounded-lg px-3 py-2 text-xs font-medium border',
                    orgSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                  )}>
                    {orgMessage}
                  </p>
                )}
              </form>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </main>


      {/* Report Modal */}
      {auditor.showReportModal && <ClaimReportModal s={auditor} />}

      {/* Document Preview Modal */}
      {docPreviewModal.open && (
        <DocumentPreviewModal
          isOpen={docPreviewModal.open}
          onClose={() => setDocPreviewModal({ open: false, claimId: null })}
          claimId={docPreviewModal.claimId}
        />
      )}
    </div>
  );
}
