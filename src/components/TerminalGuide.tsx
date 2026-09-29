import React, { useState } from 'react';
import { Terminal, Copy, Check, Info, ShieldCheck, Zap } from 'lucide-react';

export const TerminalGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const guides = [
    {
      key: 'curl-master',
      title: 'تست اتصال با cURL از طریق لودبالانسر (پورت ۱۰۸۰)',
      desc: 'استفاده از پروتکل socks5h:// تضمین می‌کند که DNS نیز از طریق پروکسی امن حل شود.',
      cmd: `curl -x socks5h://127.0.0.1:1080 https://ipinfo.io`,
    },
    {
      key: 'curl-single',
      title: 'تست اختصاصی تک‌کانفیگ‌ها (پورت‌های ۱۰۸۱ تا ۱۰۸۸)',
      desc: 'می‌توانید هر پورت را مستقیماً برای فرآیندهای مجزا تست کنید:',
      cmd: `curl -x socks5h://127.0.0.1:1081 https://ipinfo.io
curl -x socks5h://127.0.0.1:1082 https://ipinfo.io`,
    },
    {
      key: 'env-vars',
      title: 'تنظیم متغیر محیطی موقت برای کل ترمینال اوبونتو',
      desc: 'تمامی ابزارهای ترمینال مانند wget، curl، python و غیـره از لودبالانسر عبور خواهند کرد:',
      cmd: `export ALL_PROXY="socks5h://127.0.0.1:1080"
export http_proxy="socks5h://127.0.0.1:1080"
export https_proxy="socks5h://127.0.0.1:1080"`,
    },
    {
      key: 'git',
      title: 'تنظیم پروکسی برای Git (رفع تحریم Clone و Push)',
      desc: 'تنظیم لودبالانسر برای مخازن گیت‌هاب و گیت‌لب:',
      cmd: `git config --global http.proxy socks5h://127.0.0.1:1080
git config --global https.proxy socks5h://127.0.0.1:1080`,
    },
    {
      key: 'apt',
      title: 'تنظیم پروکسی برای APT اوبونتو (آپدیت مخازن)',
      desc: 'جهت دانلود بسته‌ها و پکیج‌های apt از طریق لودبالانسر:',
      cmd: `echo 'Acquire::http::Proxy "socks5h://127.0.0.1:1080";' | sudo tee /etc/apt/apt.conf.d/12proxy
echo 'Acquire::https::Proxy "socks5h://127.0.0.1:1080";' | sudo tee -a /etc/apt/apt.conf.d/12proxy`,
    },
    {
      key: 'docker',
      title: 'تنظیم پروکسی برای داکر (Docker Daemon)',
      desc: 'برای Pull کردن ایمیج‌های تحریم‌شده Docker Hub در سرور اوبونتو:',
      cmd: `sudo mkdir -p /etc/systemd/system/docker.service.d
sudo cat << 'EOF' > /etc/systemd/system/docker.service.d/http-proxy.conf
[Service]
Environment="HTTP_PROXY=socks5h://127.0.0.1:1080"
Environment="HTTPS_PROXY=socks5h://127.0.0.1:1080"
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <span>راهنما و دستورات اتصال به پروکسی‌های ساکس۵ در اوبونتو</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          تمامی پورت‌ها بر روی <code className="text-emerald-300 font-mono">127.0.0.1</code> بایند شده‌اند و امنیت کامل دارند.
        </p>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <strong className="text-emerald-300 block">نکته مهم امنیتی:</strong>
          <span>
            پورت‌های ۱۰۸۰ تا ۱۰۸۸ هرگز بر روی IP عمومی یا اینترنت باز نیستند و فقط اسکریپت‌ها، بات‌ها، کرون‌جاب‌ها و سرویس‌های داخلی همین سرور اوبونتو اجازه اتصال به آنها را دارند.
          </span>
        </div>
      </div>

      {/* Commands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guides.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between space-y-3"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-100 mb-1">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{item.desc}</p>
            </div>

            <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3 group">
              <pre className="font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap dir-ltr text-left">
                {item.cmd}
              </pre>
              <button
                onClick={() => copyCode(item.key, item.cmd)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="کپی دستور"
              >
                {copiedKey === item.key ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
