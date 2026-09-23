'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, XCircle, Info, X, ExternalLink } from 'lucide-react';
import { getIngressApiUrl } from '@/lib/api-client';
import { getStoredAuthSession } from '@/lib/auth';

interface NotificationItem {
  id: string;
  claim_id?: string;
  type: 'warning' | 'success' | 'error' | 'info';
  title: string;
  message: string;
  created_at: string;
  unread?: boolean;
}

interface NotificationBellProps {
  variant?: 'neon' | 'clinical' | 'executive';
}

export function NotificationBell({ variant = 'neon' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const session = getStoredAuthSession();
      const token = session?.accessToken;
      const ingressBase = getIngressApiUrl();

      // Collect stored claim IDs from localStorage to guarantee 100% notification linkage
      const recentRaw = typeof window !== 'undefined' ? localStorage.getItem('claimgpt_recent_claims') : null;
      let claimIds: string[] = [];
      if (recentRaw) {
        try {
          const parsed = JSON.parse(recentRaw);
          if (Array.isArray(parsed)) {
            claimIds = parsed.map((c: any) => c.id || c.claim_id).filter(Boolean);
          }
        } catch {}
      }

      const queryParams = new URLSearchParams();
      if (session?.user?.id) queryParams.set('patient_id', session.user.id);
      if (claimIds.length > 0) queryParams.set('claim_ids', claimIds.slice(0, 20).join(','));

      const url = `${ingressBase}/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-User-Id': session?.user?.id || session?.user?.email || 'user',
          'X-User-Role': session?.role || 'patient',
          ...(session?.user?.email ? { 'X-User-Email': session.user.email } : {}),
        },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        const items: NotificationItem[] = data.notifications || [];
        setNotifications(items);
        setHasUnread(items.some(n => n.unread));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setHasUnread(false);
    }
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
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${themeStyles.btn} cursor-pointer`}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white" />
          </span>
        )}
      </button>

      {/* Floating Notifications Popover Dropdown */}
      {isOpen && (
        <div className={`absolute right-0 top-11 z-[120] w-80 sm:w-96 rounded-2xl border backdrop-blur-xl p-0 overflow-hidden shadow-2xl animate-scale-in ${themeStyles.dropdown}`}>
          {/* Header */}
          <div className={`px-4 py-3 flex items-center justify-between ${themeStyles.header}`}>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className={`text-xs uppercase tracking-wider ${themeStyles.title}`}>Alerts &amp; Notifications</span>
              {notifications.length > 0 && (
                <span className="rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.2 border border-teal-200">
                  {notifications.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-black/5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Notifications Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${themeStyles.iconBg}`}>
                  <BellOff className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold">No new notifications for now</h4>
                  <p className={`text-[11px] mt-1 ${themeStyles.subtext}`}>
                    You&apos;re all caught up! TPA document requests, adjudication alerts, and settlements will appear here.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition-colors hover:bg-slate-50 flex items-start gap-3 ${
                    n.type === 'warning'
                      ? 'bg-amber-50/40'
                      : n.type === 'success'
                      ? 'bg-emerald-50/30'
                      : n.type === 'error'
                      ? 'bg-rose-50/30'
                      : ''
                  }`}
                >
                  <div className="flex-none pt-0.5">
                    {n.type === 'warning' ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    ) : n.type === 'success' ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : n.type === 'error' ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                        <XCircle className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                        <Info className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{n.title}</p>
                    <p className="text-[11px] text-slate-600 leading-snug">{n.message}</p>
                    <p className="text-[9px] text-slate-400 pt-0.5">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Badge */}
          <div className={`px-4 py-2 border-t text-[10px] text-center font-medium ${themeStyles.header}`}>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Insurer Adjudication Sync Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

