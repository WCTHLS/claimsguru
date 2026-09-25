import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface DeleteAccountBody {
  user_id?: string;
  email?: string;
}

async function handleDeleteAccount(request: NextRequest) {
  try {
    let body: DeleteAccountBody = {};
    try {
      body = (await request.json()) as DeleteAccountBody;
    } catch {
      // Body may be empty on DELETE requests
    }

    const authHeader = request.headers.get('authorization') || '';
    const cleanUserId = (body.user_id || '').trim();
    const cleanEmail = (body.email || '').trim().toLowerCase();

    const deletePayload: Record<string, unknown> = {
      user_id: cleanUserId || undefined,
      email: cleanEmail || undefined,
    };

    const urlsToTry: string[] = [];
    const envBase = process.env.INTERNAL_INGRESS_URL || process.env.INGRESS_API || process.env.NEXT_PUBLIC_API_BASE;
    if (envBase) {
      const clean = envBase.replace(/\/+$/, '');
      if (clean.endsWith('/ingress')) {
        urlsToTry.push(`${clean}/auth/delete-account`);
        urlsToTry.push(`${clean.replace(/\/ingress$/, '')}/auth/delete-account`);
      } else {
        urlsToTry.push(`${clean}/ingress/auth/delete-account`);
        urlsToTry.push(`${clean}/auth/delete-account`);
      }
    }

    urlsToTry.push('https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io/auth/delete-account');
    urlsToTry.push('https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io/ingress/auth/delete-account');
    urlsToTry.push('http://cg-preprod-cin-ingress:8000/ingress/auth/delete-account');
    urlsToTry.push('http://cg-preprod-cin-ingress:8000/auth/delete-account');
    urlsToTry.push('http://claimsguru-stage-ingress:8000/ingress/auth/delete-account');
    urlsToTry.push('http://claimsguru-stage-ingress:8000/auth/delete-account');
    urlsToTry.push('http://claimsguru-ingress:8000/ingress/auth/delete-account');
    urlsToTry.push('http://127.0.0.1:8000/ingress/auth/delete-account');
    urlsToTry.push('http://127.0.0.1:8000/auth/delete-account');
    urlsToTry.push('http://localhost:8000/ingress/auth/delete-account');
    urlsToTry.push('http://localhost:8000/auth/delete-account');

    const uniqueUrls = Array.from(new Set(urlsToTry));

    let res: Response | null = null;
    let data: any = null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    for (const url of uniqueUrls) {
      try {
        const attempt = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(deletePayload),
          signal: AbortSignal.timeout(10000),
        });
        if (attempt.status !== 404) {
          res = attempt;
          data = await attempt.json().catch(() => ({}));
          break;
        }
      } catch {
        // try next endpoint
      }
    }

    if (!res) {
      return NextResponse.json(
        { error: 'Unable to reach backend service for account deletion.' },
        { status: 503 }
      );
    }

    if (!res.ok) {
      const errorMsg = data?.detail || data?.message || data?.error || 'Account deletion failed.';
      return NextResponse.json({ error: errorMsg, details: data }, { status: res.status });
    }

    return NextResponse.json(data || { success: true, message: 'Account deleted successfully.' }, {
      status: 200,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error during account deletion.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleDeleteAccount(request);
}

export async function DELETE(request: NextRequest) {
  return handleDeleteAccount(request);
}
