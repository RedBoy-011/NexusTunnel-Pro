import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  ShieldCheck,
  Terminal,
  Lock,
  Copy,
  Check,
  AlertCircle,
  Zap,
  Clock,
  X,
  ExternalLink,
  RefreshCw,
  Globe,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import { AuthStatus, OneTimeToken, MagicLinkInfo } from '../types.js';

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
  const [tokenInput, setTokenInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [magicLinks, setMagicLinks] = useState<MagicLinkInfo | null>(null);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const [authMode, setAuthMode] = useState<'magic-link' | 'manual-pin'>('magic-link');

  const sshCommand = 'sudo tunnel-manager login-link';

  useEffect(() => {
    if (isOpen) {
      handleGenerateMagicLinks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateMagicLinks = async () => {
    setIsGeneratingLinks(true);
    try {
      const res = await fetch('/api/auth/magic-link', { method: 'POST' });
      if (res.ok) {
        const data: MagicLinkInfo = await res.json();
        setMagicLinks(data);
        setTokenInput(data.token);
      }
    } catch {
      // offline
    } finally {
      setIsGeneratingLinks(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMsg('لطفاً کد توکن موقت را وارد نمایید.');
      return;
    }

    setErrorMsg('');
    setIsVerifying(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'کد توکن نامعتبر یا منقضی شده است.');
      }

      // Save session id in localStorage
      if (data.sessionId) {
        localStorage.setItem('v2ray_panel_session', data.sessionId);
        onLoginSuccess(data.sessionId);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در اعتبارسنجی توکن');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDirectClickLogin = async (tokenCode: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenCode.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.sessionId) {
        localStorage.setItem('v2ray_panel_session', data.sessionId);
        onLoginSuccess(data.sessionId);
        onClose();
      } else {
        throw new Error(data.error || 'خطا در ورود با لینک');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در برقراری سشن');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                ورود امن به پنل با لینک مستقیم جادویی (Magic Link)
              </h3>
              <p className="text-xs text-slate-400">
                بدون نیاز به تایپ پسورد؛ با آدرس داینامیک یک‌بار مصرف
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
        {authStatus?.allowLocalhostBypass && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <span className="font-bold text-emerald-300 block">دسترسی محلی (127.0.0.1) فعال است:</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                درخواست‌های داخل سرور نیازی به توکن ندارند. اما هنگام دسترسی از طریق اینترنت یا آی‌پی عمومی، این لینک‌های یک‌بار مصرف امنیت کامل پنل را تضمین می‌کنند.
              </p>
            </div>
          </div>
        )}

        {/* Tab Toggle: Direct Magic Link vs Manual Token PIN */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setAuthMode('magic-link')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'magic-link'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>لینک مستقیم ورود (توصیه‌شده - Zero Typing)</span>
          </button>

          <button
            onClick={() => setAuthMode('manual-pin')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'manual-pin'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>ورود دستی با کد توکن ۶ رقمی</span>
          </button>
        </div>

        {/* MODE 1: Magic Link Direct URLs */}
        {authMode === 'magic-link' && (
          <div className="space-y-4 text-xs">
            {/* Strategy Explainer */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1.5">
              <div className="text-amber-400 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>نحوه کارکرد استراتژی Magic Link (مشابه Jupyter و Portainer):</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                وقتی در ترمینال SSH دستور <code className="text-cyan-300 font-mono">sudo tunnel-manager login-link</code> را اجرا می‌کنید، اسکریپت آدرس اختصاصی زیر را می‌سازد. با باز کردن لینک، احراز هویت خودکار انجام شده و نشست شما در مرورگر تا پایان کار ذخیره می‌شود. توکن پس از اولین ورود فوراً باطل می‌گردد.
              </p>
            </div>

            {/* Ready Clickable URLs Box */}
            <div className="space-y-3">
              {/* Option A: Public Server IP Link */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>ورود مستقیم با آی‌پی سرور (Direct Public IP URL):</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">معتبر ۱۰ دقیقه</span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="font-mono text-cyan-300 text-xs truncate dir-ltr text-left">
                    {magicLinks ? magicLinks.publicIpUrl : 'در حال بارگذاری...'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy('pub_url', magicLinks?.publicIpUrl || '')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="کپی لینک"
                    >
                      {copiedKey === 'pub_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => magicLinks && handleDirectClickLogin(magicLinks.token)}
                      disabled={isVerifying}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>ورود آنی</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Option B: Remote Tunnel Gateway Link */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                    <span>ورود از طریق تونل معکوس سرور ریموت (Remote Tunnel Gateway):</span>
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono">ایمن از تحریم</span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="font-mono text-purple-300 text-xs truncate dir-ltr text-left">
                    {magicLinks ? magicLinks.remoteTunnelUrl : 'در حال بارگذاری...'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy('rem_url', magicLinks?.remoteTunnelUrl || '')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="کپی لینک"
                    >
                      {copiedKey === 'rem_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => magicLinks && handleDirectClickLogin(magicLinks.token)}
                      disabled={isVerifying}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>ورود آنی</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CLI SSH Command Box */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>دستور تولید لینک در ترمینال سرور:</span>
                <span className="font-mono text-cyan-400">SSH CLI</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 dir-ltr text-left">
                <code>{sshCommand}</code>
                <button
                  onClick={() => handleCopy('ssh_cmd', sshCommand)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  {copiedKey === 'ssh_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Regenerate New Token */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                توکن فعلی: <strong className="text-white font-mono">{magicLinks?.token}</strong>
              </span>

              <button
                type="button"
                onClick={handleGenerateMagicLinks}
                disabled={isGeneratingLinks}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingLinks ? 'animate-spin text-cyan-400' : ''}`} />
                <span>تولید لینک و توکن جدید داینامیک</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: Manual PIN Input (Fallback) */}
        {authMode === 'manual-pin' && (
          <form onSubmit={handleVerify} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                کد توکن موقت ۶ رقمی یا با پیشوند TK:
              </label>
              <input
                type="text"
                required
                placeholder="مثال: TK-928415 یا 928415"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm tracking-wider focus:outline-none focus:border-emerald-500 dir-ltr text-left"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1">
                این کد را می‌توانید با زدن دستور <code className="text-emerald-300 font-mono">sudo tunnel-manager token</code> در ترمینال دریافت کنید.
              </p>
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
                disabled={isVerifying}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال اعتبارسنجی...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>ورود به سامانه</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
