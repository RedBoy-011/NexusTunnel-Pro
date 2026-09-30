import React, { useState } from 'react';
import {
  Lock,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  X,
  Terminal,
} from 'lucide-react';
import { AuthStatus } from '../types.js';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (sessionId: string) => void;
  authStatus: AuthStatus | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  authStatus,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('لطفاً رمز عبور پنل را وارد نمایید.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'رمز عبور نادرست است.');
      }

      if (data.sessionId) {
        localStorage.setItem('v2ray_panel_session', data.sessionId);
        onLoginSuccess(data.sessionId);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ورود به پنل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Lock className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                ورود به پنل مدیریت NexusTunnel Pro
              </h3>
              <p className="text-xs text-slate-400">
                جهت دسترسی به پنل، رمز عبور را وارد نمایید
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Localhost notice */}
        {authStatus?.loginMethod === 'localhost-bypass' && (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>شما از طریق لوکال یا تانل SSH متصل هستید و دسترسی شما مجاز است.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">
              رمز عبور پنل:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="رمز عبور خود را وارد نمایید..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm tracking-wider focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terminal CLI Hint */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Terminal className="w-3.5 h-3.5" />
              <span>مدیریت رمز از طریق SSH:</span>
            </div>
            <p className="leading-relaxed">
              جهت مشاهده، تغییر رمز یا غیرفعال‌سازی قفل ورود، در ترمینال سرور دستور زیر را اجرا کنید:
            </p>
            <code className="block bg-slate-900 px-2 py-1 rounded text-emerald-400 font-mono text-xs dir-ltr text-left">
              sudo nexustunnel
            </code>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال بررسی...</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5" />
                  <span>ورود به پنل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
