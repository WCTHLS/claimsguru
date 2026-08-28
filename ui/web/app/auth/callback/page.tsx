'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeAuthCallback, getAuthRedirectPath, getStoredAuthSession } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const finalizeAuth = async () => {
      try {
        const session = await completeAuthCallback();
        if (!session) {
          throw new Error('No session was returned.');
        }

        const currentSession = getStoredAuthSession();
        if (!currentSession) {
          throw new Error('The session could not be restored.');
        }

        router.replace(getAuthRedirectPath(currentSession));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    };

    finalizeAuth();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elevation-sm">
        <h1 className="text-xl font-semibold">Finishing sign-in</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error ? error : 'Securely completing your Keycloak login…'}
        </p>
      </div>
    </main>
  );
}
