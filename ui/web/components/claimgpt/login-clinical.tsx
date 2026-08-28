'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import fullLogo from './ClaimsGuru White PNG.png';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { authenticateWithPassword, getAuthErrorField, getAuthRedirectPath, type AuthErrorField } from '@/lib/auth';
import { BrandPanel } from '@/components/claimgpt/brand-panel';
import { LanguageSwitcher } from '@/components/claimgpt/language-switcher';
import { SSOButton } from '@/components/claimgpt/sso-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AuroraBackground,
  GradientText,
  MagneticButton,
  StaggerContainer,
  StaggerItem,
} from '@/components/claimgpt/effects';
import { cn } from '@/lib/utils';

import { syncUserToBackend } from '@/lib/api-client';

type Role = 'patient' | 'tpa';

export function LoginClinical() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authErrorField, setAuthErrorField] = useState<AuthErrorField | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
                    Welcome back
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sign in to your{' '}
                    <GradientText className="font-semibold">
                      ClaimsGuru
                    </GradientText>{' '}
                    workspace to continue.
                  </p>
                </div>
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
              </div>
            </StaggerItem>

            <StaggerItem index={1} className="mt-8">
              <form onSubmit={handleSubmit} className="space-y-5">
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
            </StaggerItem>

            <StaggerItem index={2} className="mt-8">
              <div className="relative">
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

            <StaggerItem index={3} className="mt-8">
              <div className="text-center">
                {role === 'patient' && (
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent"
                  >
                    New to ClaimsGuru?
                    <span className="font-semibold text-accent">Create an account</span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                  </Link>
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
            <span>IRDAI - ISO 27001 - HIPAA aligned</span>
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