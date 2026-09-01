'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import fullLogo from './ClaimsGuru White PNG.png';
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

export function LoginClinical() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entraLoadingRole, setEntraLoadingRole] = useState<Role | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authErrorField, setAuthErrorField] = useState<AuthErrorField | null>(null);

  // Environment feature flag for Entra External ID
  const [useEntra, setUseEntra] = useState(false);

  useEffect(() => {
    setUseEntra(isEntraEnabled());
  }, []);

  const handleEntraSignIn = async (targetRole: Role, isRegister = false) => {
    setEntraLoadingRole(targetRole);
    setErrorMessage(null);
    try {
      await beginEntraAuthFlow({ role: targetRole, isRegister });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to connect to Microsoft Entra External ID.');
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
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
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
      <div className="relative flex w-full flex-col overflow-hidden lg:w-1/2">
        <AuroraBackground />
        <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-16">
          <StaggerContainer className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <img src={fullLogo.src} className="h-8 w-auto" alt="ClaimsGuru Logo" />
              <LanguageSwitcher variant="dark" />
            </div>
            <div className="mb-8 hidden justify-end lg:flex">
              <LanguageSwitcher variant="light" />
            </div>

            <StaggerItem index={0}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    Welcome to ClaimsGuru
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {useEntra ? (
                      <>Select your portal to continue with <GradientText className="font-semibold">Microsoft Entra External ID</GradientText>.</>
                    ) : (
                      <>Sign in to your <GradientText className="font-semibold">ClaimsGuru</GradientText> workspace to continue.</>
                    )}
                  </p>
                </div>
                {!useEntra && (
                  <button
                    type="button"
                    onClick={() => setRole(role === 'patient' ? 'tpa' : 'patient')}
                    className={cn(
                      'group relative shrink-0 text-sm font-semibold text-accent hover:underline',
                      authErrorField === 'role' ? 'text-red-400' : ''
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
              <StaggerItem index={1} className="mt-8 space-y-4">
                {/* Continue as Patient */}
                <button
                  type="button"
                  disabled={entraLoadingRole !== null}
                  onClick={() => handleEntraSignIn('patient')}
                  className="group relative flex w-full items-center justify-between rounded-2xl border-2 border-border/80 bg-card/80 p-5 text-left shadow-xs backdrop-blur-sm transition-all hover:border-teal-500 hover:bg-teal-50/20 hover:shadow-md disabled:opacity-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold text-foreground">
                          Continue as Patient
                        </span>
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200">
                          Submitter
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Sign in to track and submit insurance claims
                      </p>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground group-hover:bg-teal-600 group-hover:text-white transition-all">
                    {entraLoadingRole === 'patient' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Continue as Organization */}
                <button
                  type="button"
                  disabled={entraLoadingRole !== null}
                  onClick={() => handleEntraSignIn('tpa')}
                  className="group relative flex w-full items-center justify-between rounded-2xl border-2 border-border/80 bg-card/80 p-5 text-left shadow-xs backdrop-blur-sm transition-all hover:border-teal-600 hover:bg-teal-50/20 hover:shadow-md disabled:opacity-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-700 border border-teal-600/20 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold text-foreground">
                          Continue as Organization
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                          TPA & Insurer
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Sign in to manage and review claims
                      </p>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground group-hover:bg-teal-600 group-hover:text-white transition-all">
                    {entraLoadingRole === 'tpa' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {errorMessage && (
                  <p className="rounded-lg border border-red-200/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {errorMessage}
                  </p>
                )}

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-medium text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
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
                  <SSOButton provider="google" />
                  <SSOButton provider="microsoft" />
                  <SSOButton provider="okta" />
                  <SSOButton provider="saml" />
                </div>
              </StaggerItem>
            )}

            {/* Bottom Links */}
            <StaggerItem index={2} className="mt-8 space-y-4">
              <div className="text-center">
                {useEntra ? (
                  <button
                    type="button"
                    onClick={() => handleEntraSignIn('patient', true)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent"
                  >
                    New patient to ClaimsGuru?
                    <span className="font-semibold text-accent">Create an account</span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                  </button>
                ) : (
                  role === 'patient' && (
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent"
                    >
                      New to ClaimsGuru?
                      <span className="font-semibold text-accent">Create an account</span>
                      <ArrowRight className="h-3.5 w-3.5 text-accent" />
                    </Link>
                  )
                )}
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-auto border-t border-border/20 bg-background/50 backdrop-blur-sm px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All systems operational</span>
            <span className="opacity-40">·</span>
            <span>IRDAI · ISO 27001 · HIPAA aligned</span>
          </div>
          <div className="flex items-center gap-2">
            <span>© 2026 WaferWire Cloud Technologies</span>
            <span className="opacity-40">·</span>
            <span>ClaimsGuru v1.0</span>
          </div>
        </div>
      </div>
    </main>
  );
}