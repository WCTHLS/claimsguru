'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'অসমীয়া' },
  { code: 'ur', label: 'اردو' },
  { code: 'sa', label: 'संस्कृत' },
];

export const STORAGE_KEY = 'claimsguru_lang';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
  className?: string;
  onLanguageChange?: (code: string) => void;
}

export function LanguageSwitcher({
  variant = 'light',
  className,
  onLanguageChange,
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(LANGUAGES[0]);

  // Load language from localStorage on client mount & set html attributes
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(STORAGE_KEY);
      if (savedCode) {
        const found = LANGUAGES.find((l) => l.code === savedCode);
        if (found) {
          setSelected(found);
          document.documentElement.lang = found.code;
          document.documentElement.dir = found.code === 'ur' ? 'rtl' : 'ltr';
          onLanguageChange?.(found.code);
        }
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, [onLanguageChange]);

  const handleSelectLanguage = (lang: (typeof LANGUAGES)[number]) => {
    setSelected(lang);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, lang.code);
    } catch {
      // Storage unavailable
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang.code;
      document.documentElement.dir = lang.code === 'ur' ? 'rtl' : 'ltr';
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('claimsguru:lang-change', { detail: { lang: lang.code } })
      );
    }
    onLanguageChange?.(lang.code);
  };

  const isLight = variant === 'light';

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all shadow-xs tap-highlight-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-600',
          isLight
            ? 'border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-slate-50 hover:border-slate-400'
            : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Select language: currently ${selected.label}`}
      >
        <Globe className={cn('h-4 w-4 shrink-0', isLight ? 'text-teal-700' : 'text-teal-200')} />
        <span className="font-semibold">{selected.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isLight ? 'text-slate-500' : 'text-white/70',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-50 mt-2 w-56 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl scrollbar-thin animate-fade-in text-[#0F172A]">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Select Language
            </p>
            {LANGUAGES.map((lang) => {
              const isSelected = selected.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang)}
                  className={cn(
                    'flex min-h-[40px] w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors tap-highlight-none',
                    isSelected
                      ? 'bg-teal-50 text-teal-800 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <span>{lang.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-teal-700 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
