import React, { useState } from 'react';
import {
  BookOpen,
  GitBranch,
  Download,
  Copy,
  Check,
  Terminal,
  Zap,
  RefreshCw,
  Server,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Code2,
  Globe,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

interface GitHubBookProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const GitHubBook: React.FC<GitHubBookProps> = ({ onNotify }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ version: string; time: string } | null>(null);

  const oneLinerInstall = `curl -fsSL https://raw.githubusercontent.com/username/nexustunnel/main/install.sh | sudo bash`;
  const oneLinerUpdate = `sudo bash -c "cd /opt/v2ray-balancer && git pull origin main && npm install --production && systemctl restart v2ray-balancer.service"`;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTriggerGitHubUpdate = async () => {
    setIsUpdating(true);
    onNotify('در حال استعلام و دریافت آخرین بروزرسانی از گیت‌هاب...', 'info');
    try {
      const res = await fetch('/api/system/update-github', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setUpdateResult({ version: data.version, time: data.updatedAt });
        onNotify(data.message || 'بروزرسانی از گیت‌هاب با موفقیت اعمال گردید.', 'success');
      } else {
        throw new Error(data.error || 'خطا در فرآیند بروزرسانی');
      }
    } catch (err: any) {
      onNotify(err.message || 'خطا در ارتباط با سرور', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Update CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>کتابچه راهنمای رسمی گیت‌هاب (NexusTunnel Pro)</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              v3.2.0 Multi-Tunnel & Dual-Stack
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            نام رسمی پروژه: <strong>NexusTunnel Pro</strong> • پشتیبانی از چندین تانل همزمان (Multi-Tunnel)، نصب خودکار هسته بدون نیاز به تنظیمات دستی، لودبالانسر سابسکرایب و احراز هویت توکن
          </p>
        </div>

        {/* Update button */}
        <button
          onClick={handleTriggerGitHubUpdate}
          disabled={isUpdating}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'در حال بروزرسانی...' : 'بروزرسانی آنلاین به آخرین نسخه گیت‌هاب'}</span>
        </button>
      </div>

      {/* Update confirmation banner */}
      {updateResult && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              سامانه شما با موفقیت به نسخه <strong>v{updateResult.version}</strong> گیت‌هاب بروزرسانی شد (ساعت: {updateResult.time}).
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Git Status: Up to date</span>
        </div>
      )}

      {/* Highlight Box: One-Liner Install */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>دستور تک‌خطی نصب و راه‌اندازی با یک کلیک در اوبونتو (One-Liner Install)</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Official One-Liner
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          تنها با اجرای این دستور تک‌خطی در ترمینال سرور اوبونتو (20.04، 22.04 و 24.04)، کلیه وابستگی‌های سیستمی (autossh, socat, xray, systemd) به طور ۱۰۰٪ خودکار در هسته نصب و فعال می‌شوند:
        </p>

        <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3.5 group">
          <code className="text-xs font-mono text-emerald-400 dir-ltr text-left block overflow-x-auto whitespace-pre">
            {oneLinerInstall}
          </code>
          <button
            onClick={() => handleCopy('oneliner', oneLinerInstall)}
            className="absolute top-2.5 left-2.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="کپی دستور تک‌خطی نصب"
          >
            {copiedKey === 'oneliner' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Clear Separation of Concerns Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>معماری تفکیک وظایف: ۲ بخش کاملاً مجزا و مستقل (Separation of Duties)</span>
          </div>
          <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30 font-bold">
            2 Independent Engines
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs">۱</span>
              <span>بخش ۱: هسته سابسکرایب‌ها و ایجاد ساکس داخلی (Local SOCKS5)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              وظیفه این بخش منحصراً دریافت لینک‌های سابسکرایب، استخراج کانفیگ‌ها، تست پینگ واقعی TCP و ایجاد سوکت‌های ساکس۵ محلی روی پورت‌های <code className="text-emerald-300 font-mono">127.0.0.1:1080</code> (لودبالانسر) و <code className="text-emerald-300 font-mono">1081-1088</code> است. این بخش کاملاً مستقل از اینترنت یا سرورهای تانل عمل می‌کند.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono text-xs">۲</span>
              <span>بخش ۲: سامانه مستقل تانلینگ شبکه (Reverse Multi-Tunnel)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              وظیفه این بخش فوروارد و نگاشت هرگونه پورت شبکه (ساکس، وب‌پنل ۸۰۸۰، دیتابیس، DNS یا سرویس‌های دلخواه) از سرور محلی به سرورهای خارج (آلمان، فنلاند، هلند) از طریق کلید امن SSH و socat است. این بخش یک ابزار عمومی انتقال پورت است و هیچ وابستگی به ساختار سابسکرایب‌ها ندارد.
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Tunnel Deep Dive Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>قابلیت تانلینگ چندگانه (Multi-Tunnel Architecture: ۲، ۳ یا چندین تانل همزمان)</span>
          </div>
          <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Multi-Destination Tunnels
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          در NexusTunnel Pro می‌توانید به صورت همزمان ۲، ۳ یا بیشتر تانل مستقل به سرورهای مختلف خارج (مثلاً سرور آلمان، فنلاند، هلند) برقرار کنید.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <span className="font-bold text-emerald-300 block">۱. لودبالانسینگ بین تانل‌ها:</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              پورت‌های ۱۰۸۱ تا ۱۰۸۸ می‌توانند بین تانل‌های مختلف توزیع شوند؛ مثلاً ترافیک کانفیگ‌های برتر ۱ و ۲ از تانل آلمان، کانفیگ‌های ۳ و ۴ از تانل فنلاند و بقیه از تانل هلند عبور داده شوند.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <span className="font-bold text-cyan-300 block">۲. حالت سوئیچ اضطراری (Failover):</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              در صورتی که یکی از دیتاسنترها با اختلال، فیلترینگ یا قطعی مواجه شود، نگهبان Watchdog به طور خودکار بدون قطع ترافیک کاربر، مسیر را به تانل‌های پشتیبان (Standby) هدایت می‌کند.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <span className="font-bold text-purple-300 block">۳. نگاشت مستقل پورت‌ها:</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              هر تانل کلید اختصاصی امن SSH خود را داشته و می‌توانید پورت‌های TCP یا UDP خاصی را منحصراً به همان تانل اختصاص دهید.
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Installation Zero-Config Deep Dive Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نصب خودکار هسته و وابستگی‌های سیستمی (Zero-Config Auto-Core)</span>
          </div>
          <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            No Manual Setup
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          دیگر نیازی به کپی دستی فایل‌های سرویس، ایجاد دستی دایرکتوری‌ها یا نصب تک‌تک پکیج‌ها در اوبونتو نیست. هسته سیستم به همراه اسکریپت نصب به صورت خودکار موارد زیر را مستقر می‌سازد:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono font-bold text-emerald-400">autossh</div>
            <div className="text-[10px] text-slate-400 mt-0.5">نگهبان پایداری تانل معکوس</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono font-bold text-cyan-400">socat</div>
            <div className="text-[10px] text-slate-400 mt-0.5">رله و کپسوله‌سازی UDP over TCP</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono font-bold text-purple-400">xray-core</div>
            <div className="text-[10px] text-slate-400 mt-0.5">موتور هسته و لودبالانسر محلی</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono font-bold text-teal-400">systemd units</div>
            <div className="text-[10px] text-slate-400 mt-0.5">سرویس‌های خودکار پس‌زمینه</div>
          </div>
        </div>
      </div>

      {/* IPv4 + IPv6 Technical Deep Dive Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Globe className="w-4 h-4 text-teal-400" />
            <span>پشته دوگانه (IPv4 + IPv6 Dual-Stack): امکان فنی و مزایا</span>
          </div>
          <span className="text-[10px] text-teal-300 font-mono bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
            RFC 8305
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          لودبالانس ترافیک بین IPv4 و IPv6 ۱۰۰٪ امکان‌پذیر و در شرایط اینترنت ایران به شدت کارآمد است. مسیرهای IPv6 پکت‌لاس به مراتب کمتر و سرعت پایدارتری دارند. تانل معکوس از آدرس‌های IPv6 برای بایند پورت‌ها به صورت نیتیو پشتیبانی می‌نماید.
        </p>
      </div>

      {/* Highlight Box: One-Liner Update */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>دستور تک‌خطی بروزرسانی به آخرین نسخه گیت‌هاب (One-Liner Update)</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">Git Pull & Reload</span>
        </div>

        <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3 group">
          <code className="text-xs font-mono text-cyan-300 dir-ltr text-left block overflow-x-auto whitespace-pre">
            {oneLinerUpdate}
          </code>
          <button
            onClick={() => handleCopy('update_cmd', oneLinerUpdate)}
            className="absolute top-2 left-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="کپی دستور بروزرسانی"
          >
            {copiedKey === 'update_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* CLI Menu Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
            <Terminal className="w-4 h-4" />
            <span>کلیدهای منوی ترمینال (sudo nexustunnel یا sudo tunnel-manager):</span>
          </span>
          <div className="space-y-1.5 font-mono text-[11px] text-slate-300 pt-1">
            <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-emerald-300">1) Multi-Tunnel Status</span>
              <span className="text-slate-500 font-sans">مشاهده وضعیت تانل‌های ۱، ۲ و ۳</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-emerald-300">2) Add New Tunnel</span>
              <span className="text-slate-500 font-sans">افزودن تانل جدید به سرورهای مختلف</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-cyan-300">3) Change Strategy</span>
              <span className="text-slate-500 font-sans">توزیع بار پورت‌ها یا Failover</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-cyan-300">7) Magic Login Link</span>
              <span className="text-slate-500 font-sans">تولید لینک ورود مستقیم با توکن</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-teal-300">8) Local Access (127.0.0.1)</span>
              <span className="text-slate-500 font-sans">ورود بدون توکن منحصراً لوکال</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-amber-300">9) Update from GitHub</span>
              <span className="text-slate-500 font-sans">آپدیت خودکار به آخرین نسخه</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <span className="font-bold text-teal-400 flex items-center gap-1.5">
            <Server className="w-4 h-4" />
            <span>دستورات سریع خط فرمان (CLI Cheatsheet):</span>
          </span>
          <div className="space-y-1.5 font-mono text-[11px] text-slate-300 pt-1">
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block font-sans text-[10px]">اجرای منوی مدیریتی:</span>
              <code className="text-emerald-300">sudo nexustunnel</code>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block font-sans text-[10px]">تولید لینک ورود موقت:</span>
              <code className="text-cyan-300">sudo tunnel-manager login-link</code>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block font-sans text-[10px]">تست پینگ لودبالانسر محلی:</span>
              <code className="text-teal-300">curl -x socks5h://127.0.0.1:1080 ipinfo.io</code>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400 block font-sans text-[10px]">وضعیت سرویس‌های هسته:</span>
              <code className="text-purple-300">systemctl status v2ray-balancer reverse-tunnel</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
