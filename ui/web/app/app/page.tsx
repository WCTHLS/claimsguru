'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardClinical } from '@/components/claimgpt/dashboard-clinical';
import { getAuthRedirectPath, getStoredAuthSession } from '@/lib/auth';

export default function AppPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const session = getStoredAuthSession();

    if (!session) {
      router.replace('/login');
      return;
    }

    // The patient workspace is exclusively for submitters. Keycloak sessions
    // created before accountRole was added are identified by their patient role.
    const isSubmitter = session.accountRole === 'submitter'
      || (!session.accountRole && session.role === 'patient');

    if (!isSubmitter) {
      router.replace(getAuthRedirectPath(session));
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100/80">
        <p className="text-sm text-slate-500">Verifying patient portal access…</p>
      </div>
    );
  }

  return <DashboardClinical />;
}
