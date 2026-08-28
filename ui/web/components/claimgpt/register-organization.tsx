'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type AuthRole } from '@/lib/auth';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Lock,
  User,
  UserCircle,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/claimgpt/language-switcher';
import { SSOButton } from '@/components/claimgpt/sso-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AuroraBackground,
  GradientText,
  MagneticButton,
  SpotlightCard,
  StaggerContainer,
  StaggerItem,
} from '@/components/claimgpt/effects';

export function RegisterOrganization() {
  const router = useRouter();
  const role: AuthRole = 'tpa';
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const form = e.currentTarget;
    const firstName = (form.elements.namedItem('o-firstName') as HTMLInputElement | null)?.value || '';
    const lastName = (form.elements.namedItem('o-lastName') as HTMLInputElement | null)?.value || '';
    const email = (form.elements.namedItem('o-contact') as HTMLInputElement | null)?.value || '';
    const mobile = (form.elements.namedItem('o-mobile') as HTMLInputElement | null)?.value || '';
    const organization = (form.elements.namedItem('o-organization') as HTMLInputElement | null)?.value || '';
    const employeeId = (form.elements.namedItem('o-employeeId') as HTMLInputElement | null)?.value || '';
    const password = (form.elements.namedItem('o-pw') as HTMLInputElement | null)?.value || '';
    const confirmPassword = (form.elements.namedItem('o-confirmPw') as HTMLInputElement | null)?.value || '';

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please enter your work email address and password.');
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      setSubmitting(false);
      return;
    }

    try {
      const passwordHash = await (globalThis as typeof globalThis & { crypto: Crypto }).crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(password),
      ).then((digest) => Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join(''));

      const payload: Record<string, unknown> = {
        username: email,
        password_hash: `sha256$${passwordHash}`,
        role,
        first_name: firstName,
        last_name: lastName,
        phone: mobile || undefined,
        organization,
        employee_id: employeeId || undefined,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof (data as any).error === 'string' ? (data as any).error : 'Unable to create the account.');
      }

      router.replace('/login?registered=1');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete registration.');
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-slate-50">
      <AuroraBackground variant="light" />
      <header className="relative z-20 sticky top-0 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <LanguageSwitcher variant="light" />
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <StaggerContainer className="mx-auto max-w-2xl">
          <StaggerItem index={0}>
            <div className="mb-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                <UserCircle className="h-4 w-4" />
                Organization Admin Registration
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Add an <GradientText>Organization</GradientText>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Register your TPA or insurer organization to manage and review claims on ClaimsGuru.
            </p>
          </StaggerItem>

          <StaggerItem index={1} className="mt-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SSOButton provider="google" />
              <SSOButton provider="microsoft" />
              <SSOButton provider="okta" />
            </div>
          </StaggerItem>

          <StaggerItem index={2} className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Or register with email
                </span>
              </div>
            </div>
          </StaggerItem>

          <StaggerItem index={3} className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact */}
              <SpotlightCard className="bg-white p-5 shadow-elevation-sm sm:p-6">
                <fieldset>
                  <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-accent">
                    Contact
                  </legend>
                  <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="o-firstName">First Name</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="o-firstName" name="o-firstName" placeholder="e.g. John" className="h-11 pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="o-lastName">Last Name</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="o-lastName" name="o-lastName" placeholder="e.g. Doe" className="h-11 pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="o-contact">Work Email Address</Label>
                      <Input id="o-contact" name="o-contact" type="email" inputMode="email" placeholder="e.g. john@yourcompany.com" className="h-11" required />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="o-mobile">Mobile Number</Label>
                      <Input id="o-mobile" name="o-mobile" type="tel" inputMode="tel" placeholder="e.g. 9876543210" className="h-11" />
                    </div>
                  </div>
                </fieldset>
              </SpotlightCard>

              {/* Organization */}
              <SpotlightCard className="bg-white p-5 shadow-elevation-sm sm:p-6">
                <fieldset>
                  <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-accent">
                    Organization
                  </legend>
                  <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="o-organization">Organization (Insurer / TPA)</Label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="o-organization" name="o-organization" placeholder="e.g. Medi Assist" className="h-11 pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="o-employeeId">Employee ID</Label>
                      <Input id="o-employeeId" name="o-employeeId" placeholder="e.g. EMP-12345" className="h-11" />
                    </div>
                  </div>
                </fieldset>
              </SpotlightCard>

              {/* Security */}
              <SpotlightCard className="bg-white p-5 shadow-elevation-sm sm:p-6">
                <fieldset>
                  <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-accent">
                    Security
                  </legend>
                  <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="o-pw">Password</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="o-pw" name="o-pw" type="password" placeholder="••••••••" className="h-11 pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="o-confirmPw">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="o-confirmPw" name="o-confirmPw" type="password" placeholder="••••••••" className="h-11 pl-10" required />
                      </div>
                    </div>
                  </div>
                </fieldset>
              </SpotlightCard>

              <div className="flex items-start gap-3">
                <Checkbox id="o-agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
                <Label htmlFor="o-agree" className="text-sm leading-relaxed text-muted-foreground">
                  I agree to the <span className="font-medium text-accent">Terms of Service</span>,{' '}
                  <span className="font-medium text-accent">Privacy Policy</span>, and{' '}
                  <span className="font-medium text-accent">data protection</span> processing terms.
                </Label>
              </div>

              {errorMessage ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {errorMessage}
                </p>
              ) : null}
              <MagneticButton
                type="submit"
                disabled={submitting || !agree}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-white shadow-elevation-sm disabled:opacity-50"
              >
                {submitting ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Register Organization
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </MagneticButton>
            </form>
          </StaggerItem>

          <StaggerItem index={4} className="mt-6">
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Registering as a patient instead?{' '}
              <Link href="/register" className="font-semibold text-accent hover:underline">
                Create a patient account
              </Link>
            </p>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </main>
  );
}