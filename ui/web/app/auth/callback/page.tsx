'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeAuthCallback, getAuthRedirectPath, getStoredAuthSession, isEntraEnabled } from '@/lib/auth';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isExecutingRef = useRef(false);

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const code = params.get('code');

    // If there is NO incoming OAuth code and we already have a valid session, redirect
    if (!code) {
      const existingSession = getStoredAuthSession();
      if (existingSession) {
        router.replace(getAuthRedirectPath(existingSession));
        return;
      }
    }

    if (isExecutingRef.current) {
      return;
    }
    isExecutingRef.current = true;

    const finalizeAuth = async () => {
      try {
        const session = await completeAuthCallback();
        if (!session) {
          throw new Error('No session was returned from identity provider.');
        }

        const currentSession = getStoredAuthSession() || session;
        const targetPath = getAuthRedirectPath(currentSession);
        router.replace(targetPath);
      } catch (err) {
        // If a session exists despite the error (e.g. race condition), proceed
        const savedSession = getStoredAuthSession();
        if (savedSession) {
          router.replace(getAuthRedirectPath(savedSession));
          return;
        }
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    };

    finalizeAuth();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
          {error ? <ShieldCheck className="h-6 w-6 text-rose-600" /> : <Loader2 className="h-6 w-6 animate-spin text-teal-600" />}
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {error ? 'Authentication Error' : 'Finishing Sign-In'}
        </h1>
        <p className="text-sm text-slate-600">
          {error
            ? error
            : isEntraEnabled()
            ? 'Securely verifying your Microsoft Entra External ID credentials…'
            : 'Securely completing authentication…'}
        </p>
        {error && (
          <div className="mt-4 flex flex-col gap-2">
            {error.toLowerCase().includes('continue as organization') && (
              <button
                type="button"
                onClick={() => router.replace(`/login?role=tpa&error=${encodeURIComponent(error)}`)}
                className="w-full inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 transition-colors shadow-xs"
              >
                Continue as Organization
              </button>
            )}
            {error.toLowerCase().includes('continue as patient') && (
              <button
                type="button"
                onClick={() => router.replace(`/login?role=patient&error=${encodeURIComponent(error)}`)}
                className="w-full inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 transition-colors shadow-xs"
              >
                Continue as Patient
              </button>
            )}
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="w-full inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
