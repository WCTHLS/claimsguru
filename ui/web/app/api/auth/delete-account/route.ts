import { NextRequest, NextResponse } from 'next/server';
import { fetchIngress } from '@/lib/ingress-resolver';
import {
  verifyUserCredentials,
  createDeletionTicket,
  verifyDeletionTicket,
} from '@/lib/entra-verify';

export const dynamic = 'force-dynamic';

interface DeleteAccountRequestBody {
  email?: string;
  password?: string;
  user_id?: string;
  verification_ticket?: string;
  ticket?: string;
  action?: 'verify' | 'delete';
  verify_only?: boolean;
  confirm?: boolean;
}

async function handleDeleteAccount(request: NextRequest) {
  try {
    let body: DeleteAccountRequestBody = {};
    try {
      body = (await request.json()) as DeleteAccountRequestBody;
    } catch {
      // Body may be empty on plain DELETE requests
    }

    const { searchParams } = new URL(request.url);
    const queryAction = searchParams.get('action');
    const isVerifyAction =
      body.action === 'verify' ||
      body.verify_only === true ||
      queryAction === 'verify';

    const authHeader = request.headers.get('authorization') || '';
    const cleanEmail = (body.email || searchParams.get('email') || '').trim().toLowerCase();
    const cleanPassword = (body.password || '').trim();
    const cleanUserId = (body.user_id || '').trim();
    const ticket = (body.verification_ticket || body.ticket || searchParams.get('ticket') || '').trim();

    // -------------------------------------------------------------
    // PHASE 1: Verify Credentials via ClaimsGuru
    // -------------------------------------------------------------
    if (isVerifyAction) {
      if (!cleanEmail || !cleanPassword) {
        return NextResponse.json(
          {
            verified: false,
            error: 'Both email and password are required for verification.',
          },
          { status: 400 }
        );
      }

      const verifyResult = await verifyUserCredentials(cleanEmail, cleanPassword);
      if (!verifyResult.verified) {
        return NextResponse.json(
          {
            verified: false,
            error: verifyResult.error || 'Invalid email address or password.',
          },
          { status: 401 }
        );
      }

      const deletionTicket = createDeletionTicket(
        verifyResult.email,
        verifyResult.subjectId
      );

      return NextResponse.json(
        {
          verified: true,
          email: verifyResult.email,
          name: verifyResult.name || cleanEmail.split('@')[0],
          user_id: verifyResult.subjectId,
          provider: 'claimsguru',
          verification_ticket: deletionTicket,
          message: 'Credentials successfully verified via ClaimsGuru.',
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------------------
    // PHASE 2: Permanent Account Deletion
    // -------------------------------------------------------------
    let verifiedEmail = cleanEmail;
    let verifiedUserId = cleanUserId;

    // Check authorization: Either verified ticket, valid password, or bearer token
    let isAuthorized = false;

    if (ticket && cleanEmail) {
      if (verifyDeletionTicket(ticket, cleanEmail)) {
        isAuthorized = true;
      } else {
        return NextResponse.json(
          {
            error: 'Verification session has expired or is invalid. Please re-enter your credentials.',
          },
          { status: 401 }
        );
      }
    } else if (cleanEmail && cleanPassword) {
      // Direct deletion with email + password: verify credentials first
      const verifyResult = await verifyUserCredentials(cleanEmail, cleanPassword);
      if (!verifyResult.verified) {
        return NextResponse.json(
          {
            error: verifyResult.error || 'Authentication failed. Incorrect email or password.',
          },
          { status: 401 }
        );
      }
      isAuthorized = true;
      verifiedEmail = verifyResult.email;
      verifiedUserId = verifiedUserId || verifyResult.subjectId || '';
    } else if (authHeader) {
      // Authenticated session deletion
      isAuthorized = true;
    } else {
      return NextResponse.json(
        {
          error:
            'Please provide your email and password (or valid verification ticket) to confirm account deletion.',
        },
        { status: 400 }
      );
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this account.' },
        { status: 401 }
      );
    }

    // Send delete request to backend ingress
    const deletePayload: Record<string, unknown> = {
      email: verifiedEmail || undefined,
      user_id: verifiedUserId || undefined,
      password: cleanPassword || undefined,
      confirm: true,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const { res, data } = await fetchIngress(
      '/auth/delete-account',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(deletePayload),
      },
      12000
    );

    if (!res) {
      return NextResponse.json(
        { error: 'Backend service unavailable. Please try again in a few moments.' },
        { status: 503 }
      );
    }

    if (!res.ok) {
      const errorMsg =
        data?.detail || data?.message || data?.error || 'Account deletion failed.';
      return NextResponse.json(
        { error: typeof errorMsg === 'string' ? errorMsg : 'Account deletion failed.', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          data?.message ||
          'Account, profile data, claims, and credentials permanently deleted.',
        deleted_email: verifiedEmail,
      },
      { status: 200 }
    );
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
