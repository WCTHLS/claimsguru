'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import fullLogo from './ClaimsGuru Black PNG.png';

import {
  AlertTriangle,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Folder,
  Image as ImageIcon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
  Menu,
  Loader2,
  RotateCcw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/claimgpt/language-switcher';
import { DuplicateClaimModal } from '@/components/claimgpt/duplicate-modal';
import { IdentityMismatchModal } from '@/components/claimgpt/identity-mismatch-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DocumentViewer } from '@/components/claimgpt/document-viewer';
import { ClaimReportModal } from '@/components/claimgpt/claim-report-modal';
import { DocumentPreviewModal } from '@/components/claimgpt/document-preview-modal';
import { UserProfileModal } from '@/components/claimgpt/user-profile-modal';
import { NotificationBell } from '@/components/claimgpt/notification-bell';
import { UserAvatar } from '@/components/claimgpt/user-avatar';
import {
  LINE_ITEMS,
  PIPELINE,
  formatINR,
  useAuditorState,
} from '@/components/claimgpt/use-auditor-state';
import { PIPELINE_ACTIVE_STATUSES } from '@/lib/api-client';
import {
  CountUp,
  MagneticButton,
  SpotlightCard,
  StaggerContainer,
  StaggerItem,
} from '@/components/claimgpt/effects';
import { cn } from '@/lib/utils';
import { formatClaimTime, formatClaimAge, formatClaimExactDateTime } from '@/lib/claimgpt-data';

export function DashboardClinical() {
  const s = useAuditorState();
  const [claimToDelete, setClaimToDelete] = useState<{ id: string; name: string } | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ claimId: string; docId: string; docName: string } | null>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const appendFileInputRef = useRef<HTMLInputElement>(null);
  const targetAppendClaimRef = useRef<string | null>(null);
  const [copiedClaimId, setCopiedClaimId] = useState<string | null>(null);
  const mobileClaimsCarouselRef = useRef<HTMLDivElement>(null);
  const scrollMobileClaims = (direction: 'left' | 'right') => {
    if (mobileClaimsCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      mobileClaimsCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCopyClaimId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopiedClaimId(id);
      setTimeout(() => setCopiedClaimId(null), 2000);
    }).catch(() => {});
  };

  const handleAppendRequestedDocClick = (targetClaimId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    targetAppendClaimRef.current = targetClaimId;
    s.selectClaim(targetClaimId);
    if (appendFileInputRef.current) {
      appendFileInputRef.current.value = '';
      appendFileInputRef.current.click();
    }
  };

  const handleAppendFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0 && targetAppendClaimRef.current) {
      const claimIdToAppend = targetAppendClaimRef.current;
      s.startClaimAnalysis(selectedFiles, true, claimIdToAppend);
    }
  };

  // Merge currently active processing claim into the list if not already present
  const allClaims = useMemo(() => {
    const list = [...s.recentClaims];
    if (s.claimId && !list.some((c) => c.id === s.claimId)) {
      list.unshift({
        id: s.claimId,
        patient_name: s.patientName || (s.analyzing ? "Processing..." : "Active Claim"),
        status: s.analyzing ? (s.activeStage === "ocr" ? "UPLOADED" : "PARSING") : "COMPLETED",
        created_at: new Date().toISOString(),
        total_amount: "",
        documents: s.files.map((f, i) => ({ id: `doc-${i}`, file_name: f.name })),
        progress: {
          percentage: s.progress,
          step: s.stepDescription,
          is_complete: s.progress >= 100,
        },
      } as any);
    }
    return list;
  }, [s.recentClaims, s.claimId, s.patientName, s.analyzing, s.activeStage, s.progress, s.stepDescription, s.files]);

  const filteredClaims = allClaims.filter((claim) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const rawId = (claim.id || "").toLowerCase();
    const shortId = rawId.replace(/-/g, "");
    const patientName = (claim.patient_name || "").toLowerCase();
    const hospitalName = (claim.hospital_name || "").toLowerCase();
    const diagnosis = (claim.diagnosis || "").toLowerCase();
    const policyId = (claim.policy_id || "").toLowerCase();
    const patientId = (claim.patient_id || "").toLowerCase();
    const docNames = (claim.documents || []).map((d: any) => (d.file_name || d.display_title || "").toLowerCase()).join(" ");

    return (
      rawId.includes(q) ||
      shortId.includes(q) ||
      patientName.includes(q) ||
      hospitalName.includes(q) ||
      diagnosis.includes(q) ||
      policyId.includes(q) ||
      patientId.includes(q) ||
      docNames.includes(q)
    );
  });

  const processingInList = s.recentClaims.filter((c) => {
    const st = (c.status || "").toUpperCase();
    return st === "PENDING" || st === "PROCESSING" || st === "IN_PROGRESS" || st === "QUEUED" || st === "UPLOADING";
  });

  const isCurrentClaimProcessing = (s.progress > 0 && s.progress < 100) || s.uploading || s.analyzing;
  const currentInList = processingInList.some((c) => c.id === s.claimId);

  const activeQueueCount = processingInList.length + (isCurrentClaimProcessing && !currentInList ? 1 : 0);

  const hasActiveClaim = Boolean(
    s.claimId ||
    s.realPreview ||
    s.recentClaims.length > 0 ||
    s.analyzing ||
    s.isLiveSessionCompleted
  );

  const isUploadOpenEffective = s.isUploadOpen;

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-clip bg-slate-100/80 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img src={fullLogo.src} className="h-7 sm:h-8 w-auto flex-none" alt="ClaimsGuru Logo" />
            <span className="hidden sm:inline-block rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 whitespace-nowrap flex-none">
              Self-Service Portal
            </span>
          </div>
          <div className="relative ml-4 hidden flex-1 max-w-md md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              placeholder="Search claims, hospital bills, ICD-10 codes…"
              className="h-10 border-slate-200 bg-slate-50 pl-10 pr-9 text-sm focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-teal-500 rounded-xl transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Quick Match Results Dropdown when focused & typing */}
            {isSearchFocused && searchQuery.trim() && (
              <div 
                className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Claims ({filteredClaims.length})</span>
                  {filteredClaims.length > 0 && <span className="text-[10px] text-teal-600 font-normal">Click to audit</span>}
                </div>
                {filteredClaims.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No claims found for &ldquo;<span className="font-semibold text-slate-700">{searchQuery}</span>&rdquo;
                  </div>
                ) : (
                  filteredClaims.map((c) => {
                    const cShortId = (c.id || "").replace(/-/g, "").slice(-8).toUpperCase();
                    const isSelected = c.id === s.claimId;
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          s.selectClaim(c.id);
                          setIsSearchFocused(false);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors",
                          isSelected ? "bg-teal-50 text-teal-900 border border-teal-200" : "hover:bg-slate-100 text-slate-800"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-semibold truncate">
                            <span>{c.patient_name || `Claim #${cShortId}`}</span>
                            <span className="text-[10px] font-mono text-slate-400">#{cShortId}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {c.documents?.[0]?.file_name || c.hospital_name || c.diagnosis || "Medical Claim Document"}
                          </div>
                        </div>
                        <div className="flex-none flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatClaimTime(c.created_at)}</span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase max-w-[140px] truncate",
                              c.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : (c.status || "").toUpperCase() === "SUBMITTED"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-blue-100 text-blue-800"
                            )}
                            title={
                              (c.status || "").toUpperCase() === "SUBMITTED"
                                ? (c.insurance_company || c.payer ? `Submitted to ${c.insurance_company || c.payer}` : "SUBMITTED")
                                : c.status || "COMPLETED"
                            }
                          >
                            {(c.status || "").toUpperCase() === "SUBMITTED"
                              ? (c.insurance_company || c.payer ? `Submitted to ${c.insurance_company || c.payer}` : "SUBMITTED")
                              : (c.status || "COMPLETED")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-600" />
              </span>
              Processing Queue: <CountUp end={activeQueueCount} />
            </span>
            <LanguageSwitcher variant="light" />
            <NotificationBell variant="clinical" />
            <button
              type="button"
              onClick={s.openProfileModal}
              title={`${s.userName} (${s.userEmail})`}
              className="cursor-pointer hover:scale-105 transition-transform rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="User Profile"
            >
              <UserAvatar name={s.userName} size="md" />
            </button>
          </div>
        </div>
        {/* Mobile Search Bar Drawer */}
        {showMobileSearch && (
          <div className="md:hidden border-t border-border bg-white px-3 py-2.5 shadow-sm animate-slide-down">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search claims, hospital bills, ICD-10 codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-8 text-xs bg-slate-50 border-slate-200"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <StaggerContainer className="mx-auto max-w-7xl space-y-6 pb-24">
          <StaggerItem index={0}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Patient Claim Reimbursement Portal</h1>
                <p className="mt-1 text-sm text-slate-600">Upload hospital bills, discharge summaries &amp; diagnostic reports for AI-powered verification &amp; settlement.</p>
              </div>
            </div>
          </StaggerItem>

          {/* Responsive Desktop & Mobile Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:items-start">

            {/* Desktop Left Sidebar: Processed Claims History */}
            <StaggerItem index={1} className="hidden lg:block lg:col-span-1">
              <div id="processed-claims-section" className="rounded-2xl border border-border bg-white p-4 shadow-elevation-sm min-h-[435px]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Processed Claims</h3>
                      <p className="text-[10px] text-muted-foreground">Select claim to audit</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-[10px] text-teal-600 hover:text-teal-800 font-semibold cursor-pointer underline mr-0.5"
                      >
                        Clear
                      </button>
                    )}
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                      {searchQuery.trim() ? `${filteredClaims.length}/${allClaims.length}` : allClaims.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[720px] pr-1 scrollbar-thin">
                  {filteredClaims.length === 0 ? (
                    searchQuery.trim() && s.recentClaims.length > 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-50/80 p-5 text-center my-1">
                        <p className="text-xs font-bold text-slate-700">No Matching Claims</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[150px] leading-tight">
                          No claims match &ldquo;{searchQuery}&rdquo;.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-[11px] font-semibold text-teal-600 hover:text-teal-700 underline cursor-pointer"
                        >
                          Clear Filter
                        </button>
                      </div>
                    ) : s.claimId ? (
                      <button
                        type="button"
                        onClick={() => s.selectClaim(s.claimId || "")}
                        className="w-full rounded-xl border border-accent bg-accent/10 p-3 text-left shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold truncate text-foreground">{s.patientName || "Active Patient"}</p>
                          <span className="flex h-2 w-2 rounded-full bg-emerald-500 flex-none" />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          ID: {s.claimId.slice(0, 8)}...
                        </p>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-50/80 p-5 text-center my-1">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-500 mb-2">
                          <FileText className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">No Claims Found</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[150px] leading-tight">
                          Upload your claim documents to start AI verification.
                        </p>
                      </div>
                    )
                  ) : (
                    filteredClaims.map((claim) => {
                      const isSelected = claim.id === s.claimId;
                      const docs = (claim.documents && claim.documents.length > 0)
                        ? claim.documents
                        : (isSelected && s.analyzing && s.files.length > 0 ? s.files.map((f, i) => ({ id: `f-${i}`, file_name: f.name })) : []);
                      const liveProgress = (s as any).claimProgressMap?.[claim.id] || claim.progress;
                      const rawStatus = (claim.status || "").toUpperCase();
                      const isStalledClaim = (isSelected && s.isStalled) || liveProgress?.status === "STALLED" || rawStatus === "STALLED";
                      const shortId = (claim.id || "").replace(/-/g, "").slice(-8).toUpperCase();
                      const cachedClaimStatus = (typeof window !== "undefined" ? localStorage.getItem(`claimgpt_claim_status_${claim.id}`) : null)?.toUpperCase();
                      const previewStatus = (isSelected && (s.realPreview as any)?.status) ? (s.realPreview as any).status.toUpperCase() : null;
                      const TERMINAL_STATUSES = new Set(["SETTLED", "APPROVED", "REJECTED"]);

                      const effectiveClaimStatus = (
                        previewStatus ||
                        (cachedClaimStatus && TERMINAL_STATUSES.has(cachedClaimStatus) ? cachedClaimStatus : null) ||
                        claim.status ||
                        ""
                      ).toUpperCase();
                      const hasDocsRequested = (
                        (isSelected && s.isDocumentsRequested) ||
                        effectiveClaimStatus === "DOCUMENTS_REQUESTED" ||
                        Boolean((claim as any).has_action_request) ||
                        Boolean((claim as any).tpa_requested_docs?.length)
                      );
                      const isCompletedStatus = rawStatus === "COMPLETED" || rawStatus === "VALIDATED" || rawStatus === "FINISHED" || rawStatus === "APPROVED" || rawStatus === "SETTLED" || rawStatus === "REJECTED" || rawStatus === "IDENTITY_MISMATCH" || rawStatus === "DOCUMENTS_UPLOADED" || rawStatus === "SUBMITTED" || hasDocsRequested;
                      const isLiveActive = Boolean(
                        !isStalledClaim &&
                        !hasDocsRequested &&
                        liveProgress &&
                        !liveProgress.is_complete &&
                        typeof liveProgress.percentage === "number" &&
                        liveProgress.percentage > 0 &&
                        liveProgress.percentage < 100 &&
                        (liveProgress.status === "RUNNING" || (!isCompletedStatus && PIPELINE_ACTIVE_STATUSES.has(rawStatus)))
                      );
                      const isClaimProcessing = !hasDocsRequested && ((isSelected && s.analyzing && s.progress < 100) || (!isCompletedStatus && isLiveActive)) && !isStalledClaim;
                      const isDocFile = (val?: string | null) => Boolean(val && /\.(pdf|png|jpe?g|tiff?|docx?)$/i.test(val.trim()));
                      const hasRealPatientName = Boolean(claim.patient_name && claim.patient_name !== "N/A" && claim.patient_name !== "Processing..." && !isDocFile(claim.patient_name));
                      const claimName = hasRealPatientName
                        ? claim.patient_name
                        : (claim.status || "").toUpperCase() === "UPLOADED" || isClaimProcessing
                          ? "Processing..."
                          : `Claim #${claim.id.slice(0, 6)}`;

                      const currentProgress = (isSelected && s.analyzing)
                        ? s.progress
                        : (liveProgress?.percentage ?? 0);

                      const currentStep = (isSelected && s.analyzing)
                        ? (s.stepDescription || liveProgress?.step || `Processing - ${currentProgress}%`)
                        : (liveProgress?.step || (currentProgress > 0 ? `Processing - ${currentProgress}%` : ""));

                      const stageBadgeText = () => {
                        if (isSelected && s.analyzing) {
                          if (s.activeStage === 'coding') return 'Coding';
                          if (s.activeStage === 'scoring') return 'Scoring';
                          if (s.activeStage === 'parsing') return 'Parsing';
                          return 'OCR';
                        }
                        const p = currentProgress;
                        if (p < 50) return 'OCR';
                        if (p < 75) return 'Parsing';
                        if (p < 85) return 'Coding';
                        return 'Scoring';
                      };
                      const resolvedInsurer = (
                        claim.insurance_company ||
                        claim.payer ||
                        (typeof window !== "undefined" ? localStorage.getItem(`claimgpt_submitted_payer_${claim.id}`) : null) ||
                        (isSelected && ((s.realPreview as any)?.insurance_company || (s.realPreview as any)?.payer)) ||
                        ""
                      ).trim();
                      const submittedBadgeText = resolvedInsurer
                        ? `Submitted to ${resolvedInsurer}`
                        : "Submitted";

                      const isCleanPolVal = (v: any) => Boolean(
                        v && typeof v === 'string' && v.trim().length >= 3 &&
                        v.toUpperCase() !== 'N/A' && v.toLowerCase() !== 'null' &&
                        v !== 'Star Health' && v !== 'Pending Insurer Selection'
                      );
                      const claimPol = (claim as any).policy_number || (claim as any).policy_id || (isSelected && ((s.realPreview?.parsed_fields as any)?.policy_number || (s.realPreview as any)?.policy_id)) || "";
                      const claimIns = claim.insurance_company || claim.payer || (isSelected && ((s.realPreview as any)?.insurance_company || (s.realPreview as any)?.payer)) || "";
                      const claimDocs = claim.documents || (isSelected ? s.realPreview?.documents : []) || [];
                      const hasPolicyDocInFiles = claimDocs.some((d: any) => {
                        const t = (d.doc_type || d.type || d.name || d.display_title || '').toLowerCase();
                        return t.includes('policy') || t.includes('insurance') || t.includes('health_card');
                      });
                      const claimHasValidPolicy = Boolean(
                        (claimPol && isCleanPolVal(claimPol)) ||
                        (claimIns && isCleanPolVal(claimIns)) ||
                        hasPolicyDocInFiles
                      );
                      const isTerminalClaim = ["SETTLED", "APPROVED", "REJECTED"].includes(effectiveClaimStatus);
                      const claimMissingPolicy = !isClaimProcessing && !isTerminalClaim && !hasDocsRequested && !claimHasValidPolicy;

                      return (
                        <div
                          key={claim.id}
                          onClick={() => s.selectClaim(claim.id)}
                          className={cn(
                            "w-full rounded-2xl border p-3.5 text-left transition-all tap-highlight-none space-y-2 cursor-pointer",
                            isSelected
                              ? "border-blue-400 bg-white shadow-md ring-1 ring-blue-300"
                              : "border-slate-200 bg-white/80 hover:bg-white shadow-2xs"
                          )}
                        >
                          {/* Top Row: Short ID & 1-Click Copy on Left, Delete Trash on Right */}
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={(e) => handleCopyClaimId(claim.id, e)}
                              className="inline-flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold px-1.5 py-0.5 text-[9px] border border-blue-200 transition-colors cursor-pointer flex-none"
                              title={`Full Claim ID: ${claim.id}\n(Click to copy)`}
                            >
                              <span>#{shortId || "CLM001"}</span>
                              {copiedClaimId === claim.id ? (
                                <Check className="h-2.5 w-2.5 text-emerald-600 flex-none" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 opacity-50 hover:opacity-100 flex-none" />
                              )}
                            </button>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setClaimToDelete({ id: claim.id, name: claimName });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  setClaimToDelete({ id: claim.id, name: claimName });
                                }
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex-none ml-auto"
                              title="Delete claim"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </span>
                          </div>

                          {/* Status Badge Row */}
                          <div className="flex items-center">
                            {isStalledClaim ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold px-2 py-0.5 text-[9px]">
                                ⏸️ Stalled
                              </span>
                            ) : isClaimProcessing ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold px-2 py-0.5 text-[9px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                {stageBadgeText()}
                              </span>
                            ) : hasDocsRequested ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[9px] border border-amber-300 animate-pulse">
                                ⚠️ Docs Req
                              </span>
                            ) : effectiveClaimStatus === "MODIFICATION_REQUESTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[9px] border border-amber-300">
                                ⚠️ Info Req
                              </span>
                            ) : effectiveClaimStatus === "APPROVED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] text-[#047857] font-bold px-2 py-0.5 text-[9px] border border-[#A7F3D0]">
                                ✓ Approved
                              </span>
                            ) : effectiveClaimStatus === "SETTLED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] text-[#047857] font-bold px-2 py-0.5 text-[9px] border border-[#A7F3D0]">
                                💎 Settled
                              </span>
                            ) : effectiveClaimStatus === "REJECTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 font-bold px-2 py-0.5 text-[9px] border border-rose-300">
                                ✕ Rejected
                              </span>
                            ) : effectiveClaimStatus === "DOCUMENTS_UPLOADED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 font-bold px-2 py-0.5 text-[9px] border border-purple-300">
                                📄 Docs Uploaded
                              </span>
                            ) : effectiveClaimStatus === "SUBMITTED" ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 font-bold px-2 py-0.5 text-[10px] border border-sky-300 max-w-full"
                                title={submittedBadgeText}
                              >
                                <span className="flex-none">📤</span>
                                <span className="truncate">{submittedBadgeText}</span>
                              </span>
                            ) : claimMissingPolicy ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 text-[9px] border border-amber-200" title="Medical bills audited • Policy schedule required for TPA submission">
                                ⚠️ Policy Needed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] text-[#047857] font-semibold px-2 py-0.5 text-[9px] border border-[#A7F3D0]">
                                ✓ Audit Ready
                              </span>
                            )}
                          </div>

                          {/* Person / Policy Info & Age */}
                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-medium">
                            <span className="truncate">👤 {hasRealPatientName ? claim.patient_name : (isClaimProcessing ? "Processing..." : "Patient")}</span>
                            <span
                              className="text-[10px] text-slate-400 whitespace-nowrap flex-none font-medium"
                              title={formatClaimTime(claim.created_at)}
                            >
                              {formatClaimAge(claim.created_at)}
                            </span>
                          </div>

                          {/* Group Name Header */}
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 pt-0.5">
                            <FileText className="h-3.5 w-3.5 text-slate-400 flex-none" />
                            <span className="truncate">{hasRealPatientName ? `${claim.patient_name}'s - ${docs.length} document${docs.length !== 1 ? "s" : ""}` : (isClaimProcessing ? `Processing - ${docs.length} document${docs.length !== 1 ? "s" : ""}` : `Claim #${shortId || claim.id.slice(0, 6)} - ${docs.length} document${docs.length !== 1 ? "s" : ""}`)}</span>
                          </div>

                          {/* Document Rows */}
                          {docs.length > 0 && (
                            <div className="space-y-1">
                              {docs.map((d: any) => (
                                <div
                                  key={d.id || d.file_name}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {d.file_name.endsWith('.pdf') ? (
                                      <FileText className="h-3 w-3 text-red-500 flex-none" />
                                    ) : (
                                      <ImageIcon className="h-3 w-3 text-teal-600 flex-none" />
                                    )}
                                    <span className="truncate max-w-[130px]">{d.file_name}</span>
                                  </div>
                                  <button
                                    type="button"
                                    title={`Remove ${d.file_name}`}
                                    aria-label={`Remove ${d.file_name}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDocToDelete({ claimId: claim.id, docId: d.id || d.file_name, docName: d.file_name });
                                    }}
                                    className="flex items-center justify-center h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md text-xs flex-none ml-1 cursor-pointer transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Live Processing Bar */}
                          {isClaimProcessing && (
                            <div className="space-y-1.5 pt-1">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(currentProgress, 10)}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-slate-600 font-normal truncate">
                                {currentStep}
                              </p>
                            </div>
                          )}

                          {/* Documents Requested Action Box */}
                          {hasDocsRequested && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-2 text-[10px] text-amber-900 space-y-1">
                              <p className="font-semibold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-600 flex-none" />
                                <span>Insurer requested missing documents</span>
                              </p>
                              <button
                                type="button"
                                onClick={(e) => handleAppendRequestedDocClick(claim.id, e)}
                                className="w-full text-center rounded bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-2 text-[10px] shadow-xs cursor-pointer transition-colors"
                              >
                                + Upload Requested Document
                              </button>
                            </div>
                          )}

                          {/* Missing Policy Document Action Box */}
                          {claimMissingPolicy && !hasDocsRequested && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-[10px] text-amber-900 space-y-1">
                              <p className="font-semibold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-600 flex-none" />
                                <span>Policy schedule required for submission</span>
                              </p>
                              <button
                                type="button"
                                onClick={(e) => handleAppendRequestedDocClick(claim.id, e)}
                                className="w-full text-center rounded bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-2 text-[10px] shadow-xs cursor-pointer transition-colors"
                              >
                                + Upload Policy Document
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Hidden File Input for Appending Documents to an Existing Claim */}
                <input
                  ref={appendFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleAppendFileSelected}
                  className="hidden"
                  id="append-doc-upload"
                />
              </div>
            </StaggerItem>

            {/* Right Main Content Area */}
            <div className="space-y-6 lg:col-span-3">

              {/* Prominent Action Required Banner if ANY claim has requested documents */}
              {(() => {
                const actionClaims = s.recentClaims.filter(c => 
                  (c.status || '').toUpperCase() === 'DOCUMENTS_REQUESTED' ||
                  Boolean((c as any).has_action_request) ||
                  Boolean((c as any).tpa_requested_docs?.length)
                );
                if (actionClaims.length === 0) return null;
                const topAction = actionClaims[0];
                return (
                  <StaggerItem index={1}>
                    <div className="rounded-xl sm:rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-50/80 to-white p-3 sm:p-4 shadow-elevation-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 flex-none items-center justify-center rounded-lg sm:rounded-xl bg-amber-100 text-amber-700 border border-amber-300 mt-0.5 sm:mt-0">
                            <AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5 animate-pulse" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-bold text-amber-950 truncate">
                                Action Required: Missing Document Request
                              </h3>
                              <span className="rounded-full bg-amber-200/80 border border-amber-300 px-2 py-0.2 text-[9px] sm:text-[10px] font-bold text-amber-900">
                                {actionClaims.length} Claim{actionClaims.length > 1 ? 's' : ''} Pending Action
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-amber-900/90 mt-0.5 font-medium line-clamp-2 sm:line-clamp-none">
                              <strong>{topAction.patient_name || 'Claim'}</strong>: {topAction.tpa_message || 'The insurance reviewer requested additional supporting documents before this claim can be approved.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-stretch sm:self-center flex-none">
                          <Button
                            size="sm"
                            onClick={() => s.selectClaim(topAction.id)}
                            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] sm:text-xs h-7 sm:h-8 px-3 sm:px-3.5 rounded-lg shadow-sm cursor-pointer"
                          >
                            Open Claim &amp; Upload Proofs →
                          </Button>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })()}

              {/* Prominent Action Required Banner if policy document is missing on the active selected claim */}
              {(() => {
                const actionClaims = s.recentClaims.filter(c => 
                  (c.status || '').toUpperCase() === 'DOCUMENTS_REQUESTED' ||
                  Boolean((c as any).has_action_request) ||
                  Boolean((c as any).tpa_requested_docs?.length)
                );
                if (actionClaims.length > 0) return null;

                const activeClaim = s.recentClaims?.find((c: any) => c.id === s.claimId) || s.recentClaims[0];
                if (!activeClaim) return null;

                const isCleanPolVal = (v: any) => Boolean(
                  v && typeof v === 'string' && v.trim().length >= 3 &&
                  v.toUpperCase() !== 'N/A' && v.toLowerCase() !== 'null' &&
                  v !== 'Star Health' && v !== 'Pending Insurer Selection'
                );

                const cPol = (activeClaim as any).policy_number || (activeClaim as any).policy_id || (s.realPreview?.parsed_fields as any)?.policy_number || '';
                const cIns = activeClaim.insurance_company || activeClaim.payer || (s.realPreview as any)?.insurance_company || '';
                const cDocs = activeClaim.documents || s.realPreview?.documents || [];
                const hasPolDoc = cDocs.some((d: any) => {
                  const t = (d.doc_type || d.type || d.name || d.display_title || '').toLowerCase();
                  return t.includes('policy') || t.includes('insurance') || t.includes('health_card');
                });
                const hasValidPol = Boolean((cPol && isCleanPolVal(cPol)) || (cIns && isCleanPolVal(cIns)) || hasPolDoc);
                const isTerm = ["SETTLED", "REJECTED", "APPROVED"].includes((activeClaim.status || '').toUpperCase());
                const isProc = s.analyzing && s.progress < 100;

                if (hasValidPol || isTerm || isProc || s.isDocumentsRequested) return null;

                return (
                  <StaggerItem index={1}>
                    <div className="rounded-xl sm:rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-50/80 to-white p-3 sm:p-4 shadow-elevation-sm animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 flex-none items-center justify-center rounded-lg sm:rounded-xl bg-amber-100 text-amber-700 border border-amber-300 mt-0.5 sm:mt-0">
                            <AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-bold text-amber-950 truncate">
                                Action Required: Policy Document / Health Card Missing
                              </h3>
                              <span className="rounded-full bg-amber-200/80 border border-amber-300 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-900">
                                Required for TPA & IRDAI Submission
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-amber-900/90 mt-0.5 font-medium line-clamp-2 sm:line-clamp-none">
                              <strong>{activeClaim.patient_name || 'Claim'}</strong>: Hospital bills are audited, but we need the patient&apos;s Policy Schedule or Health Card to unlock Room Rent capping, Co-Pay, and PED clause analysis.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-stretch sm:self-center flex-none">
                          <Button
                            size="sm"
                            onClick={(e) => handleAppendRequestedDocClick(activeClaim.id, e)}
                            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] sm:text-xs h-7 sm:h-8 px-3 sm:px-3.5 rounded-lg shadow-sm cursor-pointer"
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Policy Doc
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => s.openReportModal()}
                            className="hidden sm:inline-flex border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-xs h-8 cursor-pointer"
                          >
                            View In Audit Report →
                          </Button>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })()}

              {/* Upload Dropdown Panel (Always open & prominent when no claims are present) */}
              <StaggerItem index={2}>
                <SpotlightCard className="bg-white p-3.5 sm:p-4 shadow-elevation-sm">
                  {/* Ultra-compact 1-line flex row for both mobile & desktop */}
                  <div
                    onClick={() => {
                      if (!isUploadOpenEffective) {
                        s.resetState();
                      } else {
                        s.toggleUploadOpen();
                      }
                    }}
                    className="flex cursor-pointer select-none items-center justify-between gap-2 p-1"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
                        <Upload className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xs sm:text-sm font-bold text-foreground leading-tight">Upload Claim Documents</h2>
                        <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-0.5">
                          {isUploadOpenEffective ? "Click to collapse panel" : (
                            <>
                              <span className="hidden sm:inline">Expand to upload &amp; analyze new claim documents</span>
                              <span className="sm:hidden">Upload &amp; analyze new claim</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isUploadOpenEffective) {
                          s.resetState();
                        } else {
                          s.toggleUploadOpen();
                        }
                      }}
                      className="bg-[#0F766E] hover:bg-[#0D655E] text-[11px] sm:text-xs font-semibold text-white shadow-sm h-8 px-2.5 sm:px-3 rounded-lg flex-none cursor-pointer transition-colors"
                    >
                      {isUploadOpenEffective ? (
                        <>
                          <ChevronUp className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Collapse</span><span className="sm:hidden">Close</span>
                        </>
                      ) : (
                        <>
                          <Plus className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Upload New Claim</span><span className="sm:hidden">Upload</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Dropdown Body */}
                  {isUploadOpenEffective && (
                    <div className="mt-3 pt-3 border-t border-border animate-fade-in">
                      {s.analyzing ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-accent/5 rounded-xl border border-accent/30 text-center min-h-[180px] space-y-4 animate-fade-in">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent animate-spin">
                            <Sparkles className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-foreground">AI Medical Engine Analyzing...</p>
                            <p className="text-xs font-semibold text-accent mt-1">
                              {s.stepDescription && !s.stepDescription.includes("100%") ? s.stepDescription : "OCR (extracting text) · 20%"}
                            </p>
                          </div>
                        </div>
                      ) : s.isLiveSessionCompleted ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-center min-h-[180px] space-y-4 animate-fade-in">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-foreground">Claim Analysis 100% Complete!</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Extracted report for <span className="font-semibold text-foreground">{s.files[0]?.name || "claim_document.pdf"}</span> is generated.
                            </p>
                          </div>
                          <div className="pt-2 w-full max-w-sm space-y-2">
                            <Button onClick={() => s.openReportModal()} className="bg-[#0F766E] hover:bg-[#0D655E] w-full h-11 text-sm font-semibold text-white shadow-sm rounded-xl cursor-pointer transition-colors">
                              <FileText className="mr-2 h-4 w-4" /> View AI Post-Processing Audit Report
                            </Button>
                            <button
                              type="button"
                              onClick={() => s.resetState()}
                              className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline pt-1 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> Upload Another Claim Document
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="c-upload"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            s.handleSelectFile(e);
                          }}
                          className={cn(
                            "group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-teal-300/80 bg-teal-50/30 text-center transition-all hover:border-teal-500 hover:bg-teal-50/60 tap-highlight-none",
                            s.files.length > 0 
                              ? "py-3 px-3 sm:py-4 sm:px-4 min-h-[90px] sm:min-h-[110px] gap-1.5" 
                              : "py-4 sm:py-5 px-3 sm:px-4 min-h-[125px] sm:min-h-[150px] gap-2"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm transition-transform group-hover:scale-105",
                            s.files.length > 0 ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8 sm:h-10 sm:w-10"
                          )}>
                            <Upload className={cn(s.files.length > 0 ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4 sm:h-5 sm:w-5")} />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-foreground">
                              {s.files.length > 0 ? "Drop more files to add to this claim" : "Drag & drop hospital bills or discharge summaries"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                              Supports PDF, JPG, PNG up to 25 MB — Instant AI verification
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white border border-teal-200 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-teal-700 shadow-xs">
                            <Plus className="h-3 w-3" /> Browse Files on Computer
                          </span>
                          <input
                            id="c-upload"
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={s.handleSelectFile}
                          />
                        </label>
                      )}

                      {/* Staged files preview */}
                      {s.files.length > 0 && !s.analyzing && !s.isLiveSessionCompleted && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Attached Files ({s.files.length})</span>
                            <button
                              type="button"
                              onClick={() => document.getElementById('c-upload')?.click()}
                              className="text-[11px] font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 underline"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add More Documents
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {s.files.map((f, i) => (
                              <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-slate-50 p-3 text-xs shadow-sm">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {f.type?.startsWith("image/") || f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                    <ImageIcon className="h-4 w-4 text-teal-600 flex-none" />
                                  ) : (
                                    <Folder className="h-4 w-4 text-teal-600 flex-none" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-semibold truncate text-foreground">{f.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{f.size}</p>
                                  </div>
                                </div>
                                <button type="button" onClick={() => s.removeFile(i)} className="text-slate-400 hover:text-rose-600 p-1">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <Button onClick={() => s.startClaimAnalysis()} disabled={s.analyzing} className="bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-50 w-full h-11 text-xs sm:text-sm font-bold text-white shadow-sm rounded-xl cursor-pointer transition-colors">
                            <Sparkles className={cn("mr-2 h-4 w-4", s.analyzing && "animate-spin")} />
                            {s.analyzing ? "Analyzing Claim Document..." : `Begin Claim Analysis (${s.files.length} ${s.files.length === 1 ? 'Doc' : 'Docs'})`}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </SpotlightCard>
              </StaggerItem>

              {/* Mobile Only: Processed Claims History Selector */}
              {hasActiveClaim && (
                <StaggerItem index={3} className="block lg:hidden">
                  <div id="processed-claims-mobile-section" className="rounded-xl border border-border bg-white p-4 shadow-elevation-sm">
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-accent">
                          <Clock className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Processed Claims History</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {searchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-[10px] text-teal-600 hover:text-teal-800 font-semibold cursor-pointer underline mr-0.5"
                          >
                            Clear
                          </button>
                        )}
                        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                          {searchQuery.trim() ? `${filteredClaims.length}/${s.recentClaims.length}` : (s.recentClaims.length || 1)} Claims
                        </span>
                        {/* Mobile carousel arrow navigation buttons */}
                        <div className="flex items-center gap-1 ml-0.5">
                          <button
                            type="button"
                            onClick={() => scrollMobileClaims('left')}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-2xs transition-colors"
                            title="Previous Claims"
                            aria-label="Previous Claims"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollMobileClaims('right')}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-2xs transition-colors"
                            title="Next Claims"
                            aria-label="Next Claims"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div ref={mobileClaimsCarouselRef} className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin snap-x">
                      {filteredClaims.length === 0 ? (
                        searchQuery.trim() && s.recentClaims.length > 0 ? (
                          <div className="flex items-center gap-2 py-2 px-3 rounded-lg border border-dashed text-xs text-slate-500">
                            <span>No claims match &ldquo;{searchQuery}&rdquo;</span>
                            <button type="button" onClick={() => setSearchQuery('')} className="text-teal-600 font-semibold underline cursor-pointer">Clear</button>
                          </div>
                        ) : s.claimId ? (
                          <button
                            type="button"
                            onClick={() => s.selectClaim(s.claimId || "")}
                            className="flex-none snap-start rounded-lg border border-accent bg-accent/10 px-3.5 py-2 text-left shadow-sm min-w-[150px]"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold truncate text-foreground">{s.patientName || "Patient Record"}</p>
                              <span className="flex h-2 w-2 rounded-full bg-emerald-500 flex-none" />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              ID: {s.claimId.slice(0, 8)}...
                            </p>
                          </button>
                        ) : (
                          <p className="text-xs text-muted-foreground italic py-1 px-1">No uploaded claims present</p>
                        )
                      ) : (
                      filteredClaims.map((claim) => {
                        const isSelected = claim.id === s.claimId;
                        const docs = claim.documents || (isSelected && s.files.length > 0 ? s.files.map((f, i) => ({ id: `f-${i}`, file_name: f.name })) : []);
                        const liveProgress = (s as any).claimProgressMap?.[claim.id] || claim.progress;
                        const rawStatus = (claim.status || "").toUpperCase();
                        const isStalledClaim = (isSelected && s.isStalled) || liveProgress?.status === "STALLED" || rawStatus === "STALLED";
                        const isCompletedStatus = rawStatus === "COMPLETED" || rawStatus === "VALIDATED" || rawStatus === "FINISHED" || rawStatus === "APPROVED" || rawStatus === "SETTLED" || rawStatus === "REJECTED" || rawStatus === "IDENTITY_MISMATCH" || rawStatus === "DOCUMENTS_UPLOADED" || rawStatus === "SUBMITTED";
                        const isLiveActive = Boolean(
                          !isStalledClaim &&
                          liveProgress &&
                          !liveProgress.is_complete &&
                          typeof liveProgress.percentage === "number" &&
                          liveProgress.percentage > 0 &&
                          liveProgress.percentage < 100 &&
                          (liveProgress.status === "RUNNING" || (!isCompletedStatus && PIPELINE_ACTIVE_STATUSES.has(rawStatus)))
                        );
                        const isClaimProcessing = ((isSelected && s.analyzing && s.progress < 100) || (!isCompletedStatus && isLiveActive)) && !isStalledClaim;
                        const isDocFile = (val?: string | null) => Boolean(val && /\.(pdf|png|jpe?g|tiff?|docx?)$/i.test(val.trim()));
                        const hasRealPatientName = Boolean(claim.patient_name && claim.patient_name !== "N/A" && claim.patient_name !== "Processing..." && !isDocFile(claim.patient_name));
                        const claimName = hasRealPatientName
                          ? claim.patient_name
                          : (claim.status || "").toUpperCase() === "UPLOADED" || isClaimProcessing
                            ? "Processing..."
                            : `Claim #${claim.id.slice(0, 6)}`;

                        const currentProgress = (isSelected && s.analyzing)
                          ? s.progress
                          : (liveProgress?.percentage ?? 0);

                        const currentStep = (isSelected && s.analyzing)
                          ? (s.stepDescription || liveProgress?.step || `Processing - ${currentProgress}%`)
                          : (liveProgress?.step || (currentProgress > 0 ? `Processing - ${currentProgress}%` : ""));

                        const stageBadgeText = () => {
                          if (isSelected && s.analyzing) {
                            if (s.activeStage === 'coding') return 'Coding';
                            if (s.activeStage === 'scoring') return 'Scoring';
                            if (s.activeStage === 'parsing') return 'Parsing';
                            return 'OCR';
                          }
                          const p = currentProgress;
                          if (p < 50) return 'OCR';
                          if (p < 75) return 'Parsing';
                          if (p < 85) return 'Coding';
                          return 'Scoring';
                        };
                        const shortId = (claim.id || "").replace(/-/g, "").slice(-8).toUpperCase();
                        const hasDocsRequested = (
                          (isSelected && s.isDocumentsRequested) ||
                          (claim.status || "").toUpperCase() === "DOCUMENTS_REQUESTED" ||
                          Boolean((claim as any).has_action_request) ||
                          Boolean((claim as any).tpa_requested_docs?.length)
                        );
                        const isCleanPolVal = (v: any) => Boolean(
                          v && typeof v === 'string' && v.trim().length >= 3 &&
                          v.toUpperCase() !== 'N/A' && v.toLowerCase() !== 'null' &&
                          v !== 'Star Health' && v !== 'Pending Insurer Selection'
                        );
                        const claimPol = (claim as any).policy_number || (claim as any).policy_id || (isSelected && ((s.realPreview?.parsed_fields as any)?.policy_number || (s.realPreview as any)?.policy_id)) || "";
                        const claimIns = claim.insurance_company || claim.payer || (isSelected && ((s.realPreview as any)?.insurance_company || (s.realPreview as any)?.payer)) || "";
                        const claimDocs = claim.documents || (isSelected ? s.realPreview?.documents : []) || [];
                        const hasPolicyDocInFiles = claimDocs.some((d: any) => {
                          const t = (d.doc_type || d.type || d.name || d.display_title || '').toLowerCase();
                          return t.includes('policy') || t.includes('insurance') || t.includes('health_card');
                        });
                        const claimHasValidPolicy = Boolean(
                          (claimPol && isCleanPolVal(claimPol)) ||
                          (claimIns && isCleanPolVal(claimIns)) ||
                          hasPolicyDocInFiles
                        );
                        const effectiveClaimStatus = (
                          (isSelected && (s.realPreview as any)?.status ? (s.realPreview as any).status.toUpperCase() : null) ||
                          claim.status ||
                          ""
                        ).toUpperCase();
                        const isTerminalClaim = ["SETTLED", "APPROVED", "REJECTED"].includes(effectiveClaimStatus);
                        const claimMissingPolicy = !isClaimProcessing && !isTerminalClaim && !hasDocsRequested && !claimHasValidPolicy;

                        const resolvedInsurer = (
                          claim.insurance_company ||
                          claim.payer ||
                          (typeof window !== "undefined" ? localStorage.getItem(`claimgpt_submitted_payer_${claim.id}`) : null) ||
                          (isSelected && ((s.realPreview as any)?.insurance_company || (s.realPreview as any)?.payer)) ||
                          ""
                        ).trim();
                        const submittedBadgeText = resolvedInsurer
                          ? `Submitted to ${resolvedInsurer}`
                          : "Submitted";

                        return (
                          <div
                            key={claim.id}
                            onClick={() => s.selectClaim(claim.id)}
                            className={cn(
                              "flex-none snap-start rounded-2xl border p-3 text-left transition-all tap-highlight-none min-w-[220px] max-w-[260px] space-y-2 cursor-pointer",
                              isSelected
                                ? "border-blue-400 bg-white shadow-md ring-1 ring-blue-300"
                                : "border-slate-200 bg-white/80 hover:bg-white shadow-2xs"
                            )}
                          >
                            {/* Top Row: Short ID on Left, Delete on Right */}
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="rounded bg-blue-50 text-blue-700 font-mono font-bold px-1.5 py-0.5 text-[9px] border border-blue-200">
                                #{shortId || "CLM001"}
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setClaimToDelete({ id: claim.id, name: claimName });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    setClaimToDelete({ id: claim.id, name: claimName });
                                  }
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete claim"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center">
                              {isStalledClaim ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[9px] border border-amber-300">
                                  ⏸️ Stalled
                                </span>
                              ) : isClaimProcessing ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[9px] border border-amber-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                  {stageBadgeText()}
                                </span>
                              ) : hasDocsRequested ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[9px] border border-amber-300 animate-pulse">
                                  ⚠️ Docs Req
                                </span>
                              ) : (claim.status || "").toUpperCase() === "SUBMITTED" ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 font-bold px-2 py-0.5 text-[9px] border border-sky-300 max-w-full"
                                  title={submittedBadgeText}
                                >
                                  <span className="flex-none">📤</span>
                                  <span className="truncate">{submittedBadgeText}</span>
                                </span>
                              ) : claimMissingPolicy ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 text-[9px] border border-amber-200" title="Medical bills audited • Policy schedule required for TPA submission">
                                  ⚠️ Policy Needed
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[9px] font-bold">
                                  ✓ Audit Ready
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate text-slate-900">
                                {claimName}
                              </p>
                              {docs.length > 0 && (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {docs[0].file_name} {docs.length > 1 ? `+${docs.length - 1} more` : ''}
                                </p>
                              )}
                            </div>

                            {/* Mobile Action Box for Requested Documents */}
                            {hasDocsRequested && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-[10px] text-amber-900 space-y-1">
                                <p className="font-semibold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-amber-600 flex-none" />
                                  <span>Insurer requested missing documents</span>
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => handleAppendRequestedDocClick(claim.id, e)}
                                  className="w-full text-center rounded bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-2 text-[10px] shadow-xs cursor-pointer transition-colors"
                                >
                                  + Upload Requested Document
                                </button>
                              </div>
                            )}

                            {/* Mobile Action Box for Missing Policy */}
                            {claimMissingPolicy && !hasDocsRequested && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-[10px] text-amber-900 space-y-1">
                                <p className="font-semibold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-amber-600 flex-none" />
                                  <span>Policy schedule required</span>
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => handleAppendRequestedDocClick(claim.id, e)}
                                  className="w-full text-center rounded bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-2 text-[10px] shadow-xs cursor-pointer transition-colors"
                                >
                                  + Upload Policy Document
                                </button>
                              </div>
                            )}

                            {/* Progress bar if actively processing */}
                            {isClaimProcessing ? (
                              <div className="space-y-1 pt-1 border-t border-amber-200/60">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-amber-900">
                                  <span className="truncate pr-1">{currentStep}</span>
                                  <span className="font-mono font-bold">{currentProgress}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-amber-100 overflow-hidden border border-amber-200/50">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(currentProgress, 10)}%` }}
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                      )}
                    </div>
                  </div>
                </StaggerItem>
              )}

              {/* WHEN NO CLAIM IS UPLOADED / SELECTED: Display High-Converting Onboarding Guide */}
              {!hasActiveClaim ? (
                <StaggerItem index={3}>
                  <SpotlightCard className="bg-white p-6 sm:p-8 shadow-elevation-sm rounded-2xl border border-slate-200">
                    <div className="text-center max-w-2xl mx-auto space-y-2.5 mb-8">
                      <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-bold text-teal-800">
                        <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                        AI-Powered Medical Claim Verification &amp; Audit Engine
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                        Audit &amp; Settle Claims in 3 Automated Steps
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Upload your hospital final bills, discharge summaries, or diagnostic reports above to activate real-time OCR extraction, IRDAI compliance scoring, and 1-click TPA settlement reports.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 hover:bg-slate-50 hover:border-teal-300 transition-all shadow-xs">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-sm shadow-md">
                          1
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Upload Claim Documents</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Drop multi-page hospital bills, discharge summaries, pharmacy invoices, or diagnostic lab tests.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 hover:bg-slate-50 hover:border-teal-300 transition-all shadow-xs">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white font-bold text-sm shadow-md">
                          2
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Document Reading &amp; Data Extraction</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          ClaimsGuru automatically extracts patient demographics, admission/discharge dates, itemized medical lines, and ICD/CPT codes.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 hover:bg-slate-50 hover:border-teal-300 transition-all shadow-xs">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md">
                          3
                        </div>
                        <h3 className="text-sm font-bold text-foreground">IRDAI Audit &amp; Settlement</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Inspect compliance scores, discrepancy validations, and instantly view on-screen TPA and IRDAI claim settlement reports.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 flex-none" />
                        <span className="font-semibold text-slate-700">256-Bit Encrypted · IRDAI Rule Compliant · HIPAA Ready</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => document.getElementById('c-upload')?.click()}
                        className="bg-[#0F766E] hover:bg-[#0D655E] inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" /> Select Files to Get Started
                      </button>
                    </div>
                  </SpotlightCard>
                </StaggerItem>
              ) : (
                <>
                  {/* Processing Pipeline Progress Bar Card (Only visible when claim is active/uploaded) */}
                  <StaggerItem index={4} id="pipeline-progress-section">
                    <SpotlightCard className="bg-white p-4 shadow-elevation-sm sm:p-5">
                      {/* Top Bar: Claim Info on Left, Status + View Report Button on Right (Responsive Stack on Mobile) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">
                              Processing Pipeline
                            </h2>
                            <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                              {s.claimId ? `#${s.claimId.replace(/-/g, "").slice(-8).toUpperCase()}` : (s.analyzing ? "Generating..." : "Ready for Upload")}
                            </span>
                          </div>
                          {s.claimId && s.claimCreatedAt && (
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground mt-1 font-sans">
                              <Clock className="h-3 w-3 text-slate-400 flex-none" />
                              <span>Uploaded: <strong className="font-medium text-slate-600">{formatClaimExactDateTime(s.claimCreatedAt)}</strong></span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 sm:border-0">
                          {s.isDocumentsRequested ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-700 border border-amber-500/30 animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              REQUIRED
                            </span>
                          ) : s.nameMismatchWarning ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-red-700 border border-red-500/30 animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                              MISMATCH
                            </span>
                          ) : (() => {
                            const activeClaimStatus = (
                              (s.realPreview as any)?.status ||
                              s.recentClaims.find(c => c.id === s.claimId)?.status ||
                              ""
                            ).toUpperCase();
                            const matched = s.recentClaims.find(c => c.id === s.claimId);
                            const ins = (matched?.insurance_company || matched?.payer || (s.realPreview as any)?.insurance_company || (s.realPreview as any)?.payer || (typeof window !== "undefined" && s.claimId ? localStorage.getItem(`claimgpt_submitted_payer_${s.claimId}`) : "") || "").trim();

                            if (activeClaimStatus === "SETTLED") {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-800 border border-emerald-300 max-w-[240px] truncate shadow-2xs"
                                  title={ins ? `Settled & Paid by ${ins}` : "Claim Settled & Paid"}
                                >
                                  <span className="flex-none">💎</span>
                                  <span className="truncate">
                                    {ins ? `Settled (${ins})` : "Settled & Paid"}
                                  </span>
                                </span>
                              );
                            }
                            if (activeClaimStatus === "APPROVED") {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-teal-800 border border-teal-300 max-w-[240px] truncate shadow-2xs"
                                  title={ins ? `Approved by ${ins}` : "Claim Approved"}
                                >
                                  <CheckCircle2 className="h-3 w-3 text-teal-600 flex-none" />
                                  <span className="truncate">
                                    {ins ? `Approved (${ins})` : "Approved"}
                                  </span>
                                </span>
                              );
                            }
                            if (activeClaimStatus === "REJECTED") {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-rose-800 border border-rose-300 max-w-[240px] truncate shadow-2xs"
                                  title="Claim Rejected"
                                >
                                  <AlertTriangle className="h-3 w-3 text-rose-600 flex-none" />
                                  <span className="truncate">Rejected</span>
                                </span>
                              );
                            }
                            if (activeClaimStatus === "SUBMITTED") {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-sky-700 border border-sky-200 max-w-[240px] truncate shadow-2xs"
                                  title={ins ? `Submitted to ${ins}` : "Submitted"}
                                >
                                  <span className="flex-none">📤</span>
                                  <span className="truncate">
                                    {ins ? `Submitted to ${ins}` : "Submitted"}
                                  </span>
                                </span>
                              );
                            }
                            return null;
                          })() || (s.isStalled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-700 border border-amber-500/30">
                              <AlertCircle className="h-3 w-3 text-amber-600" />
                              Pipeline Stalled
                            </span>
                          ) : s.progress >= 100 ? (
                            (() => {
                              const activeMatchedClaim = s.recentClaims?.find((c: any) => c.id === s.claimId);
                              const isCleanPolVal = (v: any) => Boolean(
                                v && typeof v === 'string' && v.trim().length >= 3 &&
                                v.toUpperCase() !== 'N/A' && v.toLowerCase() !== 'null' &&
                                v !== 'Star Health' && v !== 'Pending Insurer Selection'
                              );
                              const activeClaimPol = (activeMatchedClaim as any)?.policy_number || (activeMatchedClaim as any)?.policy_id || ((s.realPreview?.parsed_fields as any)?.policy_number || (s.realPreview as any)?.policy_id) || "";
                              const activeClaimIns = activeMatchedClaim?.insurance_company || activeMatchedClaim?.payer || ((s.realPreview as any)?.insurance_company || (s.realPreview as any)?.payer) || "";
                              const activeDocs = activeMatchedClaim?.documents || s.realPreview?.documents || [];
                              const activeHasPolicyDoc = activeDocs.some((d: any) => {
                                const t = (d.doc_type || d.type || d.name || d.display_title || '').toLowerCase();
                                return t.includes('policy') || t.includes('insurance') || t.includes('health_card');
                              });
                              const activeHasValidPolicy = Boolean(
                                (activeClaimPol && isCleanPolVal(activeClaimPol)) ||
                                (activeClaimIns && isCleanPolVal(activeClaimIns)) ||
                                activeHasPolicyDoc
                              );
                              const activeMissingPolicy = !s.analyzing && !s.isDocumentsRequested && !activeHasValidPolicy && Boolean(s.claimId);

                              if (activeMissingPolicy) {
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-800 border border-amber-300 shadow-2xs">
                                    <AlertTriangle className="h-3 w-3 text-amber-600 flex-none" />
                                    Policy Needed
                                  </span>
                                );
                              }

                              return (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-[#047857] border border-[#A7F3D0]">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-[#047857]" />
                                  Audit Ready
                                </span>
                              );
                            })()
                          ) : s.progress === 0 && !s.analyzing ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-500 border border-slate-200">
                              <Clock className="h-3 w-3 text-slate-400" />
                              Idle
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-teal-700 border border-teal-500/30">
                              <Loader2 className="h-3 w-3 text-teal-600 animate-spin" />
                              Analyzing
                            </span>
                          ))}

                          {s.isStalled ? (
                            <Button
                              onClick={() => s.retryClaimAnalysis()}
                              disabled={s.isRetrying}
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 text-[11px] sm:text-xs font-semibold text-white shadow-md animate-scale-in h-7 sm:h-8 px-2 sm:px-3 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all"
                            >
                              <RotateCcw className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", s.isRetrying && "animate-spin")} />
                              <span>{s.isRetrying ? "Restarting..." : "Restart AI Analysis"}</span>
                            </Button>
                          ) : null}

                          {s.progress >= 100 && !s.analyzing && !s.isDocumentsRequested && !s.nameMismatchWarning && !s.isStalled ? (
                            <Button
                              onClick={() => s.openReportModal()}
                              size="sm"
                              className="bg-[#0F766E] hover:bg-[#0D655E] text-[11px] sm:text-xs font-semibold text-white shadow-sm animate-scale-in h-7 sm:h-8 px-2 sm:px-3 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span>View Report</span>
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {/* Glowing Progress Bar (0% to 100%) */}
                      <div className="relative mt-3 mb-3">
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-border">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              s.isStalled
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                                : s.progress === 0 && !s.analyzing
                                ? "bg-slate-200"
                                : s.isDocumentsRequested
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                                : "bg-[#0F766E]"
                            )}
                            style={{ width: `${s.progress === 0 && !s.analyzing ? 0 : Math.max(s.progress, 5)}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {s.isStalled ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-none animate-pulse" />
                            ) : s.analyzing && s.progress < 100 && !s.isDocumentsRequested ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 flex-none" />
                            ) : null}
                            <span className="text-[11px] font-semibold text-slate-700 truncate">
                              {s.isStalled
                                ? (s.stalledMessage || "Processing stalled due to worker timeout. Click 'Restart AI Analysis' to resume.")
                                : s.progress >= 100
                                ? "AI Verification Complete"
                                : (s.analyzing || s.progress > 0)
                                ? (s.stepDescription?.replace(/\s*[-·]\s*\d+%\s*$/, '') || (s.progress < 50 ? "OCR (extracting text)" : s.progress < 75 ? "AI Document Analysis (Reading Claim)" : "Analyzing documents..."))
                                : "Ready for Document Upload"}
                            </span>
                          </div>
                          <span className={cn(
                            "font-mono font-extrabold text-[11px] px-2 py-0.2 rounded-full flex-none",
                            s.isStalled
                              ? "text-amber-800 bg-amber-50 border border-amber-300"
                              : "text-teal-700 bg-teal-50 border border-teal-200"
                          )}>
                            {s.progress}%
                          </span>
                        </div>
                      </div>

                      {/* 5-Stage Stepper Tracker */}
                      {/* Mobile: Connected Stepper Track */}
                      <div className="sm:hidden pt-3 border-t border-border/50">
                        <div className="relative flex items-center justify-between px-1">
                          {/* Connecting Background Track */}
                          <div className="absolute left-4 right-4 top-3.5 h-0.5 bg-slate-200 -z-0" />
                          <div
                            className="absolute left-4 top-3.5 h-0.5 bg-[#0F766E] transition-all duration-500 -z-0"
                            style={{
                              width: s.progress >= 100
                                ? 'calc(100% - 32px)'
                                : s.progress === 0 && !s.analyzing
                                ? '0%'
                                : `${Math.min(100, Math.max(0, (s.stageIndex / 4) * 100))}%`,
                            }}
                          />

                          {PIPELINE.map((stage, i) => {
                            const isIdle = s.progress === 0 && !s.analyzing;
                            const isProcessing = s.analyzing || (s.progress > 0 && s.progress < 100);
                            const done = !isIdle && (i < s.stageIndex || s.progress >= 100);
                            const current = isProcessing && i === s.stageIndex && s.progress < 100;
                            const activeClaimMeta = s.recentClaims?.find((c) => c.id === s.claimId);
                            const currentStatus = (s.realPreview?.status || activeClaimMeta?.status || '').toUpperCase();
                            const isClaimSettled = currentStatus === 'SETTLED';
                            const shortLabels = ['Attached', 'Reading', 'AI Analysis', 'Medical Code', isClaimSettled ? 'Settled' : 'Risk Score'];

                            return (
                              <button
                                key={stage.key}
                                type="button"
                                onClick={() => s.setActiveStage(stage.key)}
                                className="relative z-10 flex flex-col items-center gap-1 tap-highlight-none group cursor-pointer focus:outline-none"
                              >
                                <div
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs",
                                    done && "bg-[#047857] text-white",
                                    current && "bg-[#0F766E] text-white ring-2 ring-[#0F766E]/30 ring-offset-2 scale-110",
                                    !done && !current && "bg-white border-2 border-slate-200 text-slate-400"
                                  )}
                                >
                                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                                </div>
                                <span
                                  className={cn(
                                    "text-[9px] font-semibold text-center leading-tight tracking-tight",
                                    current && "font-bold text-[#0F766E]",
                                    done && "text-slate-700",
                                    !done && !current && "text-slate-400"
                                  )}
                                >
                                  {shortLabels[i] || stage.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Desktop: 5 Stage Cards */}
                      <div className="hidden sm:grid grid-cols-5 gap-2 pt-3 border-t border-border/50">
                        {PIPELINE.map((stage, i) => {
                          const isIdle = s.progress === 0 && !s.analyzing;
                          const isProcessing = s.analyzing || (s.progress > 0 && s.progress < 100);
                          const done = !isIdle && (i < s.stageIndex || s.progress >= 100);
                          const current = isProcessing && i === s.stageIndex && s.progress < 100;
                          return (
                            <button
                              key={stage.key}
                              type="button"
                              onClick={() => s.setActiveStage(stage.key)}
                              className={cn(
                                "flex items-center justify-center gap-2 p-2 rounded-xl border text-center transition-all tap-highlight-none min-h-[44px] cursor-pointer",
                                done && "border-[#A7F3D0] bg-[#ECFDF5] shadow-xs",
                                current && "border-[#0F766E] bg-teal-50/70 ring-2 ring-[#0F766E]/20 animate-pulse shadow-sm",
                                !done && !current && "border-border bg-slate-50 hover:bg-slate-100"
                              )}
                            >
                              <span className={cn(
                                "flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold",
                                done && "bg-[#047857] text-white",
                                current && "bg-[#0F766E] text-white animate-bounce",
                                !done && !current && "bg-slate-200 text-slate-500"
                              )}>
                                {done ? <Check className="h-3 w-3" /> : i + 1}
                              </span>
                              <span className={cn(
                                "text-xs font-semibold leading-tight text-center line-clamp-2",
                                done && "text-[#047857] font-bold",
                                current && "text-[#0F766E] font-bold",
                                !done && !current && "text-slate-500"
                              )}>
                                {stage.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {s.isDocumentsRequested && (
                        (() => {
                          const selectedRecent = s.recentClaims?.find((c: any) => c.id === s.claimId);
                          const recentMsg = selectedRecent?.tpa_message || (selectedRecent as any)?.notes || (selectedRecent as any)?.identity_mismatch_message;
                          const previewMsg = (s.realPreview as any)?.identity_mismatch_message || (s.realPreview as any)?.notes || (s.realPreview as any)?.tpa_message;
                          
                          const checkIsMismatch = (txt: string | null | undefined): boolean => {
                            if (!txt) return false;
                            const low = String(txt).toLowerCase();
                            return (
                              low.includes("identity mismatch") ||
                              low.includes("mismatch detected") ||
                              low.includes("belongs to") ||
                              low.includes("instead of") ||
                              low.includes("wrong patient") ||
                              low.includes("does not match")
                            );
                          };

                          const mismatchMsg = (
                            s.identityMismatchMessage ||
                            (checkIsMismatch(s.tpaMessage) ? s.tpaMessage : null) ||
                            (checkIsMismatch(recentMsg) ? recentMsg : null) ||
                            (checkIsMismatch(previewMsg) ? previewMsg : null) ||
                            (s.realPreview as any)?.identity_mismatch_message ||
                            (selectedRecent as any)?.identity_mismatch_message ||
                            null
                          );
                          const isMismatch = Boolean(mismatchMsg);
                          const pName = s.patientName || (s.realPreview as any)?.summary?.patient_name || (s.realPreview as any)?.patient_name || "the patient";

                          return (
                            <div className={cn(
                              "mt-4 p-4 sm:p-5 rounded-2xl border text-left shadow-xs transition-all",
                              isMismatch
                                ? "border-amber-300 bg-gradient-to-b from-white to-amber-50/60 border-l-4 border-l-amber-500 text-amber-950"
                                : "border-amber-200 bg-gradient-to-b from-white to-amber-50/40 border-l-4 border-l-amber-500 text-slate-800"
                            )}>
                              <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center flex-none mt-0.5 shadow-2xs">
                                  <AlertTriangle className="h-4.5 w-4.5" />
                                </div>
                                <div className="space-y-3 w-full min-w-0">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h4 className="text-xs sm:text-sm font-bold tracking-tight text-amber-900 uppercase">
                                      {isMismatch ? "Wrong Patient Document Uploaded (Identity Mismatch)" : (s.tpaMessage ? "Insurer Document Request" : "Requested Documents Pending")}
                                    </h4>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                                      Action Required
                                    </span>
                                  </div>

                                  {isMismatch ? (
                                    <div className="p-3.5 rounded-xl bg-white border border-amber-300 text-xs text-amber-950 shadow-2xs">
                                      <span className="text-[10px] uppercase font-bold text-amber-800 block mb-1">
                                        Identity Verification Notice:
                                      </span>
                                      <p className="font-semibold text-sm text-amber-950 leading-snug">
                                        {mismatchMsg}
                                      </p>
                                    </div>
                                  ) : s.tpaMessage ? (
                                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-slate-800 shadow-2xs">
                                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-800 mb-1">
                                        <Clock className="h-3 w-3" />
                                        <span>Message from Claims Reviewer:</span>
                                      </div>
                                      <p className="font-bold text-sm text-amber-950 italic">
                                        &ldquo;{s.tpaMessage}&rdquo;
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-600 leading-relaxed font-sans">
                                      {s.missingGroups.length > 0
                                        ? "We detected incomplete information in your claim upload. Please upload the following items to resume analysis:"
                                        : "Additional documents have been requested for your claim. Please upload the requested documents below:"}
                                    </p>
                                  )}

                                  {isMismatch && (
                                    <p className="text-xs text-amber-900 font-medium leading-relaxed font-sans">
                                      The mismatched document was automatically removed. Your existing claim and previously uploaded valid documents remain completely safe. Please upload the correct document for <strong>{pName}</strong> below.
                                    </p>
                                  )}

                                  {!isMismatch && s.missingGroups.filter((grp: string) => grp && grp.trim() && grp.trim() !== (s.tpaMessage || "").trim()).length > 0 && (
                                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                                        {s.tpaMessage ? "Requested Items / Missing Categories:" : "Missing Items:"}
                                      </span>
                                      <ul className="list-disc list-inside pl-1 text-xs font-semibold space-y-1 text-slate-800">
                                        {s.missingGroups
                                          .filter((grp: string) => grp && grp.trim() && grp.trim() !== (s.tpaMessage || "").trim())
                                          .map((grp: string) => (
                                            <li key={grp}>{grp}</li>
                                          ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                    <label className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
                                      <input
                                        type="file"
                                        multiple
                                        hidden
                                        onChange={(e) => {
                                          if (e.target.files?.length) {
                                            s.handleUploadFile(Array.from(e.target.files), true);
                                          }
                                        }}
                                      />
                                      <Upload className="h-4 w-4" />
                                      <span>{isMismatch ? `Upload Correct Document for ${pName}` : "Upload Requested Documents"}</span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => s.openReportModal()}
                                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs py-2.5 px-3.5 rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <span>View In Audit Report →</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Prominent Action Card if policy document is missing on the active selected claim */}
                      {(() => {
                        if (s.isDocumentsRequested || s.nameMismatchWarning || s.analyzing) return null;

                        const activeMatchedClaim = s.recentClaims?.find((c: any) => c.id === s.claimId);
                        const isCleanPolVal = (v: any) => Boolean(
                          v && typeof v === 'string' && v.trim().length >= 3 &&
                          v.toUpperCase() !== 'N/A' && v.toLowerCase() !== 'null' &&
                          v !== 'Star Health' && v !== 'Pending Insurer Selection'
                        );
                        const activeClaimPol = (activeMatchedClaim as any)?.policy_number || (activeMatchedClaim as any)?.policy_id || ((s.realPreview?.parsed_fields as any)?.policy_number || (s.realPreview as any)?.policy_id) || "";
                        const activeClaimIns = activeMatchedClaim?.insurance_company || activeMatchedClaim?.payer || ((s.realPreview as any)?.insurance_company || (s.realPreview as any)?.payer) || "";
                        const activeDocs = activeMatchedClaim?.documents || s.realPreview?.documents || [];
                        const activeHasPolicyDoc = activeDocs.some((d: any) => {
                          const t = (d.doc_type || d.type || d.name || d.display_title || '').toLowerCase();
                          return t.includes('policy') || t.includes('insurance') || t.includes('health_card');
                        });
                        const activeHasValidPolicy = Boolean(
                          (activeClaimPol && isCleanPolVal(activeClaimPol)) ||
                          (activeClaimIns && isCleanPolVal(activeClaimIns)) ||
                          activeHasPolicyDoc
                        );
                        const activeEffectiveStatus = (
                          (s.realPreview as any)?.status ||
                          activeMatchedClaim?.status ||
                          ""
                        ).toUpperCase();
                        const activeIsTerminal = ["SETTLED", "APPROVED", "REJECTED"].includes(activeEffectiveStatus);
                        const activeMissingPolicy = !activeIsTerminal && !activeHasValidPolicy && Boolean(s.claimId);

                        if (!activeMissingPolicy) return null;

                        return (
                          <div className="mt-4 p-4 sm:p-5 rounded-2xl border border-amber-200 bg-gradient-to-b from-white to-amber-50/40 border-l-4 border-l-amber-500 text-left shadow-xs transition-all space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center flex-none mt-0.5 shadow-2xs">
                                <AlertTriangle className="h-4.5 w-4.5" />
                              </div>
                              <div className="space-y-2.5 w-full min-w-0">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <h4 className="text-xs sm:text-sm font-bold tracking-tight text-amber-900 uppercase">
                                    Policy Schedule Required for Submission
                                  </h4>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                                    Action Required
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                                  Your hospital bills and clinical discharge summary have been processed. To calculate eligible copay, room rent capping, and submit this claim to your TPA or insurer, please upload your <strong>Health Insurance Policy Schedule</strong> or <strong>TPA E-Card</strong>.
                                </p>
                                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                  <label className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
                                    <input
                                      type="file"
                                      multiple
                                      accept=".pdf,.png,.jpg,.jpeg"
                                      hidden
                                      onChange={(e) => {
                                        if (e.target.files?.length && s.claimId) {
                                          s.handleUploadFile(Array.from(e.target.files), true);
                                        }
                                      }}
                                    />
                                    <Upload className="h-4 w-4" />
                                    <span>+ Upload Policy Document</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => s.openReportModal()}
                                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs py-2.5 px-3.5 rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <span>Review Audit Report →</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {s.nameMismatchWarning && (
                        <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50/50 text-red-900 animate-fade-in text-left">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1 w-full font-sans">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-red-800">Patient Name Mismatch Detected</h4>
                              <p className="text-xs text-red-700 leading-relaxed">
                                {s.nameMismatchWarning}
                              </p>
                              <div className="mt-3 flex items-center gap-3">
                                <label className="bg-rose-700 hover:bg-rose-800 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer transition-colors">
                                  <input
                                    type="file"
                                    multiple
                                    hidden
                                    onChange={(e) => {
                                      if (e.target.files?.length) {
                                        s.handleUploadFile(Array.from(e.target.files), true);
                                      }
                                    }}
                                  />
                                  <Upload className="h-3.5 w-3.5" /> Upload Correct ID Proof
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </SpotlightCard>
                  </StaggerItem>

                  {/* Auditor Workspace (Sits right below Pipeline!) */}
                  <StaggerItem index={5}>
                    <SpotlightCard className="bg-white shadow-elevation-sm">
                      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">Claims Auditor &amp; Preview</h2>
                          <p className="text-xs text-muted-foreground">Hover a table row to highlight its source on the document.</p>
                        </div>
                        {s.progress >= 100 && !s.analyzing && !s.isDocumentsRequested && (
                          <Button onClick={() => s.openReportModal()} size="sm" className="bg-[#0F766E] hover:bg-[#0D655E] text-xs font-semibold text-white shadow-sm cursor-pointer transition-colors">
                            <FileText className="mr-1.5 h-3.5 w-3.5" /> Full Audit Report
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 lg:h-[560px] min-h-[500px]">
                        <DocumentViewer
                          claimId={s.claimId}
                          fileObj={s.files.length > 0 ? s.files[s.files.length - 1] : null}
                          zoom={s.zoom}
                          setZoom={s.setZoom}
                          hoveredField={s.hoveredField}
                          filename={s.realPreview?.documents?.[0]?.display_title || s.realPreview?.documents?.[0]?.original_filename || (s.files.length > 0 ? s.files[s.files.length - 1]?.name : undefined)}
                          documents={s.realPreview?.documents}
                          activeDocumentId={s.activeDocumentId}
                          onSelectDocument={s.setActiveDocumentId}
                          onOpenDocModal={s.openDocModal}
                          className="border-b border-border lg:border-b-0 lg:border-r h-full overflow-hidden"
                        />
                        <div className="flex flex-col h-full overflow-hidden">
                          <div className="border-b border-border bg-slate-50/60 px-5 py-3 flex items-center justify-between flex-none gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-foreground">Extracted Claim Data</h3>
                              {s.nameMismatchWarning && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2.5 py-0.5 text-[10px] font-bold text-red-800 animate-pulse">
                                  <AlertTriangle className="h-3 w-3 text-red-600" />
                                  Name Mismatch
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => s.openReportModal()}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
                              >
                                <Eye className="h-3 w-3 text-teal-600" />
                                Edit in Full Report →
                              </button>
                            </div>
                          </div>
                          {s.nameMismatchWarning && (
                            <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 shadow-sm animate-fade-in font-sans flex-none">
                              <AlertTriangle className="h-4 w-4 text-red-600 flex-none mt-0.5" />
                              <div>
                                <h4 className="font-bold text-red-900">Patient Name Mismatch Detected</h4>
                                <p className="mt-0.5 text-red-700 leading-relaxed">{s.nameMismatchWarning}</p>
                              </div>
                            </div>
                          )}
                          <div key={`${s.claimId || 'default-clinical'}-${s.previewVersion}`} className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 flex-none">
                            <MetaField id="c-patient-name" label="Patient Name" defaultValue={s.patientName} edited={!!s.edited['patient-name']} onEdit={() => s.markEdited('patient-name')} />
                            <MetaField id="c-hospital" label="Hospital" defaultValue={s.hospitalName} edited={!!s.edited['hospital']} onEdit={() => s.markEdited('hospital')} />
                            <MetaField id="c-admission" label="Admission Date" defaultValue={s.admissionDate} edited={!!s.edited['admission']} onEdit={() => s.markEdited('admission')} />
                            <MetaField id="c-discharge" label="Discharge Date" defaultValue={s.dischargeDate} edited={!!s.edited['discharge']} onEdit={() => s.markEdited('discharge')} />
                            <MetaField id="c-diagnosis" label="Diagnosis" defaultValue={s.diagnosis} edited={!!s.edited['diagnosis']} onEdit={() => s.markEdited('diagnosis')} className="sm:col-span-2" />
                          </div>
                          <div className="border-t border-border px-5 py-3 flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="mb-2 flex items-center justify-between">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categorized Expenses</h3>
                              {(s.analyzing || s.uploading || (s.progress > 0 && s.progress < 100)) && !s.realPreview?.expenses?.length && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Processing...
                                </span>
                              )}
                            </div>
                            <div className="overflow-hidden rounded-lg border border-border flex-1 flex flex-col min-h-0">
                              <div className="overflow-y-auto scrollbar-thin flex-1 h-full">
                                <table className="w-full text-sm">
                                  <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#475569] sticky top-0 z-10 border-b border-[#E2E8F0]">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-bold bg-[#F8FAFC]">Category</th>
                                      <th className="hidden px-3 py-2 text-left font-bold sm:table-cell bg-[#F8FAFC]">Description</th>
                                      <th className="px-3 py-2 text-right font-bold bg-[#F8FAFC]">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(s.analyzing || s.uploading || (s.progress > 0 && s.progress < 100)) && !s.realPreview?.expenses?.length ? (
                                      <>
                                        {[1, 2, 3].map((rowIdx) => (
                                          <tr key={`proc-exp-row-${rowIdx}`} className="bg-slate-50/50">
                                            <td className="px-3 py-2.5 font-medium text-muted-foreground">
                                              <div className="flex items-center gap-1.5">
                                                <Loader2 className="h-3 w-3 animate-spin text-[#0F766E] shrink-0" />
                                                <span className="text-xs italic text-muted-foreground">Processing...</span>
                                              </div>
                                            </td>
                                            <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell text-xs italic">
                                              Processing...
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs italic">
                                              Processing...
                                            </td>
                                          </tr>
                                        ))}
                                      </>
                                    ) : s.lineItems.length > 0 ? (
                                      s.lineItems.map((item) => (
                                        <tr
                                          key={item.id}
                                          onMouseEnter={() => s.setHoveredField(item.id)}
                                          onMouseLeave={() => s.setHoveredField(null)}
                                          className={cn(
                                            'cursor-pointer transition-colors border-b border-slate-100',
                                            s.hoveredField === item.id ? 'bg-[#F0FDFA]' : 'hover:bg-[#F8FAFC]'
                                          )}
                                        >
                                          <td className="px-3 py-2 text-xs font-semibold text-[#0F172A]">{item.category}</td>
                                          <td className="hidden px-3 py-2 text-xs text-[#64748B] sm:table-cell">{item.description}</td>
                                          <td className="px-3 py-2 text-xs font-bold text-[#0F172A] text-right tabular-nums">{formatINR(item.amount)}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={3} className="px-3 py-8 text-center text-xs text-muted-foreground italic">
                                          {s.files.length === 0 && !s.claimId ? 'No claim document uploaded' : 'No categorized expenses found'}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                  <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC] border-t-2 border-[#CBD5E1]">
                                    <tr className="bg-[#F8FAFC]">
                                      <td className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0F172A] bg-[#F8FAFC]">Total</td>
                                      <td className="hidden px-3 py-2.5 sm:table-cell bg-[#F8FAFC]" />
                                      <td className="px-3 py-2.5 text-right text-xs sm:text-sm font-bold text-[#0F172A] tabular-nums bg-[#F8FAFC]">
                                        {(s.analyzing || s.uploading || (s.progress > 0 && s.progress < 100)) && !s.realPreview?.expenses?.length ? (
                                          <span className="text-xs italic text-muted-foreground font-normal">Processing...</span>
                                        ) : (
                                          formatINR(s.total || 0)
                                        )}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>
                  </StaggerItem>
                </>
              )}
            </div>
          </div>
        </StaggerContainer>
      </main>
      {/* Post-Processing Audit Report Modal */}
      <ClaimReportModal s={s} />
      <DocumentPreviewModal
        isOpen={s.showDocModal}
        onClose={s.closeDocModal}
        claimId={s.claimId}
        fileObj={s.files.length > 0 ? s.files[s.files.length - 1] : null}
        patientName={s.patientName}
        documents={s.realPreview?.documents}
        initialDocId={s.activeDocumentId}
      />

      {/* User Profile & Account Submissions Modal */}
      <UserProfileModal isOpen={s.showProfileModal} onClose={s.closeProfileModal} s={s} userName={s.userName} userEmail={s.userEmail} variant="clinical" />


      {/* Delete Document Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Document?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to remove <span className="font-semibold text-slate-700 truncate inline-block max-w-[180px] align-bottom">{docToDelete.docName}</span>?</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDocToDelete(null)}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  s.deleteDocument(docToDelete.claimId, docToDelete.docId, e);
                  setDocToDelete(null);
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
              >
                Confirm Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Claim Confirmation Modal */}
      {claimToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Claim?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to remove <span className="font-semibold text-slate-700">{claimToDelete.name}</span>?</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClaimToDelete(null)}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  s.deleteClaim(claimToDelete.id);
                  setClaimToDelete(null);
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {s.duplicateClaimId && (
        <DuplicateClaimModal
          isOpen={!!s.duplicateClaimId}
          onClose={() => {
            s.setDuplicateClaimId(null);
            s.resetState();
          }}
          onViewExisting={() => {
            const targetId = s.duplicateClaimId;
            s.setDuplicateClaimId(null);
            if (targetId) {
              s.selectClaim(targetId);
            }
          }}
          onReprocess={() => {
            s.handleReprocessAnyway();
          }}
          isReprocessing={s.isReprocessing}
        />
      )}

      {s.showIdentityMismatchModal && (
        <IdentityMismatchModal
          isOpen={s.showIdentityMismatchModal}
          isSubsequentUpload={Boolean(s.isDocumentsRequested || (s.realPreview as any)?.status === "DOCUMENTS_REQUESTED")}
          onClose={() => {
            const isSubsequent = Boolean(s.isDocumentsRequested || (s.realPreview as any)?.status === "DOCUMENTS_REQUESTED");
            const targetId = s.claimId;
            s.setShowIdentityMismatchModal(false);
            if (targetId && !isSubsequent) s.deleteClaim(targetId);
            if (!isSubsequent) s.resetState();
            s.reloadRecentClaims();
          }}
          message={s.identityMismatchMessage}
          onClearAndReupload={() => {
            const isSubsequent = Boolean(s.isDocumentsRequested || (s.realPreview as any)?.status === "DOCUMENTS_REQUESTED");
            const targetId = s.claimId;
            s.setShowIdentityMismatchModal(false);
            if (targetId && !isSubsequent) s.deleteClaim(targetId);
            if (!isSubsequent) s.resetState();
            s.reloadRecentClaims();
            s.setIsUploadOpen(true);
          }}
        />
      )}

      {/* Enterprise Portal Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-8 py-5 text-xs text-slate-600 select-none">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 text-center sm:text-left">
          {/* Left: Branding & Compliance Status */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-2.5">
            <span className="font-bold text-slate-900 tracking-tight text-sm">ClaimsGuru</span>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              by WaferWire (WCT)
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse flex-none" />
              <span>All systems operational</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">IRDAI Part A &amp; B Aligned</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">ISO 27001</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">HIPAA Aligned</span>
          </div>

          {/* Right: Policy Links & Copyright */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <Link href="/privacy&policy" className="font-semibold text-slate-600 hover:text-[#0F766E] hover:underline transition-colors">
              Privacy Policy
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/privacy&policy" className="font-semibold text-slate-600 hover:text-[#0F766E] hover:underline transition-colors">
              Terms of Service
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/delete-account" className="font-semibold text-slate-600 hover:text-rose-600 hover:underline transition-colors">
              Data Security &amp; Deletion
            </Link>
            <span className="text-slate-300">•</span>
            <span>&copy; {new Date().getFullYear()} WaferWire Cloud Technologies</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono font-medium text-slate-600">v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MetaField({
  id,
  label,
  defaultValue,
  edited,
  onEdit,
  className,
}: {
  id: string;
  label: string;
  defaultValue: string;
  edited: boolean;
  onEdit: () => void;
  className?: string;
}) {
  const [val, setVal] = useState(defaultValue);

  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
        {edited && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 animate-scale-in">
            <Clock className="h-2.5 w-2.5" />Edited
          </span>
        )}
      </div>
      <Input
        id={id}
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          onEdit();
        }}
        className="h-10 border-slate-200"
      />
    </div>
  );
}
