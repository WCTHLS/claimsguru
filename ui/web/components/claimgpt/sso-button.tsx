'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type SSOProvider = 'google' | 'microsoft' | 'okta' | 'saml';

interface SSOButtonProps {
  provider: SSOProvider;
  variant?: 'light' | 'dark';
  onClick?: () => void;
}

const PROVIDER_CONFIG: Record<
  SSOProvider,
  { label: string; icon: React.ReactNode }
> = {
  google: {
    label: 'Google Workspace',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  microsoft: {
    label: 'Microsoft Entra ID',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <path fill="#F25022" d="M3 3h8v8H3z" />
        <path fill="#7FBA00" d="M13 3h8v8h-8z" />
        <path fill="#00A4EF" d="M3 13h8v8H3z" />
        <path fill="#FFB900" d="M13 13h8v8h-8z" />
      </svg>
    ),
  },
  okta: {
    label: 'Okta',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="#007DC1" strokeWidth="3.5" />
      </svg>
    ),
  },
  saml: {
    label: 'SAML SSO',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden fill="none">
        <path
          d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"
          stroke="#0f4c81"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="#0d9488"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

export function SSOButton({ provider, variant = 'light', onClick }: SSOButtonProps) {
  const [loading, setLoading] = useState(false);
  const config = PROVIDER_CONFIG[provider];

  const handleClick = () => {
    setLoading(true);
    onClick?.();
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2.5 rounded-lg border px-4 text-sm font-medium transition-all tap-highlight-none',
        variant === 'light'
          ? 'border-border bg-background text-foreground hover:bg-muted hover:border-accent/40'
          : 'border-white/20 bg-white/5 text-white hover:bg-white/15',
        loading && 'opacity-70'
      )}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        config.icon
      )}
      <span>{config.label}</span>
    </button>
  );
}
