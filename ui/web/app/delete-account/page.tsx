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
  Info,
  Building,
  Smartphone,
  FileCheck,
  HelpCircle,
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
      setErrorMessage(
        'Please confirm that you understand and authorize this deletion request.'
      );
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
          data?.error ||
          data?.message ||
          'Failed to process account deletion request. Please try again.';
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
        err?.message ||
          'An error occurred while processing your account deletion request.'
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
              href="/privacy-policy#account-and-data-deletion"
              className="text-xs text-slate-600 hover:text-teal-700 transition-colors flex items-center gap-1.5 hidden sm:flex font-medium"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              Privacy Policy (Section 7 &amp; 8)
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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span
              className={
                step === 'verify'
                  ? 'text-teal-700 font-semibold'
                  : 'text-slate-400'
              }
            >
              1. Verify Account Credentials
            </span>
            <span
              className={
                step === 'confirm'
                  ? 'text-rose-700 font-semibold'
                  : 'text-slate-400'
              }
            >
              2. Confirm Deletion Request
            </span>
            <span
              className={
                step === 'success'
                  ? 'text-emerald-700 font-semibold'
                  : 'text-slate-400'
              }
            >
              3. Request Processed
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
        {/* STEP 1: VERIFY IDENTITY & INFORMATIONAL DISCLOSURES              */}
        {/* ================================================================ */}
        {step === 'verify' && (
          <div className="space-y-6">
            {/* Primary Action Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Account &amp; Personal Information Deletion
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    ClaimsGuru, operated by <strong>WaferWire LLC</strong>, allows
                    users to request deletion of their accounts and associated
                    personal information.
                  </p>
                </div>
              </div>

              {/* No-Reinstall Notice Box */}
              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl mb-6 text-xs text-teal-900 flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-teal-950">
                    Direct Web Deletion Request
                  </p>
                  <p className="text-teal-800 leading-relaxed mt-0.5">
                    You can request deletion using the process below without
                    reinstalling the ClaimsGuru mobile application.
                  </p>
                </div>
              </div>

              {/* Legal Verification Notice */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs text-slate-700 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 mb-0.5">
                    Verification &amp; Privacy Policy Notice
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    This page explains how to request account deletion. Actual
                    deletion is subject to identity verification, applicable
                    legal requirements, and the data-retention practices
                    described in our{' '}
                    <Link
                      href="/privacy-policy#account-and-data-deletion"
                      className="text-teal-700 font-medium hover:underline inline-flex items-center gap-0.5"
                    >
                      Privacy Policy (Section 7 &amp; Section 8)
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    .
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">
                    {errorMessage}
                  </span>
                </div>
              )}

              {/* Step 1 Verification Form */}
              <form
                onSubmit={handleVerifyCredentials}
                className="space-y-4"
                autoComplete="off"
              >
                <div>
                  <label
                    htmlFor="delete_account_user_email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
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
                  <label
                    htmlFor="delete_account_user_password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
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
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                        Verifying Credentials with ClaimsGuru...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Verify Credentials &amp; Continue
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Informational Policy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* What Information Is Deleted? */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-emerald-700 mb-3 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h3>What Information Is Deleted?</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  After we verify and process your request, we permanently delete
                  personal information associated with your account from our systems.
                  We do not keep any records or backup copies once your account is deleted.
                  Depending on your account and usage, deleted records include:
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>Account profile and contact information.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>Authentication credentials and account identifiers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>Uploaded medical documents and insurance policy files.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>Extracted document information and OCR results.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>Claim-related personal information and associated application records.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>Device identifiers and push-notification tokens associated with the account.</span>
                  </li>
                </ul>
              </div>

              {/* Information That May Be Retained */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-amber-700 mb-3 font-semibold text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <h3>Information That May Be Retained</h3>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900">
                    <p className="font-semibold text-amber-950 mb-0.5">
                      Third-Party Insurers &amp; TPAs
                    </p>
                    <p>
                      Information previously submitted to an insurer or
                      Third-Party Administrator (TPA) by the user action may also be subject to that
                      organization&apos;s independent retention obligations.
                      Deleting your ClaimsGuru account does not automatically
                      delete records held independently by an insurer or TPA.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Contact Information Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-teal-600" />
                Contact Information
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                If you have any query or need support, contact{' '}
                <a
                  href="mailto:info@waferwire.com"
                  className="text-teal-700 font-semibold hover:underline"
                >
                  info@waferwire.com
                </a>
                .
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Application:</span>
                  <span className="font-semibold text-slate-800">ClaimsGuru</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Company:</span>
                  <span className="font-semibold text-slate-800">WaferWire LLC</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email:</span>
                  <a
                    href="mailto:info@waferwire.com"
                    className="font-semibold text-teal-700 hover:underline"
                  >
                    info@waferwire.com
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block">Privacy Policy:</span>
                  <a
                    href="https://www.wct-health.com/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-teal-700 hover:underline break-all inline-flex items-center gap-1"
                  >
                    https://www.wct-health.com/privacy-policy
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: CONFIRM DELETION REQUEST                                 */}
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
                Identity Verified
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Confirm Account Deletion Request
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                You are requesting deletion of account{' '}
                <strong className="text-slate-900">{verifiedEmail}</strong>.
                After we verify and process your request, we permanently delete
                your account, credentials, and all associated personal information.
                We do not keep any records or backup copies once your account is deleted.
              </p>
            </div>

            {/* What Information Is Deleted Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Information Subject to Deletion:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <UserX className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Profile &amp; Contact Info
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Account profile, contact details, and user identifiers
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Authentication Credentials
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Authentication credentials and account identifiers
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <FileText className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Uploaded Documents &amp; Policy Files
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Uploaded medical documents and insurance policy files
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <FileCheck className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Extracted Data &amp; OCR Results
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Extracted document information and OCR analysis results
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <Database className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Claim-Related Application Records
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Claim-related personal information and associated application records
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <Smartphone className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Device &amp; Notification Tokens
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Device identifiers and push-notification tokens
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Retention Notice Box */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl mb-6 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Third-Party Insurers &amp; TPAs Retention</span>
              </div>
              <p className="leading-relaxed font-medium">
                Information previously submitted to an insurer or Third-Party
                Administrator (TPA) by the user action may also be subject to that organization&apos;s
                independent retention obligations. Deleting your ClaimsGuru account
                does not automatically delete records held independently by an
                insurer or TPA.
              </p>
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
                  I understand that this request will permanently delete my account and
                  associated personal information (no records or backup copies are kept once deleted),
                  in accordance with{' '}
                  <strong className="text-rose-800 font-semibold">
                    Section 7 (Data Retention) and Section 8 (Account and Data Deletion)
                  </strong>{' '}
                  of the ClaimsGuru Privacy Policy.
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
                    Processing Account Deletion Request...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Account Deletion
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: DELETION PROCESSED CONFIRMATION                          */}
        {/* ================================================================ */}
        {step === 'success' && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Account Deletion Request Processed
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
              Your request to delete account{' '}
              <strong className="text-slate-900">{verifiedEmail}</strong> has been
              processed. In accordance with Section 7 and Section 8 of our Privacy
              Policy, your account and associated personal information have been permanently deleted.
              We do not keep any records or backup copies once deleted.
            </p>

            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-lg mx-auto text-left text-xs space-y-2.5 font-mono text-slate-600">
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span>Account Email:</span>
                <span className="text-slate-900 font-semibold">{verifiedEmail}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span>Request Status:</span>
                <span className="text-emerald-700 font-semibold">Processed</span>
              </div>
              {deletionTimestamp && (
                <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                  <span>Timestamp:</span>
                  <span className="text-slate-700">{deletionTimestamp}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span>Policy Clauses:</span>
                <span className="text-slate-800">
                  Section 7 (Data Retention) &amp; Section 8 (Account and Data Deletion)
                </span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span>Support:</span>
                <a
                  href="mailto:info@waferwire.com"
                  className="text-teal-700 underline font-semibold"
                >
                  info@waferwire.com
                </a>
              </div>
            </div>

            {/* Insurer / TPA Notice */}
            <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl max-w-lg mx-auto text-left text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">
                Notice regarding Insurers &amp; TPAs:
              </p>
              <p>
                Information previously submitted to an insurer or Third-Party
                Administrator (TPA) by the user action remains subject to that organization&apos;s
                independent retention obligations. Deleting your ClaimsGuru account
                does not automatically delete records held independently by an
                insurer or TPA.
              </p>
              <p className="pt-1 text-slate-500">
                If you have any query or need support, contact{' '}
                <a
                  href="mailto:info@waferwire.com"
                  className="text-teal-700 font-medium hover:underline"
                >
                  info@waferwire.com
                </a>
                .
              </p>
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
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-y-2">
        <p>
          &copy; {new Date().getFullYear()} ClaimsGuru &bull; Operated by{' '}
          <strong className="text-slate-700">WaferWire LLC</strong>. All rights
          reserved.
        </p>
        <p className="space-x-3 text-slate-400">
          <Link
            href="/privacy-policy"
            className="text-slate-600 hover:text-teal-700 transition-colors"
          >
            Privacy Policy
          </Link>
          <span>&bull;</span>
          <a
            href="mailto:info@waferwire.com"
            className="text-slate-600 hover:text-teal-700 transition-colors"
          >
            info@waferwire.com
          </a>
          <span>&bull;</span>
          <Link
            href="/delete-account"
            className="text-slate-600 hover:text-teal-700 transition-colors"
          >
            Account Deletion
          </Link>
        </p>
      </footer>
    </div>
  );
}
