'use client';

import {
  X,
  User,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Crown,
  Zap,
  Upload,
} from 'lucide-react';
import { type AuditorState } from '@/components/claimgpt/use-auditor-state';
import { useRouter } from 'next/navigation';
import fullLogo from './ClaimsGuru Black PNG.png';
import { clearAuthSession } from '@/lib/auth';
import { UserAvatar } from '@/components/claimgpt/user-avatar';

interface HamburgerMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  s: AuditorState;
  userName: string;
  userEmail: string;
  onOpenProfile: () => void;
  variant?: 'neon' | 'clinical' | 'executive';
}

export function HamburgerMenuDrawer({
  isOpen,
  onClose,
  s,
  userName,
  userEmail,
  onOpenProfile,
  variant = 'clinical',
}: HamburgerMenuDrawerProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

  const handleLogout = () => {
    try {
      clearAuthSession();
      localStorage.removeItem('claimgpt_user_name');
      localStorage.removeItem('claimgpt_user_email');
    } catch {
      /* ignore */
    }
    onClose();
    router.push('/login');
  };

  const handleGoHome = () => {
    onClose();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUploadNew = () => {
    onClose();
    s.setIsUploadOpen(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* Theme-specific styles matching Design 1 (neon), Design 2 (clinical), and Design 3 (executive) */
  const themeStyles = {
    neon: {
      drawerBg: 'bg-[#090e1a] border-r border-cyan-500/30 text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.15)]',
      headerBg: 'bg-[#0e1626] border-b border-cyan-500/20',
      brandIcon: 'bg-gradient-to-tr from-cyan-500 to-purple-600 text-white border border-cyan-400/40 shadow-lg shadow-cyan-500/20',
      brandTag: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
      subtitle: 'text-cyan-300/70',
      userTile: 'bg-[#111c33] border border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-950/50',
      userAvatar: 'bg-gradient-to-tr from-cyan-500 to-purple-600 text-white',
      activePill: 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm font-bold',
      activeTag: 'bg-cyan-400 text-slate-950 font-bold',
      navText: 'text-slate-300 hover:bg-cyan-500/10 hover:text-white',
      iconColor: 'text-cyan-400',
      divider: 'border-cyan-500/20',
      closeBtn: 'text-cyan-300 hover:bg-cyan-500/20 hover:text-white',
      footerBg: 'bg-[#0e1626] border-t border-cyan-500/20 text-cyan-300/70',
      brandTitle: 'ClaimsGuru',
    },
    clinical: {
      drawerBg: 'bg-white border-r border-slate-200 text-slate-900 shadow-2xl',
      headerBg: 'bg-slate-50/90 border-b border-slate-200',
      brandIcon: 'bg-teal-600 text-white shadow-sm',
      brandTag: 'bg-teal-50 text-teal-700 border border-teal-200',
      subtitle: 'text-slate-500',
      userTile: 'bg-slate-50 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/60',
      userAvatar: 'bg-teal-600 text-white',
      activePill: 'bg-teal-50 text-teal-800 font-bold border border-teal-200 shadow-xs',
      activeTag: 'bg-teal-600 text-white font-bold',
      navText: 'text-slate-700 hover:bg-slate-50 hover:text-teal-700',
      iconColor: 'text-teal-600',
      divider: 'border-slate-200',
      closeBtn: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
      footerBg: 'bg-slate-50 border-t border-slate-200 text-slate-500',
      brandTitle: 'ClaimsGuru',
    },
    executive: {
      drawerBg: 'bg-[#060b18] border-r border-amber-500/30 text-amber-50 shadow-[0_0_50px_rgba(245,158,11,0.15)]',
      headerBg: 'bg-[#0d1527] border-b border-amber-500/20',
      brandIcon: 'bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 border border-amber-400/40 font-bold shadow-lg shadow-amber-500/20',
      brandTag: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      subtitle: 'text-amber-300/70',
      userTile: 'bg-[#111c33] border border-amber-500/20 hover:border-amber-400/50 hover:bg-amber-950/50',
      userAvatar: 'bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-bold',
      activePill: 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm font-bold',
      activeTag: 'bg-amber-400 text-slate-950 font-bold',
      navText: 'text-slate-300 hover:bg-amber-500/10 hover:text-amber-200',
      iconColor: 'text-amber-400',
      divider: 'border-amber-500/20',
      closeBtn: 'text-amber-300 hover:bg-amber-500/20 hover:text-white',
      footerBg: 'bg-[#0d1527] border-t border-amber-500/20 text-amber-300/70',
      brandTitle: 'ClaimsGuru',
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden font-sans">
      {/* Click-outside Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-out Sidebar Navigation Panel (Solid Opaque Background) */}
      <div className={`absolute top-0 left-0 bottom-0 z-[111] w-72 sm:w-80 flex flex-col animate-slide-right ${themeStyles.drawerBg}`}>
        
        {/* Drawer Header */}
        <div className={`p-5 flex items-center justify-between ${themeStyles.headerBg}`}>
          <div className="flex items-center gap-3">
            <img 
              src={fullLogo.src} 
              className="h-7 w-auto" 
              alt="ClaimsGuru Logo" 
            />
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${themeStyles.brandTag}`}>PRO</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${themeStyles.closeBtn}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Account Quick Tile */}
        <div 
          className={`p-3.5 mx-3 mt-3 rounded-2xl transition-all cursor-pointer group ${themeStyles.userTile}`}
          onClick={() => {
            onClose();
            onOpenProfile();
          }}
          title="Open User Profile"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar name={userName} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{userName}</p>
                <p className={`text-[10px] truncate ${themeStyles.subtitle}`}>{userEmail}</p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 group-hover:translate-x-0.5 transition-transform ${themeStyles.iconColor}`} />
          </div>
        </div>

        {/* Navigation Menu List */}
        <div className="px-3 py-4 space-y-1.5 flex-1 overflow-y-auto scrollbar-thin">
          <p className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-wider ${themeStyles.subtitle}`}>Navigation Menu</p>

          {/* Item 1: Home (ACTIVE on Dashboard) */}
          <button
            type="button"
            onClick={handleGoHome}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold transition-all text-xs group ${themeStyles.activePill}`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className={`h-4 w-4 ${themeStyles.iconColor}`} />
              <span>Home</span>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${themeStyles.activeTag}`}>Active</span>
          </button>

          {/* Item 2: Profile */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-xs font-medium ${themeStyles.navText}`}
          >
            <div className="flex items-center gap-3">
              <User className={`h-4 w-4 ${themeStyles.iconColor}`} />
              <span>Profile</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          {/* Item 3: Upload New Claim */}
          <button
            type="button"
            onClick={handleUploadNew}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-xs font-medium ${themeStyles.navText}`}
          >
            <div className="flex items-center gap-3">
              <Upload className={`h-4 w-4 ${themeStyles.iconColor}`} />
              <span>Upload Claim</span>
            </div>
            <span className="text-[10px] text-accent font-semibold">+ New</span>
          </button>

          <div className="pt-3 pb-1">
            <div className={`border-t ${themeStyles.divider}`} />
          </div>

          <p className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-wider ${themeStyles.subtitle}`}>Account &amp; System</p>

          {/* Sign Out / Switch Account */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all text-xs font-medium cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-rose-500 flex-none" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>

        {/* Drawer Footer */}
        <div className={`p-4 text-[11px] flex items-center justify-between ${themeStyles.footerBg}`}>
          <span>ClaimsGuru v2.4</span>
          <span className="flex items-center gap-1 font-bold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Online
          </span>
        </div>

      </div>
    </div>
  );
}
