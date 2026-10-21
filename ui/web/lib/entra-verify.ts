import crypto from 'crypto';
import { fetchIngress } from '@/lib/ingress-resolver';

/**
 * Microsoft Entra External ID (CIAM) & Ingress Verification Helper
 */

const VERIFY_SECRET =
  process.env.AUTH_JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'claimsguru-account-deletion-secret-key-2026';

export interface VerifyUserResult {
  verified: boolean;
  email: string;
  name?: string;
  subjectId?: string;
  provider?: string;
  error?: string;
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function parseEntraError(data: any, status: number): string {
  if (!data) {
    return 'Authentication service did not respond. Please verify network connectivity.';
  }

  const subError = String(data.suberror || data.sub_error || '');
  const errorDescription = String(
    data.error_description || data.message || data.detail || ''
  );

  if (
    errorDescription.includes('AADSTS50126') ||
    subError === 'bad_username_password' ||
    subError === 'invalid_credentials' ||
    errorDescription.toLowerCase().includes('invalid username or password') ||
    errorDescription.toLowerCase().includes('wrong password')
  ) {
    return 'Invalid email address or password. Please verify your credentials and try again.';
  }

  if (
    errorDescription.includes('AADSTS50034') ||
    subError === 'user_not_found' ||
    errorDescription.toLowerCase().includes('user does not exist') ||
    errorDescription.toLowerCase().includes('no account found') ||
    errorDescription.toLowerCase().includes('user not found')
  ) {
    return 'No account was found with this email address.';
  }

  if (
    errorDescription.includes('AADSTS50053') ||
    subError === 'account_locked' ||
    errorDescription.toLowerCase().includes('locked out')
  ) {
    return 'Your account has been temporarily locked due to too many failed attempts.';
  }

  return errorDescription || 'Invalid email or password.';
}

/**
 * Verify user credentials directly against Microsoft Entra External ID (CIAM) Native Auth.
 */
async function verifyViaEntraNative(
  cleanEmail: string,
  cleanPassword: string
): Promise<VerifyUserResult | null> {
  const subdomain =
    process.env.NEXT_PUBLIC_ENTRA_SUBDOMAIN ||
    process.env.ENTRA_SUBDOMAIN ||
    'claimsguruapp';

  const tenantId =
    process.env.NEXT_PUBLIC_ENTRA_TENANT_ID ||
    process.env.ENTRA_TENANT_ID ||
    '0fac25c7-0d8c-4f34-8c8d-3981a5d2a482';

  const clientIdsToTry = [
    process.env.NEXT_PUBLIC_ENTRA_PATIENT_CLIENT_ID,
    process.env.ENTRA_CLIENT_ID,
    process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID,
    '12a25bf9-425f-4222-a88f-aa72b99aa65a',
    'c2731748-4911-491f-82a1-beda9766edfe',
  ].filter(Boolean) as string[];

  const baseUrls = [
    `https://${subdomain}.ciamlogin.com/${tenantId}`,
    `https://${subdomain}.ciamlogin.com`,
    `https://login.microsoftonline.com/${tenantId}`,
  ];

  for (const base of baseUrls) {
    for (const clientId of clientIdsToTry) {
      try {
        // Step 1: Initiate
        const initiateUrl = `${base.replace(/\/+$/, '')}/oauth2/v2.0/initiate`;
        const initParams = new URLSearchParams({
          client_id: clientId,
          challenge_type: 'password redirect',
          username: cleanEmail,
        });

        const initRes = await fetch(initiateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: initParams.toString(),
          signal: AbortSignal.timeout(6000),
        });

        const initJson = await initRes.json().catch(() => ({}));

        if (!initRes.ok) {
          if (
            initJson.error === 'invalid_request' &&
            initJson.error_description?.includes('AADSTS50126')
          ) {
            return {
              verified: false,
              email: cleanEmail,
              error: 'Invalid email address or password.',
            };
          }
          continue; // Try next client ID or authority
        }

        const continuationToken1 = initJson.continuation_token;
        if (!continuationToken1) {
          continue;
        }

        // Step 2: Challenge
        const challengeUrl = `${base.replace(/\/+$/, '')}/oauth2/v2.0/challenge`;
        const challengeParams = new URLSearchParams({
          client_id: clientId,
          challenge_type: 'password redirect',
          continuation_token: continuationToken1,
        });

        const chRes = await fetch(challengeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: challengeParams.toString(),
          signal: AbortSignal.timeout(6000),
        });

        const chJson = await chRes.json().catch(() => ({}));
        if (!chRes.ok) {
          continue;
        }

        const continuationToken2 = chJson.continuation_token || continuationToken1;

        // Step 3: Token
        const tokenUrl = `${base.replace(/\/+$/, '')}/oauth2/v2.0/token`;
        const tokenParams = new URLSearchParams({
          client_id: clientId,
          continuation_token: continuationToken2,
          grant_type: 'password',
          password: cleanPassword,
          scope: 'openid profile email offline_access',
        });

        const tokenRes = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: tokenParams.toString(),
          signal: AbortSignal.timeout(6000),
        });

        const tokenJson = await tokenRes.json().catch(() => ({}));

        if (tokenRes.ok && tokenJson.access_token) {
          const claims = decodeJwtPayload(tokenJson.id_token || tokenJson.access_token) || {};
          const verifiedEmail = String(
            claims.email || claims.preferred_username || claims.upn || cleanEmail
          ).toLowerCase().trim();
          const name = String(claims.name || claims.given_name || verifiedEmail.split('@')[0]);
          const subjectId = String(claims.sub || claims.oid || '');

          return {
            verified: true,
            email: verifiedEmail,
            name,
            subjectId,
            provider: 'entra',
          };
        } else if (tokenJson.error) {
          const errMsg = parseEntraError(tokenJson, tokenRes.status);
          return {
            verified: false,
            email: cleanEmail,
            error: errMsg,
          };
        }
      } catch {
        // Continue fallback
      }
    }
  }

  return null;
}

/**
 * Verify user credentials against backend ingress /auth/login (local database/hybrid accounts).
 */
async function verifyViaBackendIngress(
  cleanEmail: string,
  cleanPassword: string
): Promise<VerifyUserResult | null> {
  try {
    const rolesToTry = ['submitter', undefined];
    for (const role of rolesToTry) {
      const payload: Record<string, any> = {
        username: cleanEmail,
        password: cleanPassword,
      };
      if (role) payload.role = role;

      const { res, data } = await fetchIngress('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 5000);

      if (res && res.ok && data) {
        return {
          verified: true,
          email: String(data.email || cleanEmail).toLowerCase().trim(),
          name: data.name || data.full_name || cleanEmail.split('@')[0],
          subjectId: data.user_id || data.id,
          provider: 'ingress',
        };
      } else if (res && (res.status === 401 || res.status === 403)) {
        const errorDetail =
          data?.detail || data?.message || data?.error || 'Invalid email or password.';
        return {
          verified: false,
          email: cleanEmail,
          error: typeof errorDetail === 'string' ? errorDetail : 'Invalid email or password.',
        };
      }
    }
  } catch {
    // Ingress offline or unreachable
  }
  return null;
}

/**
 * Master verification function:
 * Checks Microsoft Entra first; if Entra returns credentials error, returns failure immediately.
 * If Entra is unreachable or user is local, checks backend ingress.
 */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<VerifyUserResult> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    return {
      verified: false,
      email: cleanEmail,
      error: 'Both email and password are required.',
    };
  }

  // 1. Attempt Microsoft Entra External ID verification
  const entraResult = await verifyViaEntraNative(cleanEmail, cleanPassword);
  if (entraResult) {
    if (entraResult.verified) {
      return entraResult;
    }
    // If Entra specifically returned invalid credentials error, return that
    if (entraResult.error && entraResult.error.toLowerCase().includes('invalid')) {
      // Also check if backend ingress accepts it (hybrid account)
      const ingressResult = await verifyViaBackendIngress(cleanEmail, cleanPassword);
      if (ingressResult && ingressResult.verified) {
        return ingressResult;
      }
      return entraResult;
    }
  }

  // 2. Fallback to Backend Ingress verification
  const ingressResult = await verifyViaBackendIngress(cleanEmail, cleanPassword);
  if (ingressResult) {
    return ingressResult;
  }

  return {
    verified: false,
    email: cleanEmail,
    error: 'Invalid email address or password. Please verify your credentials and try again.',
  };
}

/**
 * Generate a cryptographically signed, short-lived deletion ticket (15 minutes).
 */
export function createDeletionTicket(email: string, subjectId?: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const timestamp = Date.now();
  const rawData = `${cleanEmail}:${subjectId || ''}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', VERIFY_SECRET).update(rawData).digest('hex');

  const ticketObj = {
    email: cleanEmail,
    subjectId: subjectId || '',
    timestamp,
    sig: hmac,
  };

  return Buffer.from(JSON.stringify(ticketObj)).toString('base64url');
}

/**
 * Validate a signed deletion ticket.
 */
export function verifyDeletionTicket(ticket: string, expectedEmail: string): boolean {
  try {
    const rawJson = Buffer.from(ticket, 'base64url').toString('utf-8');
    const data = JSON.parse(rawJson);

    if (!data.email || !data.timestamp || !data.sig) {
      return false;
    }

    if (data.email.toLowerCase() !== expectedEmail.trim().toLowerCase()) {
      return false;
    }

    // Must be within 15 minutes
    const now = Date.now();
    if (now - data.timestamp > 15 * 60 * 1000 || data.timestamp > now + 60 * 1000) {
      return false;
    }

    const rawData = `${data.email}:${data.subjectId || ''}:${data.timestamp}`;
    const expectedSig = crypto.createHmac('sha256', VERIFY_SECRET).update(rawData).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(data.sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}
