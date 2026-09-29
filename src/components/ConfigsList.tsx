import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Server,
  Radio,
  Tag
} from 'lucide-react';
import { ProxyConfig } from '../types.js';

interface ConfigsListProps {
  configs: ProxyConfig[];
  isTesting: boolean;
}

export const ConfigsList: React.FC<ConfigsListProps> = ({ configs, isTesting }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyConfigUrl = (id: string, rawUrl: string) => {
    navigator.clipboard.writeText(rawUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredConfigs = useMemo(() => {
    return configs.filter((cfg) => {
      const matchesSearch =
        cfg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cfg.subscriptionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cfg.server.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cfg.assignedPort?.toString().includes(searchTerm);

      const matchesProtocol =
        protocolFilter === 'all' || cfg.protocol.toLowerCase() === protocolFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'online' && cfg.ping > 0 && cfg.status === 'online') ||
        (statusFilter === 'offline' && (cfg.ping <= 0 || cfg.status !== 'online')) ||
        (statusFilter === 'assigned' && cfg.assignedPort !== undefined);

      return matchesSearch && matchesProtocol && matchesStatus;
    });
  }, [configs, searchTerm, protocolFilter, statusFilter]);

  const getPingColor = (ping: number) => {
    if (ping <= 0) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (ping < 100) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (ping < 200) return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
    if (ping < 350) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
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
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>مانیتورینگ زنده تمام کانفیگ‌ها و وضعیت اتصال</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            کانفیگ‌ها مرتب‌شده بر اساس پینگ واقعی هستند؛ ۸ کانفیگ اول به پورت‌های ۱۰۸۱ تا ۱۰۸۸ و پورت لودبالانسر ۱۰۸۰ اختصاص یافته‌اند.
          </p>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            کل کانفیگ‌ها: <strong className="text-white font-mono">{configs.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            سالم و آنلاین: <strong className="text-emerald-400 font-mono">{configs.filter(c => c.ping > 0).length}</strong>
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در نام، سابسکرایب، هاست یا پورت..."
            className="w-full pl-3 pr-10 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Protocol Filter */}
        <div>
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">همه پروتکل‌ها</option>
            <option value="vless">VLESS</option>
            <option value="vmess">VMess</option>
            <option value="trojan">Trojan</option>
            <option value="ss">Shadowsocks</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">تمام وضعیت‌ها</option>
            <option value="assigned">⚡ متصل به پورت‌های ۱۰۸۱-۱۰۸۸</option>
            <option value="online">آنلاین و سالم</option>
            <option value="offline">ناموفق / تایم‌اوت</option>
          </select>
        </div>
      </div>

      {/* Table of Configs */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4 text-center w-14">رتبه</th>
                <th className="py-3.5 px-4">نام کانفیگ</th>
                <th className="py-3.5 px-4">اشتراک مبدا</th>
                <th className="py-3.5 px-4 text-center">پروتکل</th>
                <th className="py-3.5 px-4">سرور مقصد</th>
                <th className="py-3.5 px-4 text-center">پینگ اتصال واقعی</th>
                <th className="py-3.5 px-4 text-center">پورت محلی</th>
                <th className="py-3.5 px-4 text-center w-16">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    هیچ کانفیگی مطابق فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((cfg, idx) => {
                  const isTop8 = cfg.assignedPort !== undefined;

                  return (
                    <tr
                      key={cfg.id}
                      className={`transition-colors ${
                        isTop8
                          ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {isTop8 ? (
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="text-slate-400">#{idx + 1}</span>
                        )}
                      </td>

                      {/* Config Name */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-100 max-w-xs truncate" title={cfg.name}>
                          {cfg.name}
                        </div>
                      </td>

                      {/* Subscription Origin */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-medium text-[11px] truncate max-w-[160px]">
                          <Tag className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="truncate">{cfg.subscriptionName}</span>
                        </span>
                      </td>

                      {/* Protocol */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`uppercase font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${getProtocolBadge(
                            cfg.protocol
                          )}`}
                        >
                          {cfg.protocol}
                        </span>
                      </td>

                      {/* Server Host & Port */}
                      <td className="py-3 px-4 font-mono text-slate-300 text-[11px] dir-ltr text-right">
                        {cfg.server}:{cfg.port}
                      </td>

                      {/* True Ping */}
                      <td className="py-3 px-4 text-center">
                        {isTesting && cfg.status === 'testing' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
                            <span className="animate-spin">⟳</span> تست...
                          </span>
                        ) : cfg.ping > 0 ? (
                          <span
                            className={`font-mono font-bold px-2.5 py-0.5 rounded-full border text-[11px] inline-flex items-center gap-1 ${getPingColor(
                              cfg.ping
                            )}`}
                          >
                            <span>{cfg.ping}</span>
                            <span className="text-[9px] font-sans">ms</span>
                          </span>
                        ) : (
                          <span className="font-mono text-rose-400 text-[11px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            Timeout
                          </span>
                        )}
                      </td>

                      {/* Assigned Port */}
                      <td className="py-3 px-4 text-center">
                        {isTop8 ? (
                          <span className="font-mono font-bold text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-sm shadow-emerald-500/20">
                            <span>127.0.0.1:{cfg.assignedPort}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">رزرو / بدون پورت</span>
                        )}
                      </td>

                      {/* Copy Raw URL Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => copyConfigUrl(cfg.id, cfg.rawUrl)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="کپی لینک کانفیگ"
                        >
                          {copiedId === cfg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
