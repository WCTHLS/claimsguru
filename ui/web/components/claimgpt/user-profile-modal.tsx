'use client';

import { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  FileText,
  X,
  Mail,
  CreditCard,
  Users,
  CheckCircle2,
  ChevronRight,
  Copy,
  Check,
  Calendar,
  Phone,
  Building2,
  IndianRupee,
  LogOut,
  LogIn,
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type AuditorState } from '@/components/claimgpt/use-auditor-state';
import { getStoredAuthSession, clearAuthSession, deleteUserAccount } from '@/lib/auth';
import { getIngressApiUrl } from '@/lib/api-client';
import { UserAvatar } from '@/components/claimgpt/user-avatar';
import { formatDob } from '@/lib/claimgpt-data';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  s: AuditorState;
  userName: string;
  userEmail: string;
  variant?: 'neon' | 'clinical' | 'executive';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  s,
  userName,
  userEmail,
  variant = 'clinical',
}) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [userMeta, setUserMeta] = useState({
    dob: '01/01/2000',
    gender: 'Male',
    insurer: 'Star Health',
    policyNo: 'P-0007401',
    sumInsured: '₹5,000,000',
  });

  const session = getStoredAuthSession();
  const isTpa = session?.role === 'tpa' || session?.accountRole === 'admin' || session?.accountRole === 'reviewer';

  const handleLogout = () => {
    try {
      localStorage.removeItem('claimgpt_user_name');
      localStorage.removeItem('claimgpt_user_email');
    } catch {
      /* ignore */
    }
    clearAuthSession();
    onClose();
    router.push('/login');
  };

  const handleSwitchAccount = () => {
    onClose();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const currentEmail = userEmail || session?.user?.email || '';
      const currentUserId = session?.user?.id || session?.user?.sub || '';

      const res = await deleteUserAccount(currentUserId, currentEmail);
      if (res && res.success) {
        onClose();
        router.push('/login?deleted=true');
      } else {
        setDeleteError('Failed to delete account. Please try again.');
        setIsDeleting(false);
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Error occurred while deleting account.');
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    try {
      const session = getStoredAuthSession();
      const currentEmail = userEmail || session?.user?.email || '';
      const emailKey = currentEmail.toLowerCase();

      const rawDob =
        localStorage.getItem(`claimgpt_user_dob_${emailKey}`) ||
        localStorage.getItem(`claimgpt_user_dob_${currentEmail}`) ||
        localStorage.getItem('claimgpt_user_dob');
      const insurer =
        localStorage.getItem(`claimgpt_user_insurer_${emailKey}`) ||
        localStorage.getItem(`claimgpt_user_insurer_${currentEmail}`) ||
        localStorage.getItem('claimgpt_user_insurer');
      const policy =
        localStorage.getItem(`claimgpt_user_policy_${emailKey}`) ||
        localStorage.getItem(`claimgpt_user_policy_${currentEmail}`) ||
        localStorage.getItem('claimgpt_user_policy');
      const sum =
        localStorage.getItem(`claimgpt_user_sum_${emailKey}`) ||
        localStorage.getItem(`claimgpt_user_sum_${currentEmail}`) ||
        localStorage.getItem('claimgpt_user_sum');
      const gender =
        localStorage.getItem(`claimgpt_user_gender_${emailKey}`) ||
        localStorage.getItem(`claimgpt_user_gender_${currentEmail}`) ||
        localStorage.getItem('claimgpt_user_gender');

      setUserMeta({
        dob: formatDob(rawDob || '01012000'),
        gender: gender || 'Male',
        insurer: insurer || (session?.role === 'tpa' ? 'TPA Adjuster Org' : 'Star Health'),
        policyNo: policy || (session?.role === 'tpa' ? 'TPA-90021' : 'P-0007401'),
        sumInsured: sum
          ? (sum.startsWith('₹') ? sum : `₹${Number(sum).toLocaleString('en-IN')}`)
          : '₹5,000,000',
      });

      // Always fetch live profile from backend database to ensure 100% sync across devices and Incognito
      if (currentEmail) {
        const ingressBase = getIngressApiUrl().replace(/\/+$/, '');
        fetch(`${ingressBase}/auth/profile/${encodeURIComponent(currentEmail)}`)
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (data && data.success) {
              if (data.policy_number) {
                localStorage.setItem(`claimgpt_user_policy_${emailKey}`, data.policy_number);
                localStorage.setItem('claimgpt_user_policy', data.policy_number);
              }
              if (data.sum_insured) {
                localStorage.setItem(`claimgpt_user_sum_${emailKey}`, String(data.sum_insured));
                localStorage.setItem('claimgpt_user_sum', String(data.sum_insured));
              }
              if (data.dob) {
                localStorage.setItem(`claimgpt_user_dob_${emailKey}`, data.dob);
                localStorage.setItem('claimgpt_user_dob', data.dob);
              }
              if (data.gender) {
                localStorage.setItem(`claimgpt_user_gender_${emailKey}`, data.gender);
                localStorage.setItem('claimgpt_user_gender', data.gender);
              }
              if (data.name) {
                localStorage.setItem(`claimgpt_user_name_${emailKey}`, data.name);
                localStorage.setItem('claimgpt_user_name', data.name);
              }

              setUserMeta(prev => ({
                ...prev,
                policyNo: data.policy_number || prev.policyNo,
                dob: data.dob ? formatDob(data.dob) : prev.dob,
                gender: data.gender || prev.gender,
                sumInsured: data.sum_insured
                  ? `₹${Number(data.sum_insured).toLocaleString('en-IN')}`
                  : prev.sumInsured,
                insurer: data.organization || prev.insurer,
              }));
            }
          })
          .catch(() => {});
      }
    } catch {
      /* ignore localStorage error */
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  // Generate 2-letter initials (e.g. Kareem Rossi -> KR, Swagath -> SW, Nivas -> NV)
  const nameParts = userName.trim().split(' ');
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : userName.slice(0, 2).toUpperCase();

  const handleCopyPolicy = () => {
    try {
      navigator.clipboard.writeText(userMeta.policyNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  };

  // Compute family member / patient claim list under this account
  const accountClaims = s.recentClaims.length > 0
    ? s.recentClaims
    : [
        {
          id: s.claimId || 'CLM-18091900',
          patient_name: s.patientName || 'Suresh',
          status: 'COMPLETED',
          created_at: 'Today',
          total_amount: s.total ? `₹${s.total.toLocaleString('en-IN')}` : '₹12,500',
        },
      ];

  /* Theme-specific styles matching Design 1 (neon), Design 2 (clinical), and Design 3 (executive) */
  const themeStyles = {
    neon: {
      cardBg: 'bg-[#090e1a]/95 border-cyan-500/30 text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.15)]',
      headerBg: 'bg-cyan-950/40 border-b border-cyan-500/20',
      headerPill: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
      initialsBox: 'bg-gradient-to-tr from-cyan-500 to-purple-600 text-white border border-cyan-400/40 shadow-lg shadow-cyan-500/20',
      policyPill: 'bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-100',
      tagBadge: 'bg-cyan-400 text-slate-950 font-bold',
      gridBlock: 'bg-cyan-950/30 border border-cyan-500/20',
      labelColor: 'text-cyan-400/80',
      valueColor: 'text-white',
      accentValue: 'text-cyan-300',
      sumValue: 'text-emerald-400',
      divider: 'border-cyan-500/20',
      closeBtn: 'text-cyan-300 hover:bg-cyan-500/20 hover:text-white',
      mobileBtn: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      switchAccountBtn: 'border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200',
    },
    clinical: {
      cardBg: 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl',
      headerBg: 'bg-slate-50 border-b border-slate-200',
      headerPill: 'bg-teal-50 text-teal-700 border border-teal-200',
      initialsBox: 'bg-teal-600 text-white font-bold shadow-sm',
      policyPill: 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800',
      tagBadge: 'bg-teal-600 text-white font-bold',
      gridBlock: 'bg-slate-50 border border-slate-200',
      labelColor: 'text-teal-700',
      valueColor: 'text-slate-900',
      accentValue: 'text-teal-800',
      sumValue: 'text-teal-700',
      divider: 'border-slate-200',
      closeBtn: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
      mobileBtn: 'bg-teal-600 hover:bg-teal-700 text-white',
      switchAccountBtn: 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700',
    },
    executive: {
      cardBg: 'bg-[#060b18]/95 border-amber-500/30 text-amber-50 shadow-[0_0_50px_rgba(245,158,11,0.15)]',
      headerBg: 'bg-amber-950/40 border-b border-amber-500/20',
      headerPill: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      initialsBox: 'bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 border border-amber-400/40 font-bold shadow-lg shadow-amber-500/20',
      policyPill: 'bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/30 text-amber-100',
      tagBadge: 'bg-amber-400 text-slate-950 font-bold',
      gridBlock: 'bg-amber-950/30 border border-amber-500/20',
      labelColor: 'text-amber-400/80',
      valueColor: 'text-white',
      accentValue: 'text-amber-300',
      sumValue: 'text-amber-400',
      divider: 'border-amber-500/20',
      closeBtn: 'text-amber-300 hover:bg-amber-500/20 hover:text-white',
      mobileBtn: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold',
      switchAccountBtn: 'border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/50 text-amber-200',
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-0 sm:block overflow-hidden font-sans">
      {/* Click outside backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose} 
      />

      {/* Profile Card */}
      <div className={`relative w-full max-w-[360px] sm:max-w-none sm:absolute sm:top-16 sm:right-6 z-[101] sm:w-[380px] max-h-[82vh] sm:max-h-[85vh] flex flex-col rounded-3xl border backdrop-blur-2xl overflow-hidden animate-scale-in sm:animate-slide-down ${themeStyles.cardBg}`}>
        
        {/* Top Header Pill Bar */}
        <div className={`flex items-center justify-between px-4 pt-3.5 pb-2 flex-none ${themeStyles.headerBg}`}>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold backdrop-blur-md ${themeStyles.headerPill}`}>
            <User className="h-3.5 w-3.5" />
            <span>{isTpa ? (session?.accountRole === 'admin' ? 'Org Admin Profile' : 'TPA Reviewer Profile') : 'Patient Profile'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${themeStyles.closeBtn}`}
            title="Close profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1 min-h-0 scrollbar-thin">
          
          {/* Main User Banner */}
          <div className="flex items-start gap-3.5 pt-0.5">
            {/* Colorful Illustrated Avatar */}
            <UserAvatar name={userName} gender={userMeta.gender} size="xl" className="shadow-md" />

            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className={`text-base sm:text-lg font-bold tracking-tight truncate ${themeStyles.valueColor}`}>{userName}</h2>
              
              {/* Badges Row */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-[11px]">
                {isTpa ? (
                  <>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${themeStyles.policyPill}`}>
                      <Building2 className="h-3 w-3 opacity-80" />
                      <span>{session?.organization || userMeta.insurer || 'Star Health'}</span>
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase ${themeStyles.tagBadge}`}>
                      {session?.accountRole === 'admin' ? 'Administrator' : 'Reviewer'}
                    </span>
                  </>
                ) : (
                  <>
                    {/* Policy ID with copy */}
                    <button
                      type="button"
                      onClick={handleCopyPolicy}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium transition-colors ${themeStyles.policyPill}`}
                      title="Copy Policy Number"
                    >
                      <span>{userMeta.policyNo}</span>
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 opacity-80" />}
                    </button>

                    {/* Status tag */}
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase ${themeStyles.tagBadge}`}>
                      Active Policy
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2-Column Grid of Registration Fields */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* EMAIL ADDRESS / CONTACT */}
            <div className={`col-span-2 rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
              <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                <Mail className="h-3 w-3" /> EMAIL ADDRESS / CONTACT
              </span>
              <p className={`font-bold truncate text-xs ${themeStyles.valueColor}`}>{userEmail}</p>
            </div>

            {isTpa ? (
              <>
                {/* ORGANIZATION */}
                <div className={`col-span-2 rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                    <Building2 className="h-3 w-3" /> ORGANIZATION
                  </span>
                  <p className={`font-bold truncate text-xs ${themeStyles.valueColor}`}>{session?.organization || userMeta.insurer || 'Star Health'}</p>
                </div>

                {/* STAFF ROLE */}
                <div className={`rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                    <ShieldCheck className="h-3 w-3" /> STAFF ROLE
                  </span>
                  <p className={`font-bold truncate text-xs ${themeStyles.accentValue}`}>{session?.accountRole === 'admin' ? 'Administrator' : 'Claims Reviewer'}</p>
                </div>

                {/* AUTH PROVIDER */}
                <div className={`rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                    <Users className="h-3 w-3" /> AUTH PROVIDER
                  </span>
                  <p className={`font-bold truncate text-xs ${themeStyles.valueColor}`}>{session?.provider === 'entra' ? 'Microsoft Entra' : 'Local / SSO'}</p>
                </div>
              </>
            ) : (
              <>
                {/* DATE OF BIRTH */}
                <div className={`rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                    <Calendar className="h-3 w-3" /> DATE OF BIRTH
                  </span>
                  <p className={`font-bold truncate text-xs ${themeStyles.valueColor}`}>{userMeta.dob}</p>
                </div>

                {/* GENDER */}
                <div className={`rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                    <User className="h-3 w-3" /> GENDER
                  </span>
                  <p className={`font-bold truncate text-xs ${themeStyles.accentValue}`}>{userMeta.gender}</p>
                </div>

                {/* INSURER PROVIDER */}
                <div className={`rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                    <Building2 className="h-3 w-3" /> INSURER
                  </span>
                  <p className={`font-bold truncate text-xs ${themeStyles.valueColor}`}>{userMeta.insurer}</p>
                </div>

                {/* POLICY NUMBER */}
                <div className={`rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                    <CreditCard className="h-3 w-3" /> POLICY NO.
                  </span>
                  <p className={`font-bold truncate text-xs ${themeStyles.valueColor}`}>{userMeta.policyNo}</p>
                </div>

                {/* SUM INSURED (INR) */}
                <div className={`col-span-2 rounded-2xl p-2.5 space-y-0.5 backdrop-blur-md ${themeStyles.gridBlock}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${themeStyles.labelColor}`}>
                    <IndianRupee className="h-3 w-3" /> SUM INSURED (INR)
                  </span>
                  <p className={`font-bold text-xs sm:text-sm truncate ${themeStyles.sumValue}`}>{userMeta.sumInsured}</p>
                </div>
              </>
            )}
          </div>

          {/* Family & Account Member Claims Submissions */}
          <div className={`space-y-2 pt-2 border-t ${themeStyles.divider}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold uppercase tracking-wider text-[10px] ${themeStyles.labelColor}`}>
                {isTpa ? `Claims in ${session?.organization || 'Organization'}` : `Submissions under ${userName}'s Account`}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${themeStyles.headerPill}`}>
                {accountClaims.length} Claims
              </span>
            </div>

            <div className="space-y-1.5 max-h-[130px] overflow-y-auto">
              {accountClaims.map((claim, idx) => (
                <div
                  key={claim.id || idx}
                  onClick={() => {
                    s.selectClaim(claim.id);
                    onClose();
                  }}
                  className={`flex items-center justify-between rounded-xl p-2 transition-all cursor-pointer group text-xs ${themeStyles.gridBlock}`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[11px] font-bold truncate ${themeStyles.valueColor}`}>
                        Patient: {claim.patient_name || 'Suresh'}
                      </p>
                      {claim.patient_name && claim.patient_name.toLowerCase() !== userName.toLowerCase() && (
                        <span className="rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-400/30 px-1 py-0.2 text-[8px] font-bold uppercase">
                          Family
                        </span>
                      )}
                    </div>
                    <p className={`text-[9px] truncate mt-0.5 ${themeStyles.labelColor}`}>
                      ID: {claim.id.slice(0, 8)}... &bull; {claim.total_amount || '₹12,500'}
                    </p>
                  </div>

                  <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5 flex-none">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions: Switch Account & Sign Out */}
        <div className={`p-3 border-t flex items-center gap-2 flex-none ${themeStyles.headerBg}`}>
          <button
            type="button"
            onClick={handleSwitchAccount}
            className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 ${themeStyles.switchAccountBtn}`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Switch Account</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 rounded-xl py-2 px-3 text-xs font-semibold bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Danger Zone: Delete Account */}
        <div className="px-3 py-2 border-t border-rose-500/20 bg-rose-500/5 flex items-center justify-between flex-none">
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            <ShieldAlert className="h-3.5 w-3.5 flex-none text-rose-500" />
            <span>Danger Zone</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setShowDeleteConfirm(true);
            }}
            className="rounded-lg py-1 px-2.5 text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
          >
            <Trash2 className="h-3 w-3 text-rose-500" />
            <span>Delete Account</span>
          </button>
        </div>

        {/* Delete Account Confirmation Dialog Overlay */}
        {showDeleteConfirm && (
          <div 
            className="absolute inset-0 z-50 backdrop-blur-md flex flex-col justify-center items-center p-5 text-center animate-fade-in rounded-3xl"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)' }}
          >
            <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-3 shadow-xs">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1.5 tracking-tight">
              Permanently Delete Account?
            </h3>

            <p className="text-xs text-slate-600 max-w-xs mb-3.5 leading-relaxed font-normal">
              This action <span className="text-rose-600 font-semibold underline decoration-rose-300 underline-offset-2">cannot be undone</span>. All your personal data, claims, and records will be permanently deleted from ClaimsGuru.
            </p>

            <div 
              className="w-full max-w-xs rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 mb-4 text-left text-[11px] space-y-1 shadow-2xs"
            >
              <div className="flex items-center gap-1.5 font-semibold text-rose-700">
                <Trash2 className="h-3.5 w-3.5 text-rose-600 flex-none" />
                <span>Account to be erased:</span>
              </div>
              <p className="font-mono text-slate-900 truncate pl-5 text-[11px] font-semibold">{userEmail || userName}</p>
            </div>

            {deleteError && (
              <div className="w-full max-w-xs rounded-xl bg-rose-100 border border-rose-300 p-2.5 mb-3 text-xs text-rose-800 text-left">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-2.5 w-full max-w-xs">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                className="flex-1 rounded-xl py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-300 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="flex-1 rounded-xl py-2 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md shadow-rose-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
