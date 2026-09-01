import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SyncEntraBody {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  organization?: string;
  external_subject_id?: string;
  requested_role?: 'patient' | 'tpa';
  client_id?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  policy?: string;
  sum_insured?: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncEntraBody;

    if (!body?.email) {
      return NextResponse.json({ error: 'Email is required for synchronization.' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      email: body.email.trim().toLowerCase(),
      name: body.name,
      first_name: body.first_name,
      last_name: body.last_name,
      company_name: body.company_name || body.organization,
      organization: body.organization || body.company_name,
      external_subject_id: body.external_subject_id || body.email,
      requested_role: body.requested_role || 'patient',
      client_id: body.client_id,
      phone: body.phone,
      dob: body.dob,
      gender: body.gender,
      policy: body.policy,
      sum_insured: body.sum_insured,
    };

    const rawBase = process.env.INGRESS_API || process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001';
    const cleanBase = rawBase.replace(/\/+$/, '');

    const urlsToTry = [
      'http://127.0.0.1:8001/auth/sync-entra-user',
      'http://127.0.0.1:8000/ingress/auth/sync-entra-user',
      `${cleanBase}/auth/sync-entra-user`,
      `${cleanBase}/ingress/auth/sync-entra-user`,
    ];

    let res: Response | null = null;
    let data: any = null;

    for (const url of urlsToTry) {
      try {
        const attempt = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (attempt.status !== 404) {
          res = attempt;
          data = await attempt.json().catch(() => ({}));
          break;
        }
      } catch {
        /* try next candidate */
      }
    }

    if (!res) {
      // Backend is offline / standalone dev fallback
      const isOrg = body.requested_role === 'tpa';
      return NextResponse.json({
        success: true,
        user_id: `offline-${Date.now()}`,
        email: body.email,
        role: isOrg ? 'tpa' : 'patient',
        account_role: isOrg ? 'admin' : 'submitter',
        organization: isOrg ? 'Star Health' : undefined,
        organization_slug: isOrg ? 'star-health' : undefined,
        is_new_user: false,
        needs_onboarding: !isOrg,
        is_local_demo: true,
      });
    }

    if (!res.ok) {
      const msg =
        typeof data?.detail === 'string'
          ? data.detail
          : typeof data?.detail?.message === 'string'
            ? data.detail.message
            : typeof data?.error === 'string'
              ? data.error
              : 'Failed to synchronize Entra identity with database.';
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Synchronization failed.' },
      { status: 500 }
    );
  }
}
