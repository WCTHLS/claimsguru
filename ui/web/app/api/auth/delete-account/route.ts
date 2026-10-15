import { NextRequest, NextResponse } from 'next/server';
import { fetchIngress } from '@/lib/ingress-resolver';

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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const { res, data } = await fetchIngress('/auth/delete-account', {
      method: 'POST',
      headers,
      body: JSON.stringify(deletePayload),
    }, 8000);

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
