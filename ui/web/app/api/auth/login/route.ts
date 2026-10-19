import { NextRequest, NextResponse } from 'next/server';
import { fetchIngress } from '@/lib/ingress-resolver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      username: body?.username,
      password: body?.password ?? body?.password_hash,
      password_hash: body?.password_hash,
      role: body?.role,
    };

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    const { res, data } = await fetchIngress('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': clientIp,
        'X-Real-IP': clientIp,
      },
      body: JSON.stringify(payload),
    });

    if (!res) {
      if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_LOCAL_FALLBACK === 'true') {
        // Backend microservice is offline in standalone dev mode only
        return NextResponse.json({
          access_token: "local-token-" + Date.now(),
          role: payload.role === 'patient' ? 'submitter' : 'admin',
          username: payload.username,
          is_local_demo: true,
        }, { status: 200 });
      }

      return NextResponse.json(
        { error: 'Authentication service timed out or unavailable. Please try again.' },
        { status: 504 }
      );
    }

    if (res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const detail = data?.detail;
    const errorMessage = typeof detail === 'string'
      ? detail
      : typeof detail?.message === 'string'
        ? detail.message
        : typeof data?.error === 'string'
          ? data.error
          : 'Login failed.';
    const actualRole = typeof detail?.actual_role === 'string'
      ? detail.actual_role
      : typeof data?.actual_role === 'string'
        ? data.actual_role
        : undefined;

    return NextResponse.json(
      { error: errorMessage, actual_role: actualRole },
      { status: res.status },
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Login failed.' }, { status: 500 });
  }
}
