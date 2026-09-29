import React, { useState } from 'react';
import {
  Network,
  Zap,
  Copy,
  Check,
  Shield,
  ArrowDownLeft,
  Activity,
  Layers,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { ProxyConfig, SystemStatus } from '../types.js';

interface PortMatrixProps {
  status: SystemStatus | null;
  configs: ProxyConfig[];
  top8: ProxyConfig[];
}

export const PortMatrix: React.FC<PortMatrixProps> = ({ status, configs, top8 }) => {
  const [copiedPort, setCopiedPort] = useState<number | null>(null);

  const copyCurl = (port: number) => {
    const cmd = `curl -x socks5h://127.0.0.1:${port} https://ipinfo.io`;
    navigator.clipboard.writeText(cmd);
    setCopiedPort(port);
    setTimeout(() => setCopiedPort(null), 2000);
  };

  const getPingColor = (ping: number) => {
    if (ping <= 0) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (ping < 120) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (ping < 250) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  };

  const getProtocolBadge = (proto: string) => {
    switch (proto.toLowerCase()) {
      case 'vless':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'vmess':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'trojan':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ss':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Load Balancer (Port 1080) */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-6 shadow-xl shadow-emerald-950/20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"></div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-sm flex items-center gap-1.5">
                <Network className="w-4 h-4 text-emerald-400" />
                127.0.0.1:1080
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                پروکسی اصلی (Master Load Balancer)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-3.5 h-3.5" />
                محدود به Localhost
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              لودبالانسر تجمیعی و توزیع خودکار ترافیک
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              این پورت به صورت بلادرنگ ترافیک خروجی را بین <strong className="text-emerald-300">۸ کانفیگ با کمترین پینگ</strong> (پورت‌های ۱۰۸۱ تا ۱۰۸۸) تقسیم می‌کند. چنانچه هر یک از کانفیگ‌ها دچار قطعی شود، بلافاصله از چرخه خارج و با سریع‌ترین سرور بعدی جایگزین می‌شود.
            </p>
          </div>

          {/* Quick Action & Status Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700/80 text-center sm:text-right">
              <div className="text-xs text-slate-400">کانفیگ‌های فعال متصل:</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {top8.length} / 8 <span className="text-xs text-slate-300 font-sans">گره سالم</span>
              </div>
            </div>

            <button
              onClick={() => copyCurl(1080)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all active:scale-95 group"
            >
              {copiedPort === 1080 ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">دستور curl کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>کپی دستور curl پورت ۱۰۸۰</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic distribution flow indicators */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <span>الگوریتم توزیع: <strong>Round-Robin خودکار بر اساس پایین‌ترین تاخیر واقعی TCP</strong></span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
            <span>تارگت تست سلامت: 1.1.1.1:443 / 8.8.8.8:443</span>
            <span>مدت تایم‌اوت: 2500ms</span>
          </div>
        </div>
      </div>

      {/* Grid of Top 8 Proxies (Ports 1081 to 1088) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-400" />
              <span>۸ پورت اختصاصی ساکس۵ محلی (1081 تا 1088)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              هر پورت مستقیماً به یکی از برترین کانفیگ‌ها متصل است؛ می‌توانید در نرم‌افزارهای مختلف هر پورت را جداگانه ست کنید.
            </p>
          </div>

          <div className="text-xs text-slate-400">
            مرتب‌سازی خودکار: <span className="text-emerald-400 font-bold">کمترین پینگ به بیشترین</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => {
            const port = 1081 + idx;
            const config = top8[idx];

            return (
              <div
                key={port}
                className={`relative rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                  config
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:shadow-lg'
                    : 'bg-slate-950/60 border-dashed border-slate-800 opacity-60'
                }`}
              >
                {/* Port Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        :{port}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        رتبه #{idx + 1}
                      </span>
                    </div>

                    {config ? (
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${getPingColor(
                          config.ping
                        )}`}
                      >
                        {config.ping > 0 ? `${config.ping} ms` : 'ناموفق'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">خالی</span>
                    )}
                  </div>

                  {/* Config Name & Details */}
                  {config ? (
                    <div className="space-y-2">
                      <div
                        className="font-medium text-sm text-slate-100 line-clamp-1"
                        title={config.name}
                      >
                        {config.name}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span
                          className={`uppercase font-mono font-semibold px-1.5 py-0.5 rounded border text-[10px] ${getProtocolBadge(
                            config.protocol
                          )}`}
                        >
                          {config.protocol}
                        </span>

                        <span className="text-slate-400 truncate max-w-[130px]" title={config.server}>
                          {config.server}:{config.port}
                        </span>
                      </div>

                      {/* Source Subscription */}
                      <div className="text-[11px] text-slate-400 truncate bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                        <span className="text-slate-400">از سابسکرایب:</span>{' '}
                        <span className="text-teal-300 font-medium">{config.subscriptionName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      در انتظار اضافه شدن کانفیگ سالم...
                    </div>
                  )}
                </div>

                {/* Card Footer / Copy Action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    127.0.0.1:{port}
                  </span>

                  <button
                    onClick={() => copyCurl(port)}
                    disabled={!config}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title={`کپی دستور تست curl پورت ${port}`}
                  >
                    {copiedPort === port ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
