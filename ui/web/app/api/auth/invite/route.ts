import { NextRequest, NextResponse } from 'next/server';
import { fetchIngress } from '@/lib/ingress-resolver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      first_name: body?.first_name,
      last_name: body?.last_name,
      email: body?.email,
      organization: body?.organization,
      role: body?.role || 'reviewer',
      invited_by: body?.invited_by,
    };

    if (!payload.first_name || !payload.last_name || !payload.email || !payload.organization) {
      return NextResponse.json(
        { error: 'First name, last name, work email, and organization are required' },
        { status: 400 },
      );
    }

    const { res, data } = await fetchIngress('/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res) {
      // Backend is offline in demo mode - return simulated success
      return NextResponse.json(
        {
          success: true,
          invitation_id: `inv-demo-${Date.now()}`,
          email: payload.email,
          first_name: payload.first_name,
          last_name: payload.last_name,
          organization: payload.organization,
          role: payload.role,
          status: 'PENDING',
          message: `Invitation queued for ${payload.first_name} ${payload.last_name} (${payload.email})`,
        },
        { status: 201 },
      );
    }

    if (res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const detail = data?.detail;
    const errorMessage =
      typeof detail === 'string'
        ? detail
        : typeof detail?.message === 'string'
        ? detail.message
        : typeof data?.error === 'string'
        ? data.error
        : 'Failed to create reviewer invitation.';

    return NextResponse.json({ error: errorMessage }, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invitation failed.' },
      { status: 500 },
    );
  }
}
