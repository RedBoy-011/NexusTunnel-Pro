/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  Link,
  Activity,
  Terminal,
  Server,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  TrendingDown,
  ArrowRightLeft,
  BookOpen
} from 'lucide-react';
import { Header } from './components/Header.tsx';
import { PortMatrix } from './components/PortMatrix.tsx';
import { SubscriptionManager } from './components/SubscriptionManager.tsx';
import { ConfigsList } from './components/ConfigsList.tsx';
import { TerminalGuide } from './components/TerminalGuide.tsx';
import { NetworkTunneling } from './components/NetworkTunneling.tsx';
import { TunnelLogsViewer } from './components/TunnelLogsViewer.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { GitHubBook } from './components/GitHubBook.tsx';
import { Subscription, ProxyConfig, SystemStatus, AuthStatus } from './types.ts';

export default function App() {
  const [selectedModule, setSelectedModule] = useState<'subs_socks' | 'tunnel' | 'docs'>('subs_socks');
  const [activeTab, setActiveTab] = useState<'ports' | 'subs' | 'configs' | 'terminal' | 'tunnel' | 'logs' | 'github'>('ports');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [configs, setConfigs] = useState<ProxyConfig[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotify = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchAuthStatus = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('v2ray_panel_session') || '';
      const res = await fetch('/api/auth/status', {
        headers: sessionId ? { 'x-session-id': sessionId } : {},
      });
      if (res.ok) {
        setAuthStatus(await res.json());
      }
    } catch {
      // offline
    }
  }, []);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('v2ray_panel_session');
    if (sessionId) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      localStorage.removeItem('v2ray_panel_session');
    }
    showNotify('سشن شما خاتمه یافت.', 'info');
    await fetchAuthStatus();
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setIsTesting(data.isTesting);
      }
    } catch {
      // Offline or network error
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch {
      // Error handling
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/configs');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch {
      // Error handling
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchSubscriptions(), fetchConfigs()]);
  }, [fetchStatus, fetchSubscriptions, fetchConfigs]);

  useEffect(() => {
    refreshAll();
    fetchAuthStatus();

    // Check URL Magic Link Token or Direct Session (Zero-typing direct login)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    if (sessionParam) {
      localStorage.setItem('v2ray_panel_session', sessionParam);
      showNotify('✨ ورود مستقیم به پنل با موفقیت انجام شد.', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchAuthStatus();
    }

    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      (async () => {
        try {
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenParam.trim() }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.sessionId) {
            localStorage.setItem('v2ray_panel_session', data.sessionId);
            showNotify('✨ ورود موفقیت‌آمیز به پنل با لینک مستقیم جادویی انجام شد!', 'success');
            // Clean token from address bar for security
            window.history.replaceState({}, document.title, window.location.pathname);
            await fetchAuthStatus();
          } else {
            showNotify(data.error || 'این لینک ورود منقضی شده یا قبلاً استفاده شده است.', 'error');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch {
          // ignore
        }
      })();
    }

    const interval = setInterval(async () => {
      await fetchStatus();
      await fetchConfigs();
      await fetchAuthStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshAll, fetchStatus, fetchConfigs, fetchAuthStatus]);

  // Actions
  const handleTestNow = async () => {
    setIsTesting(true);
    showNotify('تست زنده اتصال TCP به تمامی سرورها آغاز شد...', 'info');
    try {
      const res = await fetch('/api/test-now', { method: 'POST' });
      if (res.ok) {
        await refreshAll();
        showNotify('تست پینگ به پایان رسید و ۸ کانفیگ برتر آپدیت شدند.', 'success');
      }
    } catch {
      showNotify('خطا در اجرای تست پینگ', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleIntervalChange = async (newInterval: number) => {
    try {
      const res = await fetch('/api/settings/interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: newInterval }),
      });
      if (res.ok) {
        await fetchStatus();
        showNotify(`دوره تست خودکار روی ${newInterval} ثانیه تنظیم شد.`, 'success');
      }
    } catch {
      showNotify('خطا در تغییر بازه زمانی', 'error');
    }
  };

  const handleAddSubscription = async (url: string, name?: string) => {
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ثبت سابسکرایب');
    }
    showNotify('اشتراک با موفقیت اضافه شد و کانفیگ‌ها وارد چرخه تست شدند.', 'success');
    await refreshAll();
  };

  const handleUpdateSubscription = async (id: string, updates: { name?: string; enabled?: boolean }) => {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await refreshAll();
      showNotify('تغییرات اشتراک با موفقیت اعمال شد.', 'success');
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('آیا از حذف این اشتراک اطمینان دارید؟')) return;
    const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshAll();
      showNotify('اشتراک حذف گردید.', 'info');
    }
  };

  const handleRefreshSubscription = async (id: string) => {
    showNotify('در حال دریافت محتوای تازه از آدرس اشتراک...', 'info');
    const res = await fetch(`/api/subscriptions/${id}/refresh`, { method: 'POST' });
    if (res.ok) {
      await refreshAll();
      showNotify('اطلاعات سابسکرایب بروزرسانی شد.', 'success');
    } else {
      showNotify('خطا در بروزرسانی از آدرس لینک', 'error');
    }
  };

  const top8 = configs.filter((c) => c.assignedPort && c.assignedPort >= 1081 && c.assignedPort <= 1088);
  const avgPing =
    top8.length > 0
      ? Math.round(top8.reduce((acc, c) => acc + (c.ping > 0 ? c.ping : 0), 0) / top8.length)
      : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold shadow-2xl animate-in slide-in-from-bottom-3">
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {notification.type === 'info' && <Zap className="w-4 h-4 text-cyan-400" />}
          <span className="text-white">{notification.message}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        status={status}
        authStatus={authStatus}
        onTestNow={handleTestNow}
        onIntervalChange={handleIntervalChange}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        isTesting={isTesting}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">اشتراک‌های فعال</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {status?.activeSubscriptions || 0}{' '}
                <span className="text-xs font-normal text-slate-400">از {status?.totalSubscriptions || 0}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-teal-400 flex items-center justify-center">
              <Link className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">کانفیگ‌های آنلاین سالم</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {status?.onlineConfigs || 0}{' '}
                <span className="text-xs font-normal text-slate-400">از {status?.totalConfigs || 0}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">پورت‌های فعال لودبالانس</div>
              <div className="text-lg font-bold text-cyan-400 mt-0.5">
                {top8.length} / 8 <span className="text-xs font-normal text-slate-400">گره</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">میانگین پینگ ۸ گره برتر</div>
              <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                {avgPing > 0 ? `${avgPing} ms` : '--'}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Two Independent Engines - Clear Architectural Separation */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-2 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Module 1: Subscriptions & Local SOCKS5 */}
              <button
                onClick={() => {
                  setSelectedModule('subs_socks');
                  if (activeTab === 'tunnel' || activeTab === 'logs' || activeTab === 'github') {
                    setActiveTab('ports');
                  }
                }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-right ${
                  selectedModule === 'subs_socks'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 flex items-center justify-center shrink-0">
                  <Network className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="leading-tight font-bold">بخش ۱: هسته سابسکرایب‌ها و ساکس داخلی</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">ایجاد ساکس۵ محلی روی 127.0.0.1 (وظیفه مستقل)</div>
                </div>
              </button>

              {/* Module 2: Reverse Multi-Tunnel */}
              <button
                onClick={() => {
                  setSelectedModule('tunnel');
                  setActiveTab('tunnel');
                }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-right relative ${
                  selectedModule === 'tunnel'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40 ring-1 ring-cyan-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <div className="leading-tight font-bold">بخش ۲: سامانه مستقل تانلینگ شبکه</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">فوروارد پورت‌های شبکه به سرورهای خارج (Multi-Tunnel)</div>
                </div>
                <span className="flex h-2 w-2 relative self-start mt-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </button>
            </div>

            {/* Docs & GitHub Guide */}
            <button
              onClick={() => {
                setSelectedModule('docs');
                setActiveTab('github');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                selectedModule === 'docs'
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>کتابچه راهنما و دستورات</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs Based on Active Module */}
        {selectedModule === 'subs_socks' && (
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ports'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>پورت‌های ساکس محلی (۱۰۸۰ تا ۱۰۸۸)</span>
            </button>

            <button
              onClick={() => setActiveTab('subs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'subs'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Link className="w-4 h-4" />
              <span>مدیریت سابسکرایب‌ها ({subscriptions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('configs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'configs'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>کانفیگ‌های استخراج‌شده و پینگ زنده ({configs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'terminal'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>دستورات تست ترمینال (curl socks5)</span>
            </button>
          </div>
        )}

        {selectedModule === 'tunnel' && (
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('tunnel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'tunnel'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <span>مدیریت تانل‌ها و نگاشت پورت‌ها (Multi-Tunnel)</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'logs'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>لاگ‌های زنده تانل و نگهبان Watchdog</span>
            </button>
          </div>
        )}

        {/* Tab Views */}
        <div>
          {activeTab === 'ports' && selectedModule === 'subs_socks' && (
            <PortMatrix status={status} configs={configs} top8={top8} />
          )}

          {activeTab === 'subs' && selectedModule === 'subs_socks' && (
            <SubscriptionManager
              subscriptions={subscriptions}
              onAdd={handleAddSubscription}
              onUpdate={handleUpdateSubscription}
              onDelete={handleDeleteSubscription}
              onRefresh={handleRefreshSubscription}
              isLoading={isTesting}
            />
          )}

          {activeTab === 'configs' && selectedModule === 'subs_socks' && (
            <ConfigsList configs={configs} isTesting={isTesting} />
          )}

          {activeTab === 'terminal' && selectedModule === 'subs_socks' && (
            <TerminalGuide />
          )}

          {activeTab === 'tunnel' && selectedModule === 'tunnel' && (
            <NetworkTunneling
              onNotify={showNotify}
              onOpenLoginModal={() => setShowLoginModal(true)}
            />
          )}

          {activeTab === 'logs' && selectedModule === 'tunnel' && (
            <TunnelLogsViewer onNotify={showNotify} />
          )}

          {selectedModule === 'docs' && (
            <GitHubBook onNotify={showNotify} />
          )}
        </div>
      </main>

      {/* OTP Token Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        authStatus={authStatus}
        onLoginSuccess={() => {
          showNotify('ورود موفقیت‌آمیز به سامانه با توکن موقت ثبت گردید.', 'success');
          fetchAuthStatus();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-4 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>دو بخش کاملاً مجزا و مستقل: ۱. هسته ایجاد ساکس محلی روی 127.0.0.1 • ۲. سامانه مستقل تانلینگ شبکه معکوس</span>
          </div>
          <div className="font-mono text-slate-400 text-[11px]">
            SOCKS: 127.0.0.1:1080 (1081-1088) | Multi-Tunnel Engine
          </div>
        </div>
      </footer>
    </div>
  );
}
