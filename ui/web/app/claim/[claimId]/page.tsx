'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClaimRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const claimId = params?.claimId as string;

  useEffect(() => {
    if (claimId) {
      router.replace(`/app?claim_id=${encodeURIComponent(claimId)}`);
    } else {
      router.replace('/app');
    }
  }, [claimId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100/80">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">Redirecting to Live Claim Tracking…</p>
        <p className="text-xs text-slate-400 mt-1">Claim ID: {claimId}</p>
      </div>
    </div>
  );
}
