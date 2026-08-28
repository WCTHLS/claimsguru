import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RegisterBody {
  username: string;
  password?: string;
  password_hash?: string;
  role: 'patient' | 'tpa';
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

    const pwd = (body.password_hash || body.password || '').trim();
    if (!body?.username || !body?.role || !pwd) {
      return NextResponse.json({ error: 'Missing required registration fields.' }, { status: 400 });
    }

    const profilePayload: Record<string, unknown> = {
      provider: 'local',
      username: body.username,
      password_hash: body.password_hash || pwd,
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

    const rawBase = process.env.INGRESS_API || process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001';
    const cleanBase = rawBase.replace(/\/+$/, '');

    const urlsToTry = [
      'http://127.0.0.1:8001/auth/register',
      'http://127.0.0.1:8000/ingress/auth/register',
      `${cleanBase}/auth/register`,
      `${cleanBase}/ingress/auth/register`,
    ];

    let res: Response | null = null;
    let data: any = null;

    for (const url of urlsToTry) {
      try {
        const attempt = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload),
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