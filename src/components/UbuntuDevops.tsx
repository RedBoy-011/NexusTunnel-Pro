import React, { useState, useEffect } from 'react';
import {
  Download,
  Copy,
  Check,
  Server,
  FileCode,
  Terminal,
  Settings,
  ShieldCheck,
  Zap,
  Play
} from 'lucide-react';

export const UbuntuDevops: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'install' | 'service' | 'xray' | 'python'>('install');
  const [codeContent, setCodeContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCode(activeCodeTab);
  }, [activeCodeTab]);

  const fetchCode = async (tab: 'install' | 'service' | 'xray' | 'python') => {
    setIsLoading(true);
    let url = '/api/downloads/install-sh';
    if (tab === 'service') url = '/api/downloads/systemd';
    if (tab === 'xray') url = '/api/downloads/xray-config';
    if (tab === 'python') url = '/api/downloads/daemon-py';

    try {
      const res = await fetch(url);
      const text = await res.text();
      setCodeContent(text);
    } catch {
      setCodeContent('# خطا در بارگذاری کد');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = 'install.sh';
    if (activeCodeTab === 'service') filename = 'v2ray-balancer.service';
    if (activeCodeTab === 'xray') filename = 'config.json';
    if (activeCodeTab === 'python') filename = 'v2ray_balancer.py';

    const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-emerald-400" />
          <span>استقرار، فایل‌های سرویس (Systemd) و راه‌اندازی روی اوبونتو</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          فایل‌های پیکربندی و کدهای لازم برای اجرای دائمی به صورت سرویس پس‌زمینه در سیستم‌عامل Ubuntu
        </p>
      </div>

      {/* Quick Setup Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>مراحل سریع راه‌اندازی روی سرور تازه اوبونتو (Quick Start)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs flex items-center justify-center font-bold">
              ۱
            </span>
            <div className="text-xs font-semibold text-slate-200">ایجاد پوشه کاری و فایل اسکریپت</div>
            <p className="text-[11px] text-slate-400">
              یک دایرکتوری در مسیر <code className="text-emerald-300">/opt/v2ray-balancer</code> ساخته و فایل دیمن پایتون یا نود را در آن قرار دهید.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs flex items-center justify-center font-bold">
              ۲
            </span>
            <div className="text-xs font-semibold text-slate-200">ثبت سرویس Systemd</div>
            <p className="text-[11px] text-slate-400">
              فایل سرویس را در <code className="text-cyan-300">/etc/systemd/system/v2ray-balancer.service</code> ذخیره کرده و با <code className="text-cyan-300">systemctl enable</code> فعال کنید.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-mono text-xs flex items-center justify-center font-bold">
              ۳
            </span>
            <div className="text-xs font-semibold text-slate-200">اجرا در ریبوت و تست نهایی</div>
            <p className="text-[11px] text-slate-400">
              سرویس با هر ریستارت به طور خودکار شروع می‌شود و پورت‌های ۱۰۸۰ تا ۱۰۸۸ را روی لوکال‌ هاست آماده می‌کند.
            </p>
          </div>
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        {/* Tab Headers */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-2.5 gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveCodeTab('install')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeCodeTab === 'install'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>install.sh (اسکریپت نصب کامل)</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('service')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeCodeTab === 'service'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>v2ray-balancer.service (Systemd)</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('xray')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeCodeTab === 'xray'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>xray_config.json (کانفیگ هسته Xray)</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('python')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeCodeTab === 'python'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>v2ray_balancer.py (دیمن مستقل)</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی کد</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود فایل</span>
            </button>
          </div>
        </div>

        {/* Code View Area */}
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] dir-ltr text-left leading-relaxed">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 font-sans">در حال بارگذاری فایل...</div>
          ) : (
            <pre className="whitespace-pre">{codeContent}</pre>
          )}
        </div>
      </div>
    </div>
  );
};
