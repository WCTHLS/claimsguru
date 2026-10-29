'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import fullLogo from './ClaimsGuru Black PNG.png';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Sparkles,
} from 'lucide-react';
import {
  authenticateWithPassword,
  beginEntraAuthFlow,
  getAuthErrorField,
  getAuthRedirectPath,
  isEntraEnabled,
  type AuthErrorField,
} from '@/lib/auth';
import { BrandPanel } from '@/components/claimgpt/brand-panel';
import { LanguageSwitcher } from '@/components/claimgpt/language-switcher';
import { SSOButton } from '@/components/claimgpt/sso-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AuroraBackground,
  GradientText,
  MagneticButton,
  SpotlightCard,
  StaggerContainer,
  StaggerItem,
} from '@/components/claimgpt/effects';
import { cn } from '@/lib/utils';

type Role = 'patient' | 'tpa';

function formatFriendlyAuthError(msg: string): string {
  if (
    /pyodbc|OperationalError|08S01|TCP Provider|SQLExec|database synchronization error|SQL Server|SELECT id/i.test(
      msg
    )
  ) {
    return 'We are experiencing a temporary connection delay. Please tap Sign In again in a moment.';
  }
  return msg;
}

export function LoginClinical() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entraLoadingRole, setEntraLoadingRole] = useState<Role | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authErrorField, setAuthErrorField] = useState<AuthErrorField | null>(null);

  // Environment feature flag for Entra External ID
  const [useEntra, setUseEntra] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'wct-health.com') {
      window.location.replace(`https://www.wct-health.com${window.location.pathname}${window.location.search}`);
      return;
    }
    setUseEntra(isEntraEnabled());
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('deleted') === 'true') {
        setSuccessMessage('Your account, personal data, and Microsoft Entra credentials have been permanently deleted.');
      }
      const err = params.get('error');
      if (err) {
        const decoded = formatFriendlyAuthError(decodeURIComponent(err));
        setErrorMessage(decoded);
        setAuthErrorField(getAuthErrorField(decoded));
      }
      const requestedRole = params.get('role');
      if (requestedRole === 'tpa' || requestedRole === 'patient') {
        setRole(requestedRole);
      }
    }
  }, []);

  const handleEntraSignIn = async (targetRole: Role, isRegister = false) => {
    setEntraLoadingRole(targetRole);
    setErrorMessage(null);
    try {
      await beginEntraAuthFlow({ role: targetRole, isRegister });
    } catch (err) {
      setErrorMessage(formatFriendlyAuthError(err instanceof Error ? err.message : 'Unable to connect to Microsoft Entra External ID.'));
      setEntraLoadingRole(null);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setAuthErrorField(null);

    const form = e.currentTarget;
    const identifier = (form.elements.namedItem('identifier') as HTMLInputElement | null)?.value || '';
    const password = (form.elements.namedItem('pw') as HTMLInputElement | null)?.value || '';

    if (!identifier || !password) {
      setErrorMessage('Please enter your email address and password.');
      setAuthErrorField(!identifier ? 'username' : 'password');
      setSubmitting(false);
      return;
    }

    try {
      const session = await authenticateWithPassword({ username: identifier, password, role });
      if (session) {
        router.replace(getAuthRedirectPath(session));
      }
    } catch (error) {
      const message = formatFriendlyAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
      setErrorMessage(message);
      setAuthErrorField(getAuthErrorField(message));
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-background">
      <div className="hidden w-1/2 lg:block">
        <BrandPanel />
      </div>
      <div className="relative flex w-full flex-col min-h-screen overflow-y-auto overflow-x-hidden lg:w-1/2">
        <AuroraBackground />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-10 sm:py-12">
          <StaggerContainer className="my-auto w-full max-w-lg">
            <div className="mb-8 flex w-full items-center justify-between lg:hidden">
              <img src={fullLogo.src} className="h-11 sm:h-12 w-auto object-contain" alt="ClaimsGuru Logo" />
              <LanguageSwitcher variant="light" />
            </div>
            <div className="mb-8 hidden justify-end lg:flex">
              <LanguageSwitcher variant="light" />
            </div>

            <StaggerItem index={0}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Welcome to ClaimsGuru
                  </h2>
                  <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                    {useEntra ? (
                      <>Select your portal to continue with <GradientText className="font-bold">Microsoft Entra External ID</GradientText>.</>
                    ) : (
                      <>Sign in to your <GradientText className="font-bold">ClaimsGuru</GradientText> workspace to continue.</>
                    )}
                  </p>
                </div>
                {!useEntra && (
                  <button
                    type="button"
                    onClick={() => setRole(role === 'patient' ? 'tpa' : 'patient')}
                    className={cn(
                      'group relative shrink-0 text-sm font-semibold text-accent hover:underline',
                      authErrorField === 'role' ? 'text-red-400 font-bold' : ''
                    )}
                  >
                    {role === 'patient' ? 'For Organizations' : 'For Patients'}
                    <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-60 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                      {role === 'patient'
                        ? 'Sign in to manage and review claims'
                        : 'Sign in to track and submit insurance claims'}
                    </span>
                  </button>
                )}
              </div>
            </StaggerItem>

            {useEntra ? (
              /* ========================================================================= */
              /* Microsoft Entra External ID (CIAM) Flow */
              /* ========================================================================= */
              <StaggerItem index={1} className="mt-8 space-y-4 sm:space-y-5">
                {/* Continue as Patient */}
                <button
                  type="button"
                  disabled={entraLoadingRole !== null}
                  onClick={() => handleEntraSignIn('patient')}
                  className={cn(
                    "group relative flex w-full items-center justify-between rounded-2xl border-2 bg-card/90 p-5 sm:p-6 text-left shadow-sm backdrop-blur-sm transition-all hover:border-teal-500 hover:bg-teal-50/30 hover:shadow-md disabled:opacity-50",
                    errorMessage?.toLowerCase().includes('continue as patient')
                      ? 'border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/30'
                      : 'border-border/80'
                  )}
                >
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-700 border border-teal-500/25 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xs">
                      <User className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                          Continue as Patient
                        </span>
                        <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
                          Patient &amp; Insured
                        </span>
                      </div>
                      <p className="mt-1 text-sm sm:text-base text-slate-600 leading-normal">
                        Sign in to track and submit reimbursement claims
                      </p>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-teal-600 group-hover:text-white transition-all ml-3 shadow-xs">
                    {entraLoadingRole === 'patient' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                  </div>
                </button>

                {/* Continue as Organization */}
                <button
                  type="button"
                  disabled={entraLoadingRole !== null}
                  onClick={() => handleEntraSignIn('tpa')}
                  className={cn(
                    "group relative flex w-full items-center justify-between rounded-2xl border-2 bg-card/90 p-5 sm:p-6 text-left shadow-sm backdrop-blur-sm transition-all hover:border-teal-600 hover:bg-teal-50/30 hover:shadow-md disabled:opacity-50",
                    errorMessage?.toLowerCase().includes('continue as organization')
                      ? 'border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/30'
                      : 'border-border/80'
                  )}
                >
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-600/15 text-teal-800 border border-teal-600/25 group-hover:bg-teal-700 group-hover:text-white transition-all shadow-xs">
                      <Building2 className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                          Continue as Organization
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                          TPA &amp; Insurer
                        </span>
                      </div>
                      <p className="mt-1 text-sm sm:text-base text-slate-600 leading-normal">
                        Sign in to review and adjudicate claims
                      </p>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-teal-600 group-hover:text-white transition-all ml-3 shadow-xs">
                    {entraLoadingRole === 'tpa' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                  </div>
                </button>

                {successMessage && (
                  <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                    {successMessage}
                  </p>
                )}

                {errorMessage && (
                  <p className="rounded-lg border border-red-200/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {errorMessage}
                  </p>
                )}

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 pt-3 text-sm sm:text-base font-medium text-slate-600">
                  <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0" />
                  <span>Secured by Microsoft Entra External ID (CIAM)</span>
                </div>
              </StaggerItem>
            ) : (
              /* ========================================================================= */
              /* Local Email + Password Authentication (Fallback Flow) */
              /* ========================================================================= */
              <StaggerItem index={1} className="mt-8">
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="identifier">
                      {role === 'patient' ? 'Email Address or Mobile Number' : 'Work Email'}
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="identifier"
                        name="identifier"
                        type={role === 'patient' ? 'text' : 'email'}
                        inputMode="email"
                        autoComplete="username"
                        placeholder={
                          role === 'patient'
                            ? 'e.g. john@example.com or 9876543210'
                            : 'you@yourcompany.com'
                        }
                        className={cn(
                          'h-12 pl-10',
                          authErrorField === 'username' ? 'border-red-400 ring-red-400 focus-visible:ring-red-400' : ''
                        )}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pw">Password</Label>
                      <button type="button" className="text-xs font-medium text-accent hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="pw"
                        name="pw"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={cn(
                          'h-12 pl-10 pr-10',
                          authErrorField === 'password' ? 'border-red-400 ring-red-400 focus-visible:ring-red-400' : ''
                        )}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {successMessage ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                      {successMessage}
                    </p>
                  ) : null}
                  {errorMessage ? (
                    <p className="rounded-lg border border-red-200/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      {errorMessage}
                    </p>
                  ) : null}
                  <MagneticButton
                    type="submit"
                    disabled={submitting}
                    className="teal-gradient flex h-12 w-full items-center justify-center rounded-xl text-base font-semibold text-white shadow-elevation-sm"
                  >
                    {submitting ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        {role === 'patient' ? 'Sign In to Patient Portal' : 'Continue'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </MagneticButton>
                </form>

                <div className="mt-8 relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Or sign in with
                    </span>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <SSOButton provider="microsoft" />
                  <SSOButton provider="okta" />
                  <SSOButton provider="saml" />
                </div>
              </StaggerItem>
            )}

            {/* Bottom Links */}
            <StaggerItem index={2} className="mt-8 space-y-6">
              <div className="text-center">
                {useEntra ? (
                  <p className="text-base sm:text-lg text-slate-700">
                    New to ClaimsGuru?{' '}
                    <button
                      type="button"
                      onClick={() => handleEntraSignIn('patient', true)}
                      className="font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1.5 hover:underline ml-1"
                    >
                      <span>Create an account</span>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </p>
                ) : (
                  role === 'patient' && (
                    <p className="text-base sm:text-lg text-slate-700">
                      New to ClaimsGuru?{' '}
                      <Link
                        href="/register"
                        className="font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1.5 hover:underline ml-1"
                      >
                        <span>Create an account</span>
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Link>
                    </p>
                  )
                )}
              </div>

              {/* Trust highlight chips - fills empty vertical space elegantly */}
              <div className="pt-6 border-t border-slate-200/70">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
                  <div className="rounded-xl bg-white/70 backdrop-blur-xs border border-slate-200/80 p-3 shadow-2xs">
                    <div className="text-sm sm:text-base font-bold text-teal-800">100%</div>
                    <div className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">IRDAI Aligned</div>
                  </div>
                  <div className="rounded-xl bg-white/70 backdrop-blur-xs border border-slate-200/80 p-3 shadow-2xs">
                    <div className="text-sm sm:text-base font-bold text-teal-800">&lt; 3 Min</div>
                    <div className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">Claim Intake</div>
                  </div>
                  <div className="rounded-xl bg-white/70 backdrop-blur-xs border border-slate-200/80 p-3 shadow-2xs">
                    <div className="text-sm sm:text-base font-bold text-teal-800">Zero Egress</div>
                    <div className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">Data Privacy</div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>

        {/* Footer */}
        <footer className="relative z-10 border-t border-slate-200/50 bg-white/40 backdrop-blur-sm px-5 py-4 w-full">
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-2 text-center text-xs sm:text-sm text-slate-600">
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>All systems operational</span>
              </span>
              <span className="opacity-40">·</span>
              <span className="font-medium">IRDAI &amp; ISO 27001 aligned</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-slate-500 text-xs sm:text-sm">
              <span>&copy; {new Date().getFullYear()} WaferWire Cloud Technologies</span>
              <span className="opacity-40">·</span>
              <span>ClaimsGuru v1.0</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}