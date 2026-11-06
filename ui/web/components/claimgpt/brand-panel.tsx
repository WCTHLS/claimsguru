import { ShieldCheck, Sparkles } from 'lucide-react';
import fullLogo from './ClaimsGuru White PNG.png';
import { FEATURES } from '@/lib/claimgpt-data';

const TRUST_BADGES = ['IRDAI aligned', 'ISO 27001', 'HIPAA aligned'];

export function BrandPanel() {
  return (
    <div className="brand-panel-gradient relative flex h-full flex-col justify-between overflow-hidden p-8 lg:p-12 text-white">
      {/* Animated aurora orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-aurora-1" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl animate-aurora-2" />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl animate-aurora-3" />
      </div>
      <div className="grid-pattern absolute inset-0 opacity-30" aria-hidden />

      {/* Header / Brand Logo Row - aligned with language switcher on the right */}
      <div className="relative z-10 animate-slide-up flex min-h-[44px] items-center">
        <div className="flex flex-wrap items-center gap-2.5">
          <img src={fullLogo.src} className="h-8 sm:h-9 w-auto object-contain" alt="ClaimsGuru Logo" />
          <span className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-teal-100 border border-white/20">
            Enterprise · India
          </span>
        </div>
      </div>

      <div className="relative z-10 max-w-md animate-slide-up my-auto py-6" style={{ animationDelay: '100ms' }}>
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-teal-200" />
          AI-powered reimbursement platform
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight lg:text-[2.5rem] lg:leading-[1.15]">
          AI-powered claims processing for India.
        </h1>
        <p className="mt-3.5 text-base leading-relaxed text-white/85">
          One unified workspace for OCR, coding, validation, TPA submission, and audit.
        </p>

        <ul className="mt-6 space-y-2.5">
          {FEATURES.map((feature, i) => (
            <li
              key={feature}
              className="flex items-center gap-3 text-sm text-white/95 animate-slide-up opacity-0"
              style={{ animationDelay: `${200 + i * 80}ms`, animationFillMode: 'forwards' }}
            >
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-teal-400/30 ring-1 ring-teal-400/50">
                <svg
                  className="h-3 w-3 text-teal-100"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trust Badges - high contrast (≥ 4.5:1 WCAG AA) */}
      <div className="relative z-10 animate-slide-up" style={{ animationDelay: '500ms' }}>
        <div className="flex flex-wrap gap-2">
          {TRUST_BADGES.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-transform hover:scale-105"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-teal-300" />
              <span>{badge}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
