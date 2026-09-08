import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RegisterBody {
  username: string;
  password?: string;
  password_hash?: string;
  role: 'patient' | 'tpa';
  provider?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  organization?: string;
  employee_id?: string;
  dob?: string;
  gender?: string;
  policy?: string;
  sum_insured?: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterBody;

    const isEntra = body?.provider === 'entra';
    const pwd = (body.password_hash || body.password || '').trim();
    if (!body?.username || !body?.role || (!isEntra && !pwd)) {
      return NextResponse.json({ error: 'Missing required registration fields.' }, { status: 400 });
    }

    const profilePayload: Record<string, unknown> = {
      provider: body.provider || 'local',
      username: body.username,
      password_hash: body.password_hash || pwd || undefined,
      role: body.role === 'patient' ? 'submitter' : 'admin',
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone,
      organization: body.organization,
      employee_id: body.employee_id,
      dob: body.dob,
      gender: body.gender,
      policy: body.policy,
      sum_insured: body.sum_insured,
    };

    const urlsToTry: string[] = [];
    const envBase = process.env.INTERNAL_INGRESS_URL || process.env.INGRESS_API || process.env.NEXT_PUBLIC_API_BASE;
    if (envBase) {
      const clean = envBase.replace(/\/+$/, '');
      if (clean.endsWith('/ingress')) {
        urlsToTry.push(`${clean}/auth/register`);
        urlsToTry.push(`${clean.replace(/\/ingress$/, '')}/auth/register`);
      } else {
        urlsToTry.push(`${clean}/ingress/auth/register`);
        urlsToTry.push(`${clean}/auth/register`);
      }
    }
    urlsToTry.push('http://claimsguru-api-test:8000/ingress/auth/register');
    urlsToTry.push('http://claimsguru-ingress:8000/ingress/auth/register');
    urlsToTry.push('http://127.0.0.1:8000/ingress/auth/register');
    urlsToTry.push('http://localhost:8000/ingress/auth/register');

    const uniqueUrls = Array.from(new Set(urlsToTry));

    let res: Response | null = null;
    let data: any = null;

    for (const url of uniqueUrls) {
      try {
        const attempt = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload),
          signal: AbortSignal.timeout(3500),
        });
        if (attempt.status !== 404) {
          res = attempt;
          data = await attempt.json().catch(() => ({}));
          break;
        }
      } catch {
        /* try next candidate endpoint */
      }
    }

    if (!res) {
      // Microservice backend is offline — succeed in local standalone mode
      return NextResponse.json({ success: true, is_local_demo: true });
    }

    if (!res.ok) {
      const msg =
        typeof data?.detail === 'string'
          ? data.detail
          : typeof data?.error === 'string'
            ? data.error
            : typeof data?.message === 'string'
              ? data.message
              : 'Registration failed.';
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    return NextResponse.json({ success: true, detail: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Registration failed.' }, { status: 500 });
  }
}