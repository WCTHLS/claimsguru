import { NextRequest, NextResponse } from 'next/server';
import { verifyUserCredentials, createDeletionTicket } from '@/lib/entra-verify';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const cleanEmail = (body.email || '').trim().toLowerCase();
    const cleanPassword = (body.password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Please provide both email and password to verify your account.',
        },
        { status: 400 }
      );
    }

    const result = await verifyUserCredentials(cleanEmail, cleanPassword);

    if (!result.verified) {
      return NextResponse.json(
        {
          verified: false,
          error: result.error || 'Invalid email or password. ClaimsGuru verification failed.',
        },
        { status: 401 }
      );
    }

    const ticket = createDeletionTicket(result.email, result.subjectId);

    return NextResponse.json(
      {
        verified: true,
        email: result.email,
        name: result.name || cleanEmail.split('@')[0],
        user_id: result.subjectId,
        provider: 'claimsguru',
        verification_ticket: ticket,
        message: 'Credentials verified successfully via ClaimsGuru.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { verified: false, error: err?.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
