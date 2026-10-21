'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  FileText,
  UserX,
  Database,
  ExternalLink,
} from 'lucide-react';
import { clearAllLocalUserData } from '@/lib/auth';

export default function DeleteAccountPage() {
  const router = useRouter();

  // Step 1: Input state (strictly empty by default, no autofill)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Flow states
  const [step, setStep] = useState<'verify' | 'confirm' | 'success'>('verify');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verification outcome
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedUserId, setVerifiedUserId] = useState('');
  const [verificationTicket, setVerificationTicket] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [deletionTimestamp, setDeletionTimestamp] = useState<string>('');

  // Step 1: Verify credentials via ClaimsGuru
  const handleVerifyCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both your registered email and password.');
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch('/api/auth/delete-account?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          action: 'verify',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.verified) {
        const errorDetail =
          data?.error ||
          data?.message ||
          'Failed to verify credentials with ClaimsGuru. Please check your email and password.';
        setErrorMessage(errorDetail);
        setIsVerifying(false);
        return;
      }

      // Verification successful
      setVerifiedEmail(data.email || cleanEmail);
      setVerifiedName(data.name || cleanEmail.split('@')[0]);
      setVerifiedUserId(data.user_id || '');
      setVerificationTicket(data.verification_ticket || '');
      setIsVerifying(false);
      setStep('confirm');
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(
        err?.message || 'Network error verifying credentials with ClaimsGuru.'
      );
    }
  };

  // Step 2: Confirm permanent deletion
  const handleConfirmDeletion = async () => {
    if (!confirmedCheck) {
      setErrorMessage('Please confirm that you understand this action is permanent.');
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifiedEmail,
          verification_ticket: verificationTicket,
          confirm: true,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorDetail =
          data?.error || data?.message || 'Failed to permanently delete account. Please try again.';
        setErrorMessage(errorDetail);
        setIsDeleting(false);
        return;
      }

      // Clear all local session data across the browser
      clearAllLocalUserData();

      setDeletionTimestamp(new Date().toUTCString());
      setIsDeleting(false);
      setStep('success');
    } catch (err: any) {
      setIsDeleting(false);
      setErrorMessage(
        err?.message || 'An error occurred while permanently deleting your account.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-rose-500 selection:text-white antialiased">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 text-slate-700 hover:text-slate-900 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform shadow-xs">
              <Image
                src="/icon.png"
                alt="ClaimsGuru"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-slate-900 tracking-tight flex items-center gap-2">
                ClaimsGuru
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Data Privacy
                </span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/privacy&policy#retention-and-deletion"
              className="text-xs text-slate-600 hover:text-teal-700 transition-colors flex items-center gap-1.5 hidden sm:flex font-medium"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              Retention Policy (Section 5)
            </Link>
            <Link
              href="/"
              className="text-xs text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1 py-1.5 px-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white shadow-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span
              className={
                step === 'verify' ? 'text-teal-700 font-semibold' : 'text-slate-400'
              }
            >
              1. Verify Account Credentials
            </span>
            <span
              className={
                step === 'confirm' ? 'text-rose-700 font-semibold' : 'text-slate-400'
              }
            >
              2. Confirm Permanent Deletion
            </span>
            <span
              className={
                step === 'success' ? 'text-emerald-700 font-semibold' : 'text-slate-400'
              }
            >
              3. Purge Complete
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                step === 'verify'
                  ? 'w-1/3 bg-teal-600'
                  : step === 'confirm'
                  ? 'w-2/3 bg-rose-600'
                  : 'w-full bg-emerald-600'
              }`}
            />
          </div>
        </div>

        {/* ================================================================ */}
        {/* STEP 1: VERIFY IDENTITY                                          */}
        {/* ================================================================ */}
        {step === 'verify' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Permanent Account & Data Deletion
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  To safeguard your privacy, please authenticate using your registered email and
                  password. ClaimsGuru will securely verify your identity before deletion.
                </p>
              </div>
            </div>

            {/* Privacy Policy Quote Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs text-slate-700 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 mb-0.5">
                  Section 5. Data Retention & Deletion Policy
                </p>
                <p className="text-slate-600 leading-relaxed">
                  When an account deletion is confirmed, all personal profiles, identity records,
                  ClaimsGuru credentials, and medical documents will be permanently purged from active systems.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <form
              onSubmit={handleVerifyCredentials}
              className="space-y-4"
              autoComplete="off"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    name="delete_account_user_email"
                    id="delete_account_user_email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    autoComplete="off"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="delete_account_user_password"
                    id="delete_account_user_password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    autoComplete="new-password"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying with ClaimsGuru...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Verify Identity with ClaimsGuru
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                Prefer email request instead?{' '}
                <a
                  href="mailto:info@waferwire.com?subject=ClaimsGuru%20Data%20Deletion%20Request"
                  className="text-teal-700 hover:text-teal-800 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Email Privacy Team
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: CONFIRM PERMANENT ERASURE                                */}
        {/* ================================================================ */}
        {step === 'confirm' && (
          <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Verified Badge Header */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-900">
                    ClaimsGuru Account Verified
                  </p>
                  <p className="text-xs text-emerald-700 font-mono">
                    {verifiedEmail}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Authorized
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Confirm Irreversible Account Deletion
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                You are about to permanently erase account <strong className="text-slate-900">{verifiedEmail}</strong>. This action is instantaneous, complete, and cannot be undone.
              </p>
            </div>

            {/* Data Purge Scope Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                The following records will be permanently erased:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <UserX className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">ClaimsGuru Account & Security Credentials</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Customer credentials, active authentication tokens & account profile
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <Database className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Patient Profile & PHI</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Demographics, policy numbers, phone numbers and user identity roles
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <FileText className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Medical Claims & Documents</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      All uploaded bills, discharge summaries, prescriptions & cloud storage files
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Audit & Adjudication Logs</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      OCR predictions, medical coding results, and review histories
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Mandatory Confirmation Checkbox */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl mb-6">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmedCheck}
                  onChange={(e) => setConfirmedCheck(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  I understand that this action is <strong className="text-rose-700 font-semibold">permanent and irreversible</strong>. My account, ClaimsGuru credentials, and all medical records will be permanently purged in accordance with Section 5 of ClaimsGuru Privacy Policy.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('verify');
                  setPassword('');
                  setErrorMessage(null);
                }}
                disabled={isDeleting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeletion}
                disabled={!confirmedCheck || isDeleting}
                className="w-full sm:flex-1 py-3 px-5 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Purging Account & Credentials...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Account Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: DELETION COMPLETE CONFIRMATION                           */}
        {/* ================================================================ */}
        {step === 'success' && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Account Permanently Deleted
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Your ClaimsGuru account, credentials, personal profile, and attached medical claim records have been permanently purged from our systems.
            </p>

            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto text-left text-xs space-y-2 font-mono text-slate-600">
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span>Account Email:</span>
                <span className="text-slate-900 font-semibold">{verifiedEmail}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span>Status:</span>
                <span className="text-emerald-700 font-semibold">Permanently Erased</span>
              </div>
              {deletionTimestamp && (
                <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                  <span>Timestamp:</span>
                  <span className="text-slate-700">{deletionTimestamp}</span>
                </div>
              )}
              <div className="flex justify-between pt-0.5">
                <span>Policy Clause:</span>
                <span className="text-slate-700">Section 5.B Data Retention</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                Return to Homepage
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs"
              >
                Create New Account
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} ClaimsGuru &bull; WaferWire Cloud Technologies. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
