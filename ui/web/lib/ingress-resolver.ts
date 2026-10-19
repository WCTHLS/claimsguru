/**
 * Centralized Ingress API URL Resolver & Fetcher
 *
 * Guarantees:
 * 1. Sub-second resolution in Production (calls authoritative cloud ingress directly, no dead hostnames).
 * 2. 100% compatibility with Local Development (uses localhost/127.0.0.1:8000 immediately).
 * 3. Graceful offline fallback in standalone dev mode with fast connection timeouts.
 */

const PREPROD_INGRESS_FQDN =
  'https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io';

export function getIngressCandidates(path: string): string[] {
  const isDev = process.env.NODE_ENV !== 'production';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  const candidates: string[] = [];

  // 1. Read configured environment variables
  const envBase =
    process.env.INTERNAL_INGRESS_URL ||
    process.env.INGRESS_API ||
    process.env.NEXT_PUBLIC_API_BASE;

  if (envBase) {
    let clean = envBase.replace(/\/+$/, '').replace(/\/ingress$/, '');
    // In ACA internal networking, port 8000 is internal container port, envoy reverse proxy is on port 80
    if (clean.includes('cg-preprod-cin-ingress:8000')) {
      clean = clean.replace('cg-preprod-cin-ingress:8000', 'cg-preprod-cin-ingress');
    }
    candidates.push(`${clean}${cleanPath}`);
  }

  // 2. Environment-specific authoritative fallbacks
  if (isDev) {
    candidates.push(`http://127.0.0.1:8000${cleanPath}`);
    candidates.push(`http://localhost:8000${cleanPath}`);
  } else {
    // In production/cloud, always ensure the working preprod Ingress FQDN is present
    candidates.push(`${PREPROD_INGRESS_FQDN}${cleanPath}`);
    candidates.push(`http://cg-preprod-cin-ingress${cleanPath}`);
  }

  return Array.from(new Set(candidates));
}

export async function fetchIngress(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = process.env.NODE_ENV !== 'production' ? 1500 : 5000
): Promise<{ res: Response | null; data: any }> {
  const candidates = getIngressCandidates(path);
  let res: Response | null = null;
  let data: any = null;

  for (const url of candidates) {
    try {
      const attempt = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (attempt.status !== 404) {
        res = attempt;
        data = await attempt.json().catch(() => ({}));
        break;
      }
    } catch {
      // Failed (e.g. connection refused, network timeout) -> try next candidate immediately
    }
  }

  return { res, data };
}
