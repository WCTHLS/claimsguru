export type AuthRole = 'patient' | 'tpa';
export type AuthErrorField = 'username' | 'password' | 'role' | 'general';

export function getAuthErrorField(message: string): AuthErrorField {
  const lower = message.toLowerCase();
  if (
    lower.includes('role') ||
    lower.includes('not registered as') ||
    lower.includes('continue with correct identity') ||
    lower.includes('tpa adjuster')
  ) {
    return 'role';
  }
  if (lower.includes('username') || lower.includes('email') || lower.includes('not found')) {
    return 'username';
  }
  if (lower.includes('password')) {
    return 'password';
  }
  return 'general';
}

function getRoleLabel(role: string) {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'reviewer' || normalized === 'tpa') {
    return 'TPA adjuster';
  }
  return 'patient';
}

function formatRoleMismatchMessage(requestedRole: AuthRole, accountRole: string) {
  const requestedLabel = requestedRole === 'patient' ? 'patient' : 'TPA adjuster';
  const accountLabel = getRoleLabel(accountRole);
  return `Username is not registered as ${requestedLabel}. It is registered as ${accountLabel}. Create a new account or continue with the correct identity.`;
}

interface AuthConfig {
  url: string;
  realm: string;
  clientId: string;
  redirectUri: string;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
  role: AuthRole;
  /** Actual backend role: submitter (patient), admin, or reviewer (org staff). */
  accountRole?: 'submitter' | 'admin' | 'reviewer';
  /** Organization display name, present for admin/reviewer accounts. */
  organization?: string;
  /** Kebab-case organization slug used to build /{organization}/admin|review routes. */
  organizationSlug?: string;
  user: {
    email: string;
    name: string;
    preferredUsername?: string;
  };
}

interface BeginAuthFlowOptions {
  role: AuthRole;
  isRegister?: boolean;
  loginHint?: string;
}

const AUTH_SESSION_KEY = 'claimgpt-auth-session';
const PKCE_STATE_KEY = 'claimgpt-pkce-state';
const PKCE_VERIFIER_KEY = 'claimgpt-pkce-verifier';
const ROLE_HINT_KEY = 'claimgpt-role-hint';
const AUTH_ACTION_KEY = 'claimgpt-auth-action';

function getConfig(): AuthConfig {
  const url = (process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080').replace(/\/+$/, '');
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'claimgpt';
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'claimgpt-web';
  const redirectUri = process.env.NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI || `${window.location.origin}/auth/callback`;

  return { url, realm, clientId, redirectUri };
}

function createRandomString(length = 32) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function createPkceChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeJwtPayload(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const payload = parts[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const decoded = window.atob(padded);
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as Record<string, unknown>;
}

async function hashPasswordForTransport(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `sha256$${hex}`;
}

function normalizeRole(roles: string[], hintedRole?: string | null): AuthRole {
  const lowered = roles.map((role) => role.toLowerCase());
  if (lowered.includes('tpa') || lowered.includes('reviewer')) {
    return 'tpa';
  }
  if (lowered.includes('patient') || lowered.includes('submitter')) {
    return 'patient';
  }
  if (hintedRole === 'tpa') {
    return 'tpa';
  }
  return 'patient';
}

function buildSession(tokenResponse: Record<string, unknown>, hintedRole?: string | null): AuthSession {
  const accessToken = String(tokenResponse.access_token || '');
  const refreshToken = String(tokenResponse.refresh_token || '');
  const idToken = String(tokenResponse.id_token || '');
  const accessPayload = decodeJwtPayload(accessToken) || {};
  const claimRoles = Array.isArray(accessPayload.realm_access)
    ? []
    : (accessPayload.realm_access as Record<string, unknown> | undefined)?.roles || [];
  const roles = (Array.isArray(claimRoles) ? claimRoles : []) as string[];

  const expiry = Number(accessPayload.exp || 0);
  const now = Math.floor(Date.now() / 1000);

  return {
    accessToken,
    refreshToken,
    idToken,
    expiresAt: expiry > now ? expiry : now + 3600,
    role: normalizeRole(roles, hintedRole),
    user: {
      email: String(accessPayload.email || accessPayload.preferred_username || ''),
      name: String(accessPayload.name || accessPayload.given_name || accessPayload.preferred_username || 'ClaimsGuru user'),
      preferredUsername: String(accessPayload.preferred_username || ''),
    },
  };
}

function saveSession(session: AuthSession) {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!stored) {
    return null;
  }

  try {
    const session = JSON.parse(stored) as AuthSession;
    const now = Math.floor(Date.now() / 1000);
    if (!session.accessToken || session.expiresAt <= now) {
      clearAuthSession();
      return null;
    }
    return session;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(ROLE_HINT_KEY);
  sessionStorage.removeItem(AUTH_ACTION_KEY);
}

export async function beginAuthFlow({ role, isRegister = false, loginHint }: BeginAuthFlowOptions) {
  if (typeof window === 'undefined') {
    return;
  }

  const config = getConfig();
  const state = createRandomString(24);
  const verifier = createRandomString(64);
  const challenge = await createPkceChallenge(verifier);

  sessionStorage.setItem(PKCE_STATE_KEY, state);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(ROLE_HINT_KEY, role);
  sessionStorage.setItem(AUTH_ACTION_KEY, isRegister ? 'register' : 'login');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    kc_action: isRegister ? 'REGISTER' : 'LOGIN',
  });

  if (loginHint) {
    params.set('login_hint', loginHint);
  }

  const authUrl = `${config.url}/realms/${config.realm}/protocol/openid-connect/auth?${params.toString()}`;
  window.location.assign(authUrl);
}

export async function authenticateWithPassword({
  username,
  password,
  role,
}: {
  username: string;
  password: string;
  role: AuthRole;
}) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const passwordHash = await hashPasswordForTransport(password);
    let backendResponse: Response | null = null;

    const requestBody: Record<string, unknown> =
      role === 'patient'
        ? { username, password_hash: passwordHash, role: 'submitter' }
        : { username, password_hash: passwordHash };

    try {
      backendResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      // Fall back to Keycloak if the local ingress route is unavailable.
      backendResponse = null;
    }

    if (backendResponse) {
      const backendData = await backendResponse.json().catch(() => ({}));
      if (backendResponse.ok) {
        const accountRole = (
          backendData.role === 'admin' || backendData.role === 'reviewer' || backendData.role === 'submitter'
            ? backendData.role
            : role === 'patient' ? 'submitter' : 'admin'
        ) as AuthSession['accountRole'];
        const organization = typeof backendData.organization === 'string' ? backendData.organization : (role === 'tpa' ? 'Apollo Health' : undefined);
        const organizationSlug = typeof backendData.organization_slug === 'string'
          ? backendData.organization_slug
          : (organization ? organization.toLowerCase().replace(/[^a-z0-9]+/g, '-') : (role === 'tpa' ? 'apollo-health' : undefined));

        const localSession: AuthSession = {
          accessToken: `local-token-${Date.now()}`,
          refreshToken: `local-refresh-${Date.now()}`,
          idToken: `local-id-${Date.now()}`,
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
          role,
          accountRole,
          organization,
          organizationSlug,
          user: {
            email: username,
            name: username.split('@')[0] || username,
            preferredUsername: username,
          },
        };

        sessionStorage.setItem(ROLE_HINT_KEY, role);
        sessionStorage.setItem(AUTH_ACTION_KEY, 'login');
        saveSession(localSession);
        return localSession;
      }

      let formattedMessage: string;
      let authErrorField: AuthErrorField;

      if (role === 'tpa') {
        // Organizations don't send a role — the backend resolves it server-side.
        // Any failure (wrong credentials, wrong account type, disabled account, etc.)
        // is surfaced generically so we don't leak account/role details.
        formattedMessage = 'Access denied. Please check your credentials or contact your administrator.';
        authErrorField = 'general';
      } else {
        const backendErrorRaw = backendData.detail || backendData.error;
        const backendErrorMessage = typeof backendErrorRaw === 'string'
          ? backendErrorRaw
          : typeof backendErrorRaw?.message === 'string'
            ? backendErrorRaw.message
            : 'Invalid username or password.';
        const backendActualRole = typeof backendData?.detail?.actual_role === 'string'
          ? backendData.detail.actual_role
          : typeof backendData?.actual_role === 'string'
            ? backendData.actual_role
            : undefined;

        formattedMessage = backendErrorMessage;
        if (backendActualRole && backendResponse.status === 403 && backendErrorMessage.toLowerCase().includes('role')) {
          formattedMessage = formatRoleMismatchMessage(role, backendActualRole);
        }
        authErrorField = getAuthErrorField(formattedMessage);
      }

      if (backendResponse.status >= 400 && backendResponse.status < 500) {
        const authError = new Error(formattedMessage) as Error & { field?: AuthErrorField };
        authError.field = authErrorField;
        throw authError;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') {
      throw error;
    }
    // Fall back to Keycloak if the local ingress route is unavailable.
  }

  try {
    const config = getConfig();
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: config.clientId,
      username,
      password,
      scope: 'openid profile email',
    });

    const clientSecret = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_SECRET;
    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    const response = await fetch(`${config.url}/realms/${config.realm}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      sessionStorage.setItem(ROLE_HINT_KEY, role);
      sessionStorage.setItem(AUTH_ACTION_KEY, 'login');

      const session = buildSession(data as Record<string, unknown>, role);
      saveSession(session);
      return session;
    }
  } catch {
    // Keycloak endpoint not reachable or error — fallback to local session mode below
  }

  throw new Error('Invalid email or password.');
}

export async function registerAndSignIn({
  username,
  password,
  role,
}: {
  username: string;
  password: string;
  role: AuthRole;
}) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, role }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = typeof (data as Record<string, unknown>).error === 'string'
      ? (data as Record<string, unknown>).error
      : typeof (data as Record<string, unknown>).detail === 'string'
        ? (data as Record<string, unknown>).detail
        : 'Unable to create the account.';
    throw new Error(String(errorMessage));
  }

  return authenticateWithPassword({ username, password, role });
}

export async function completeAuthCallback() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  const storedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const hintedRole = sessionStorage.getItem(ROLE_HINT_KEY) as AuthRole | null;

  if (error) {
    throw new Error(params.get('error_description') || 'Authentication was cancelled.');
  }

  if (!code || !state || !storedState || state !== storedState) {
    throw new Error('The authentication response was invalid.');
  }

  const config = getConfig();
  const response = await fetch(`${config.url}/realms/${config.realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier || '',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorDescription = typeof (data as Record<string, unknown>).error_description === 'string'
      ? (data as Record<string, unknown>).error_description
      : typeof (data as Record<string, unknown>).error === 'string'
        ? (data as Record<string, unknown>).error
        : undefined;
    throw new Error(typeof errorDescription === 'string' ? errorDescription : 'Unable to exchange the authorization code.');
  }

  const session = buildSession(data as Record<string, unknown>, hintedRole);
  saveSession(session);
  return session;
}

export function getAuthRedirectPath(session: Pick<AuthSession, 'role' | 'accountRole' | 'organization' | 'organizationSlug'> | null | undefined) {
  if (!session) {
    return '/app';
  }
  const slug = session.organizationSlug || (session.organization ? session.organization.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'apollo-health');
  if (session.accountRole === 'admin') {
    return `/${slug}/admin`;
  }
  if (session.accountRole === 'reviewer') {
    return `/${slug}/review`;
  }
  return '/app';
}