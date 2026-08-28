'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthRedirectPath, getStoredAuthSession } from '@/lib/auth';
import { DashboardOrgReview } from '@/components/claimgpt/dashboard-org-review';

export default function OrgReviewPage({ params }: { params: { orgSlug: string } }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const session = getStoredAuthSession();

    if (!session) {
      router.replace('/login');
      return;
    }

    const isAllowedRole = session.accountRole === 'admin' || session.accountRole === 'reviewer' || session.role === 'tpa';
    if (!isAllowedRole || (session.organizationSlug && session.organizationSlug !== params.orgSlug)) {
      router.replace(getAuthRedirectPath(session));
      return;
    }

    setIsAuthorized(true);
  }, [router, params.orgSlug]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100/80">
        <p className="text-sm text-slate-500">Verifying reviewer session authority for {params.orgSlug}…</p>
      </div>
    );
  }

  return <DashboardOrgReview orgSlug={params.orgSlug} />;
}