import React, { useState, useEffect } from 'react';
import {
  Network,
  Shield,
  ShieldCheck,
  Key,
  Globe,
  Radio,
  Server,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Power,
  Lock,
  ArrowRightLeft,
  Activity,
  Terminal,
  FileCode,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Layers,
  HelpCircle,
  X,
  Sliders,
  Share2
} from 'lucide-react';
import {
  TunnelConfig,
  TunnelRule,
  TunnelInstance,
  MultiTunnelStrategy,
  CoreDependencyStatus
} from '../types.js';
import { TunnelLogsViewer } from './TunnelLogsViewer.tsx';

interface NetworkTunnelingProps {
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenLoginModal?: () => void;
}

export const NetworkTunneling: React.FC<NetworkTunnelingProps> = ({ onNotify, onOpenLoginModal }) => {
  const [tunnelConfig, setTunnelConfig] = useState<TunnelConfig | null>(null);
  const [tunnels, setTunnels] = useState<TunnelInstance[]>([]);
  const [selectedTunnelId, setSelectedTunnelId] = useState<string>('tunnel_1');
  const [strategy, setStrategy] = useState<MultiTunnelStrategy>('load-balance');
  const [dependencies, setDependencies] = useState<CoreDependencyStatus[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingIp, setIsDetectingIp] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddTunnelModal, setShowAddTunnelModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<TunnelRule | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'manager' | 'multi' | 'logs' | 'architecture' | 'debug'>('manager');

  // One-time Auth Form State
  const [remoteHost, setRemoteHost] = useState('');
  const [remotePort, setRemotePort] = useState('22');
  const [remoteUser, setRemoteUser] = useState('root');
  const [remotePassword, setRemotePassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // New Tunnel Form State (Multi-Tunnel)
  const [newTunnelName, setNewTunnelName] = useState('');
  const [newTunnelHost, setNewTunnelHost] = useState('');
  const [newTunnelPort, setNewTunnelPort] = useState('22');
  const [newTunnelUser, setNewTunnelUser] = useState('root');
  const [newTunnelIpv6, setNewTunnelIpv6] = useState('');
  const [newTunnelMode, setNewTunnelMode] = useState<'primary' | 'standby' | 'load-balance'>('load-balance');
  const [newTunnelPass, setNewTunnelPass] = useState('');
  const [isSubmittingTunnel, setIsSubmittingTunnel] = useState(false);

  // Add/Edit Rule Form State
  const [ruleProto, setRuleProto] = useState<'TCP' | 'UDP'>('TCP');
  const [ruleLocalPort, setRuleLocalPort] = useState('');
  const [ruleRemotePort, setRuleRemotePort] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleTunnelId, setRuleTunnelId] = useState('');
  const [ruleError, setRuleError] = useState('');

  // Script Viewers
  const [systemdCode, setSystemdCode] = useState('');
  const [bashScriptCode, setBashScriptCode] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchTunnelData = async () => {
    try {
      const [resConfig, resTunnels] = await Promise.all([
        fetch('/api/tunnel/config'),
        fetch('/api/tunnels'),
      ]);

      if (resConfig.ok) {
        const data: TunnelConfig = await resConfig.json();
        setTunnelConfig(data);
        if (data.activeTunnelId && !selectedTunnelId) {
          setSelectedTunnelId(data.activeTunnelId);
        }
      }

      if (resTunnels.ok) {
        const data = await resTunnels.json();
        if (data.tunnels) {
          setTunnels(data.tunnels);
          if (!selectedTunnelId && data.tunnels.length > 0) {
            setSelectedTunnelId(data.tunnels[0].id);
          }
        }
        if (data.multiTunnelStrategy) setStrategy(data.multiTunnelStrategy);
        if (data.coreDependencies) setDependencies(data.coreDependencies);
      }
    } catch {
      // offline
    }
  };

  const fetchScripts = async () => {
    try {
      const [resSys, resBash] = await Promise.all([
        fetch('/api/tunnel/systemd'),
        fetch('/api/tunnel/manager-script'),
      ]);
      if (resSys.ok) setSystemdCode(await resSys.text());
      if (resBash.ok) setBashScriptCode(await resBash.text());
    } catch {
      // error loading scripts
    }
  };

  useEffect(() => {
    fetchTunnelData();
    fetchScripts();
    const interval = setInterval(fetchTunnelData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentTunnel = tunnels.find((t) => t.id === selectedTunnelId) || tunnels[0] || null;

  // Change active tunnel
  const handleSelectTunnel = async (id: string) => {
    setSelectedTunnelId(id);
    try {
      await fetch(`/api/tunnels/${id}/activate`, { method: 'POST' });
      await fetchTunnelData();
    } catch {
      // ignore
    }
  };

  // Change strategy
  const handleStrategyChange = async (newStrategy: MultiTunnelStrategy) => {
    setStrategy(newStrategy);
    try {
      await fetch('/api/tunnels/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: newStrategy }),
      });
      onNotify(
        newStrategy === 'load-balance'
          ? 'استراتژی توزیع بار (Load-Balancing) روی تانل‌های فعال شد.'
          : 'استراتژی سوئیچ اضطراری خودکار (Failover) بر روی تانل‌ها فعال شد.',
        'success'
      );
      await fetchTunnelData();
    } catch {
      onNotify('خطا در تغییر استراتژی تانلینگ', 'error');
    }
  };

  // Create new tunnel
  const handleCreateTunnelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTunnelHost.trim()) {
      onNotify('آدرس سرور ریموت الزامی است.', 'error');
      return;
    }
    setIsSubmittingTunnel(true);

    try {
      const res = await fetch('/api/tunnels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTunnelName.trim() || undefined,
          remoteHost: newTunnelHost.trim(),
          remotePort: Number(newTunnelPort) || 22,
          remoteUser: newTunnelUser.trim() || 'root',
          remoteIpv6: newTunnelIpv6.trim() || undefined,
          mode: newTunnelMode,
          password: newTunnelPass || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ایجاد تانل');
      }

      const created: TunnelInstance = await res.json();
      setShowAddTunnelModal(false);
      setNewTunnelName('');
      setNewTunnelHost('');
      setNewTunnelPass('');
      setNewTunnelIpv6('');
      setSelectedTunnelId(created.id);
      onNotify(`✨ ${created.name} با موفقیت ایجاد و فعال شد!`, 'success');
      await fetchTunnelData();
    } catch (err: any) {
      onNotify(err.message || 'خطا در ایجاد تانل', 'error');
    } finally {
      setIsSubmittingTunnel(false);
    }
  };

  // Delete tunnel
  const handleDeleteTunnel = async (id: string, name: string) => {
    if (!confirm(`آیا از حذف «${name}» اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/tunnels/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در حذف تانل');
      }
      onNotify(`تانل «${name}» با موفقیت حذف گردید.`, 'info');
      await fetchTunnelData();
    } catch (err: any) {
      onNotify(err.message || 'خطا در حذف تانل', 'error');
    }
  };

  // Auth Flow (One-time connection setup)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteHost.trim() || !remoteUser.trim()) {
      setAuthError('آدرس سرور ریموت و نام کاربری الزامی است.');
      return;
    }
    setAuthError('');
    setIsAuthSubmitting(true);

    try {
      const res = await fetch('/api/tunnel/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tunnelId: selectedTunnelId,
          remoteHost: remoteHost.trim(),
          remotePort: Number(remotePort) || 22,
          remoteUser: remoteUser.trim(),
          password: remotePassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در احراز هویت سرور ریموت');
      }

      setRemotePassword('');
      setShowAuthModal(false);
      onNotify('احراز هویت بدون رمز با موفقیت برقرار شد. کلید SSH مستقر گردید.', 'success');
      await fetchTunnelData();
      await fetchScripts();
    } catch (err: any) {
      setAuthError(err.message || 'خطا در برقراری ارتباط');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // IP Detection
  const handleDetectIp = async () => {
    setIsDetectingIp(true);
    try {
      const res = await fetch('/api/tunnel/detect-ip', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onNotify(`آی‌پی عمومی سرور محلی شناسایی شد: ${data.ip}`, 'info');
        await fetchTunnelData();
      }
    } catch {
      onNotify('خطا در تشخیص آی‌پی عمومی', 'error');
    } finally {
      setIsDetectingIp(false);
    }
  };

  // Reconnect
  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await fetch(`/api/tunnels/${selectedTunnelId}/reconnect`, { method: 'POST' });
      onNotify('فرآیند اتصال مجدد و سینک تانل با کلید امن آغاز شد...', 'info');
      await fetchTunnelData();
    } finally {
      setIsReconnecting(false);
    }
  };

  // Auto-recovery toggle
  const handleToggleAutoRecovery = async () => {
    if (!tunnelConfig) return;
    const newVal = !tunnelConfig.autoRecovery;
    try {
      await fetch('/api/tunnel/toggle-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRecovery: newVal }),
      });
      onNotify(`مکانیزم ریکاوری خودکار (Watchdog) ${newVal ? 'فعال' : 'غیرفعال'} شد.`, 'success');
      await fetchTunnelData();
    } catch {
      onNotify('خطا در تغییر وضعیت ریکاوری خودکار', 'error');
    }
  };

  // Add or Edit Rule
  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleLocalPort || !ruleRemotePort) {
      setRuleError('پورت محلی و ریموت الزامی هستند.');
      return;
    }
    setRuleError('');

    try {
      if (editingRule) {
        const res = await fetch(`/api/tunnel/rules/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocol: ruleProto,
            localPort: Number(ruleLocalPort),
            remotePort: Number(ruleRemotePort),
            description: ruleDesc.trim(),
          }),
        });
        if (!res.ok) throw new Error('خطا در بروزرسانی قانون تانل');
        onNotify('قانون تانل بروزرسانی و همگام‌سازی شد.', 'success');
      } else {
        const targetTId = ruleTunnelId || selectedTunnelId;
        const res = await fetch('/api/tunnel/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocol: ruleProto,
            localPort: Number(ruleLocalPort),
            remotePort: Number(ruleRemotePort),
            description: ruleDesc.trim(),
            tunnelId: targetTId,
          }),
        });
        if (!res.ok) throw new Error('خطا در ثبت قانون تانل');
        onNotify('پورت جدید به چرخه تانل معکوس اضافه شد.', 'success');
      }

      setShowAddRuleModal(false);
      setEditingRule(null);
      setRuleLocalPort('');
      setRuleRemotePort('');
      setRuleDesc('');
      await fetchTunnelData();
      await fetchScripts();
    } catch (err: any) {
      setRuleError(err.message || 'خطا در ثبت اطلاعات');
    }
  };

  const handleEditClick = (rule: TunnelRule) => {
    setEditingRule(rule);
    setRuleProto(rule.protocol);
    setRuleLocalPort(rule.localPort.toString());
    setRuleRemotePort(rule.remotePort.toString());
    setRuleDesc(rule.description);
    setRuleTunnelId(rule.tunnelId || selectedTunnelId);
    setShowAddRuleModal(true);
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('آیا از حذف این پورت از تونل اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/tunnel/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onNotify('قانون تانل حذف و تنظیمات ریموت سینک شد.', 'info');
        await fetchTunnelData();
        await fetchScripts();
      }
    } catch {
      onNotify('خطا در حذف قانون', 'error');
    }
  };

  const handleToggleRule = async (rule: TunnelRule) => {
    try {
      await fetch(`/api/tunnel/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      await fetchTunnelData();
      await fetchScripts();
    } catch {
      onNotify('خطا در تغییر وضعیت پورت', 'error');
    }
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // Collect all rules or rules for current tunnel
  const displayedRules = currentTunnel ? currentTunnel.rules : (tunnelConfig?.rules || []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
              <span>سامانه تانلینگ چندگانه شبکه (Multi-Tunnel Manager)</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {tunnels.length} تانل همزمان
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            امکان ایجاد ۲، ۳ یا چندین تانل همزمان به سرورهای مختلف، لودبالانسینگ ترافیک، سوئیچ اضطراری (Failover) و پشته دوگانه IPv4/IPv6.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddTunnelModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد تانل جدید (+ تانل ۲ یا ۳)</span>
          </button>

          <button
            onClick={() => {
              setEditingRule(null);
              setRuleLocalPort('');
              setRuleRemotePort('');
              setRuleDesc('');
              setRuleTunnelId(selectedTunnelId);
              setShowAddRuleModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>افزودن پورت</span>
          </button>
        </div>
      </div>

      {/* Auto-Dependencies Clean Bar */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white">سرویس‌های خودکار هسته اوبونتو (Zero-Config Auto Core):</span>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">✓ autossh</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">✓ socat (UDP/TCP)</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">✓ xray-core</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">✓ systemd-daemon</span>
          </div>
        </div>

        <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>تمام نیازمندی‌ها خودکار در هسته نصب و فعال هستند (بدون نیاز به تنظیم دستی در پنل)</span>
        </div>
      </div>

      {/* Multi-Tunnel Selector Header & Strategy Controls */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>انتخاب و مدیریت تانل‌های فعال (Multi-Tunnel Selector):</span>
            </div>
            <div className="text-[11px] text-slate-400">
              می‌توانید بین تانل ۱، ۲، ۳ سوئیچ کنید، وضعیت پینگ زنده را ببینید یا پورت‌ها را توزیع کنید.
            </div>
          </div>

          {/* Strategy Toggle */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 px-2 font-medium flex items-center gap-1">
              <Sliders className="w-3 h-3 text-cyan-400" />
              استراتژی تانلینگ:
            </span>
            <button
              onClick={() => handleStrategyChange('load-balance')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                strategy === 'load-balance'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              توزیع بار پورت‌ها (Load-Balance)
            </button>
            <button
              onClick={() => handleStrategyChange('failover')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                strategy === 'failover'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              سوئیچ خودکار در قطعی (Failover)
            </button>
          </div>
        </div>

        {/* Tunnels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tunnels.map((t, idx) => {
            const isSelected = t.id === selectedTunnelId;
            return (
              <div
                key={t.id}
                onClick={() => handleSelectTunnel(t.id)}
                className={`relative p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-white truncate">{t.name}</span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      t.status === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    <span>{t.status === 'connected' ? 'متصل' : 'قطع'}</span>
                  </span>
                </div>

                <div className="text-[11px] font-mono text-cyan-300 dir-ltr text-right truncate">
                  {t.remoteUser}@{t.remoteHost}:{t.remotePort}
                </div>

                {t.remoteIpv6 && (
                  <div className="text-[10px] font-mono text-purple-300 dir-ltr text-right truncate mt-0.5">
                    IPv6: {t.remoteIpv6}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1 font-mono">
                    تاخیر: <strong className="text-emerald-400">{t.latencyMs}ms</strong>
                  </span>
                  <span>{t.rules.length} پورت نگاشت‌شده</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTunnel(t.id, t.name);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="حذف این تانل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add New Tunnel Card Trigger */}
          <div
            onClick={() => setShowAddTunnelModal(true)}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 hover:bg-slate-900/60 hover:border-emerald-500/50 cursor-pointer transition-all text-center space-y-1.5 min-h-[110px]"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200">افزودن تانل جدید (+ تانل ۲ یا ۳)</div>
            <div className="text-[10px] text-slate-400">اتصال همزمان به چندین سرور خارج</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs: Dashboard vs Logs vs Architecture Guide */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('manager')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'manager'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>پنل تعاملی تانل فعال ({currentTunnel?.name || 'تانل'})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'logs'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>لاگ‌های زنده، پایش حافظه و تست ری‌استارت</span>
        </button>

        <button
          onClick={() => setActiveSubTab('architecture')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'architecture'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>کد ادغام در اسکریپت‌های شما (debug-tunnel.sh)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('debug')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'debug'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>پروتکل کپسوله‌سازی UDP over TCP (socat)</span>
        </button>
      </div>

      {activeSubTab === 'manager' && (
        <>
          {/* Main Status & Connection Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-slate-800/80">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      currentTunnel?.status === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      {currentTunnel?.status === 'connected' && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          currentTunnel?.status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      ></span>
                    </span>
                    <span>
                      {currentTunnel?.status === 'connected'
                        ? `${currentTunnel.name} - فعال و پایدار`
                        : 'قطع شده'}
                    </span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono">
                    تاخیر: {currentTunnel?.latencyMs} ms
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs">
                    مدت پایداری: <span className="font-mono">{currentTunnel ? formatUptime(currentTunnel.uptimeSeconds) : '--'}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-xs">
                    حالت: {currentTunnel?.mode === 'primary' ? 'سرور اصلی (Primary)' : currentTunnel?.mode === 'standby' ? 'پشتیبان (Standby)' : 'لودبالانسر (Load-Balance)'}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-200">
                  اتصال امن تونل معکوس: سرور محلی <span className="font-mono text-emerald-400">{tunnelConfig?.currentLocalIp}</span> ⟷ سرور مقصد <span className="font-mono text-cyan-400">{currentTunnel?.remoteHost}:{currentTunnel?.remotePort}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleDetectIp}
                  disabled={isDetectingIp}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  title="استعلام مجدد آی‌پی عمومی این سرور"
                >
                  <Globe className={`w-3.5 h-3.5 ${isDetectingIp ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                  <span>بررسی IP عمومی سرور</span>
                </button>

                <button
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                  <span>ریستارت این تانل</span>
                </button>

                <button
                  onClick={handleToggleAutoRecovery}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    tunnelConfig?.autoRecovery
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="اگر IP سرور محلی تغییر کند یا تونل قطع شود، خودکار ری‌کانکت می‌کند"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ریکاوری خودکار (Watchdog): {tunnelConfig?.autoRecovery ? 'روشن' : 'خاموش'}</span>
                </button>
              </div>
            </div>

            {/* IP & Authentication Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>آی‌پی عمومی سرور محلی (Local Server IP):</span>
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {tunnelConfig?.currentLocalIp || 'در حال بررسی...'}
                </div>
                <div className="text-[11px] text-slate-400">
                  IPv6 محلی: <span className="font-mono text-purple-300">{tunnelConfig?.currentLocalIpv6 || 'ندارد'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>سرور ریموت مقصد (Remote Gateway):</span>
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-sm font-mono font-bold text-cyan-300">
                  {currentTunnel?.remoteUser}@{currentTunnel?.remoteHost}:{currentTunnel?.remotePort}
                </div>
                {currentTunnel?.remoteIpv6 && (
                  <div className="text-[11px] font-mono text-purple-300 truncate">
                    IPv6: {currentTunnel.remoteIpv6}
                  </div>
                )}
                <div className="text-[11px] text-slate-400">
                  آخرین همگام‌سازی: {currentTunnel?.lastSyncTime || '--'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>احراز هویت بدون پسورد (SSH Key Auth):</span>
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>کلید اختصاصی ED25519 فعال است</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate dir-ltr text-right" title={currentTunnel?.publicKeySnippet}>
                  {currentTunnel?.publicKeySnippet}
                </div>
              </div>
            </div>
          </div>

          {/* Port Rules Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>پورت‌های نگاشت‌شده در «{currentTunnel?.name}» (Port Forwardings)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  هر درخواست ورودی به پورت ریموت این سرور خارج، مستقیماً از طریق این تانل به پورت محلی هدایت می‌شود.
                </p>
              </div>

              <span className="text-xs text-slate-400">
                تعداد پورت‌های فعال این تانل: <strong className="text-emerald-400 font-mono">{displayedRules.filter((r) => r.enabled).length}</strong> از{' '}
                <span className="font-mono">{displayedRules.length}</span>
              </span>
            </div>

            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-center w-12">پروتکل</th>
                      <th className="py-3 px-4 text-center">پورت محلی (Local)</th>
                      <th className="py-3 px-4 text-center">پورت ریموت (Remote)</th>
                      <th className="py-3 px-4">توضیحات و کاربرد</th>
                      <th className="py-3 px-4 text-center">پشته شبکه</th>
                      <th className="py-3 px-4 text-center w-24">فعال / غیرفعال</th>
                      <th className="py-3 px-4 text-center w-20">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayedRules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          هنوز هیچ پورتی به این تانل اضافه نشده است. با دکمه «افزودن پورت» پورت‌های دلخواه را اضافه نمایید.
                        </td>
                      </tr>
                    ) : (
                      displayedRules.map((rule) => (
                        <tr
                          key={rule.id}
                          className={`transition-colors ${rule.enabled ? 'hover:bg-slate-800/40' : 'bg-slate-950/40 opacity-60'}`}
                        >
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`uppercase font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${
                                rule.protocol === 'TCP'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              }`}
                            >
                              {rule.protocol}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-bold text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                              127.0.0.1:{rule.localPort}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                              0.0.0.0:{rule.remotePort}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{rule.description}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              همگام‌سازی: {rule.lastSyncAt || '--'}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {rule.ipFamily || 'DualStack'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleRule(rule)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                rule.enabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                              }`}
                              title={rule.enabled ? 'غیرفعال کردن' : 'فعال کردن'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditClick(rule)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                                title="ویرایش قانون"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                                title="حذف قانون"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'logs' && <TunnelLogsViewer onNotify={onNotify} />}

      {activeSubTab === 'architecture' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>اسکریپت کامل مدیریت و مانیتورینگ خط فرمان (tunnel-manager.sh)</span>
            </h3>
            <button
              onClick={() => handleCopy('bash', bashScriptCode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium"
            >
              {copiedKey === 'bash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'bash' ? 'کپی شد!' : 'کپی اسکریپت'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto max-h-[450px] dir-ltr text-left">
            {bashScriptCode || 'در حال بارگذاری...'}
          </pre>
        </div>
      )}

      {activeSubTab === 'debug' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>راهنمای فنی کپسوله‌سازی ترافیک UDP over TCP و رله DNS</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            از آنجا که پروتکل تانل معکوس SSH به طور استاندارد ترافیک TCP را منتقل می‌کند، برای پورت‌های نیازمند UDP (مانند DNS پورت ۵۳ یا بسته‌های بازی و Voice)، ابزار سبک <code className="text-emerald-300 font-mono">socat</code> در هر دو سمت اجرا می‌شود. ترافیک UDP به جریان TCP تبدیل شده، از تانل رد می‌شود و در مقصد مجدداً به صورت UDP تحویل داده می‌شود.
          </p>
        </div>
      )}

      {/* Modal: Add New Tunnel (Multi-Tunnel) */}
      {showAddTunnelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">ایجاد تانل جدید (تانل ۲، تانل ۳ یا بیشتر)</h3>
              </div>
              <button onClick={() => setShowAddTunnelModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTunnelSubmit} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">نام دلخواه تانل:</label>
                <input
                  type="text"
                  value={newTunnelName}
                  onChange={(e) => setNewTunnelName(e.target.value)}
                  placeholder="مثال: تانل فنلاند (هلسینکی) یا تانل هلند"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">آدرس سرور ریموت (IPv4): *</label>
                  <input
                    type="text"
                    required
                    value={newTunnelHost}
                    onChange={(e) => setNewTunnelHost(e.target.value)}
                    placeholder="95.217.163.44"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">پورت SSH:</label>
                  <input
                    type="number"
                    value={newTunnelPort}
                    onChange={(e) => setNewTunnelPort(e.target.value)}
                    placeholder="22"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">آدرس IPv6 سرور ریموت (اختیاری):</label>
                <input
                  type="text"
                  value={newTunnelIpv6}
                  onChange={(e) => setNewTunnelIpv6(e.target.value)}
                  placeholder="2a01:4f9:c010:789::2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-purple-300 font-mono text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">کاربر SSH:</label>
                  <input
                    type="text"
                    value={newTunnelUser}
                    onChange={(e) => setNewTunnelUser(e.target.value)}
                    placeholder="root"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">نقش در تانلینگ:</label>
                  <select
                    value={newTunnelMode}
                    onChange={(e: any) => setNewTunnelMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  >
                    <option value="load-balance">لودبالانس (Load-Balance)</option>
                    <option value="standby">پشتیبان اضطراری (Standby)</option>
                    <option value="primary">اصلی (Primary)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  رمز عبور روت (فقط یک‌بار جهت نصب خودکار کلید SSH):
                </label>
                <input
                  type="password"
                  value={newTunnelPass}
                  onChange={(e) => setNewTunnelPass(e.target.value)}
                  placeholder="پسورد روت سرور خارج (ذخیره نمی‌شود)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  پسورد تنها یک بار جهت تزریق کلید امن اختصاصی ED25519 استفاده شده و ذخیره نخواهد شد.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTunnelModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTunnel}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                >
                  {isSubmittingTunnel ? 'در حال ایجاد و استقرار کلید...' : 'ایجاد و استقرار تانل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Rule */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  {editingRule ? 'ویرایش قانون پورت' : 'افزودن پورت به تانل معکوس'}
                </h3>
              </div>
              <button onClick={() => setShowAddRuleModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRuleSubmit} className="p-4 space-y-3.5 text-xs">
              {ruleError && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  {ruleError}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">تانل مقصد:</label>
                <select
                  value={ruleTunnelId || selectedTunnelId}
                  onChange={(e) => setRuleTunnelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                >
                  {tunnels.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.remoteHost})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">پروتکل:</label>
                  <select
                    value={ruleProto}
                    onChange={(e: any) => setRuleProto(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  >
                    <option value="TCP">TCP (پروکسی، ساکس، وب)</option>
                    <option value="UDP">UDP (کپسوله‌سازی با socat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">پورت محلی (Local): *</label>
                  <input
                    type="number"
                    required
                    value={ruleLocalPort}
                    onChange={(e) => setRuleLocalPort(e.target.value)}
                    placeholder="1080"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">پورت ریموت (Remote Port روی سرور خارج): *</label>
                <input
                  type="number"
                  required
                  value={ruleRemotePort}
                  onChange={(e) => setRuleRemotePort(e.target.value)}
                  placeholder="1080"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">توضیحات و کاربرد:</label>
                <input
                  type="text"
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  placeholder="مثال: لودبالانسر مستر ساکس۵ یا پنل وب"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                >
                  {editingRule ? 'ذخیره تغییرات' : 'افزودن پورت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
