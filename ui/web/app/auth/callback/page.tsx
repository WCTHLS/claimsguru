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
    // If we already have an active valid session, immediately redirect
    const existingSession = getStoredAuthSession();
    if (existingSession) {
      router.replace(getAuthRedirectPath(existingSession));
      return;
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
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition-colors"
          >
            Back to Sign In
          </button>
        )}
      </div>
    </main>
  );
}
