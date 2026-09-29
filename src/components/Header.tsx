import React from 'react';
import { ShieldCheck, RefreshCw, Zap, Clock, Activity, Server, Radio, Key, Lock, LogOut } from 'lucide-react';
import { SystemStatus, AuthStatus } from '../types.js';

interface HeaderProps {
  status: SystemStatus | null;
  authStatus: AuthStatus | null;
  onTestNow: () => void;
  onIntervalChange: (interval: number) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  isTesting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  authStatus,
  onTestNow,
  onIntervalChange,
  onOpenLogin,
  onLogout,
  isTesting,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
              <Server className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  هسته سابسکرایب‌های ساکس محلی و سامانه تانلینگ شبکه
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>۲ بخش کاملاً مجزا و مستقل</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                بخش ۱: ایجاد ساکس۵ محلی روی 127.0.0.1:1080 با تست پینگ ساب‌ها • بخش ۲: سامانه مستقل تانلینگ شبکه معکوس
              </p>
            </div>
          </div>

          {/* Action Bar & Real-time Indicator */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auth Token Button */}
            <button
              onClick={onOpenLogin}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                authStatus?.isAuthenticated
                  ? 'bg-slate-800 border-emerald-500/30 text-emerald-300 hover:bg-slate-700'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              }`}
              title="ورود با توکن موقت یا بررسی وضعیت دسترسی"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {authStatus?.loginMethod === 'otp-token'
                  ? 'سشن توکن فعال'
                  : 'لینک جادویی / ورود با توکن'}
              </span>
            </button>

            {authStatus?.loginMethod === 'otp-token' && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                title="خروج از سشن توکن"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Countdown Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>تست خودکار بعدی:</span>
              <span className="font-mono font-bold text-cyan-300">
                {status ? `${status.nextTestCountdown}s` : '--'}
              </span>
            </div>

            {/* Interval Selector */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-lg p-0.5 text-xs text-slate-300">
              <span className="px-2 text-slate-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-slate-400" />
                دوره:
              </span>
              {[30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onIntervalChange(sec)}
                  className={`px-2 py-1 rounded transition-colors ${
                    status?.testInterval === sec
                      ? 'bg-emerald-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}ثانیه
                </button>
              ))}
            </div>

            {/* Instant Test Button */}
            <button
              onClick={onTestNow}
              disabled={isTesting}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isTesting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 active:scale-95 shadow-emerald-500/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'در حال تست پینگ...' : 'تست فوری پینگ'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
