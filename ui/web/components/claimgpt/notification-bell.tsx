'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, X } from 'lucide-react';

interface NotificationBellProps {
  variant?: 'neon' | 'clinical' | 'executive';
}

export function NotificationBell({ variant = 'neon' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    if (hasUnread) setHasUnread(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeStyles = {
    neon: {
      btn: 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 hover:text-white',
      badge: 'bg-cyan-400 shadow-sm shadow-cyan-400',
      dropdown: 'bg-[#090e1a]/95 border-cyan-500/30 text-slate-100 shadow-[0_0_40px_rgba(6,182,212,0.2)]',
      header: 'border-b border-cyan-500/20 bg-cyan-950/40 text-white',
      title: 'text-cyan-300 font-bold',
      subtext: 'text-cyan-300/60',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    },
    clinical: {
      btn: 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      badge: 'bg-teal-600',
      dropdown: 'bg-white/95 border-slate-200 text-slate-900 shadow-xl',
      header: 'border-b border-slate-200 bg-slate-50 text-slate-900',
      title: 'text-teal-800 font-bold',
      subtext: 'text-slate-500',
      iconBg: 'bg-teal-50 text-teal-700 border border-teal-200',
    },
    executive: {
      btn: 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-white',
      badge: 'bg-amber-400 shadow-sm shadow-amber-400',
      dropdown: 'bg-[#060b18]/95 border-amber-500/30 text-amber-50 shadow-[0_0_40px_rgba(245,158,11,0.2)]',
      header: 'border-b border-amber-500/20 bg-amber-950/40 text-amber-50',
      title: 'text-amber-300 font-bold',
      subtext: 'text-amber-300/60',
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
  }[variant];

  return (
    <div className="relative font-sans" ref={menuRef}>
      {/* Bell Icon Trigger Button */}
      <button
        type="button"
        onClick={toggleOpen}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${themeStyles.btn}`}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${themeStyles.badge}`} />
        )}
      </button>

      {/* Floating Notifications Popover Dropdown */}
      {isOpen && (
        <div className={`absolute right-0 top-11 z-[120] w-72 sm:w-80 rounded-2xl border backdrop-blur-xl p-0 overflow-hidden animate-scale-in ${themeStyles.dropdown}`}>
          {/* Header */}
          <div className={`px-4 py-3 flex items-center justify-between ${themeStyles.header}`}>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className={`text-xs uppercase tracking-wider ${themeStyles.title}`}>Notifications</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Empty State Body ("No notifications right now") */}
          <div className="p-6 text-center space-y-2">
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${themeStyles.iconBg}`}>
              <BellOff className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold">No new notifications for now</h4>
              <p className={`text-[11px] mt-1 ${themeStyles.subtext}`}>
                You&apos;re all caught up! New claim processing alerts and risk updates will appear here.
              </p>
            </div>
          </div>

          {/* Footer Badge */}
          <div className={`px-4 py-2 border-t text-[10px] text-center font-medium ${themeStyles.header}`}>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> System status operational
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
