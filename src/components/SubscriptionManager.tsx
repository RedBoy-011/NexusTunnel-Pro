import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Power,
  Link,
  FileText,
  AlertCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Subscription } from '../types.js';

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  onAdd: (url: string, name?: string) => Promise<void>;
  onUpdate: (id: string, updates: { name?: string; enabled?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  subscriptions,
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
  isLoading,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubUrl, setNewSubUrl] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setEditingName(sub.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (editingName.trim()) {
      await onUpdate(id, { name: editingName.trim() });
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleToggle = async (sub: Subscription) => {
    await onUpdate(sub.id, { enabled: !sub.enabled });
  };

  const handleManualRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await onRefresh(id);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubUrl.trim()) {
      setErrorMsg('لطفاً لینک سابسکرایب یا محتوای کانفیگ‌ها را وارد کنید.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onAdd(newSubUrl.trim(), newSubName.trim() || undefined);
      setNewSubUrl('');
      setNewSubName('');
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ثبت سابسکرایب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Link className="w-5 h-5 text-emerald-400" />
            <span>مدیریت لینک‌های اشتراک (Subscriptions)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            لینک‌های اشتراک را اضافه، فعال/غیرفعال، نام‌گذاری یا حذف کنید. کانفیگ‌های تمام اشتراک‌های فعال به صورت یکپارچه تجمیع و پینگ می‌شوند.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن اشتراک جدید</span>
        </button>
      </div>

      {/* Subscription Table/Cards */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {subscriptions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Link className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">هنوز هیچ اشتراکی اضافه نشده است</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              با دکمه بالا اولین لینک اشتراک خود را اضافه کنید تا کانفیگ‌ها به طور خودکار استخراج و پینگ واقعی شوند.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {subscriptions.map((sub) => {
              const isEditing = editingId === sub.id;
              const isRefreshing = refreshingId === sub.id;

              return (
                <div
                  key={sub.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    sub.enabled ? 'hover:bg-slate-800/30' : 'bg-slate-950/40 opacity-70'
                  }`}
                >
                  {/* Left: Info & Name */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2.5 py-1 text-xs bg-slate-950 border border-emerald-500/50 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="نام اشتراک"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(sub.id)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                            title="ذخیره نام"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                            title="انصراف"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">{sub.name}</span>
                          <button
                            onClick={() => handleStartEdit(sub)}
                            className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                            title="ویرایش نام اشتراک"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          sub.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {sub.enabled ? 'فعال در چرخه' : 'غیرفعال (مستثنی)'}
                      </span>
                    </div>

                    {/* URL preview */}
                    <div className="text-xs text-slate-400 font-mono truncate max-w-xl dir-ltr text-right" title={sub.url}>
                      {sub.url.startsWith('http') ? sub.url : 'متن محتوای دستی (Raw Configs)'}
                    </div>

                    {/* Stats pills */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>
                        تعداد کانفیگ‌ها: <strong className="text-slate-200">{sub.configsCount}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        کانفیگ‌های آنلاین: <strong className="text-emerald-400">{sub.activeCount}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        تاریخ ثبت: <span className="font-mono text-slate-400">{sub.createdAt}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {/* Toggle Active Switch */}
                    <button
                      onClick={() => handleToggle(sub)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        sub.enabled
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{sub.enabled ? 'فعال' : 'غیرفعال'}</span>
                    </button>

                    {/* Refresh URL button */}
                    {sub.url.startsWith('http') && (
                      <button
                        onClick={() => handleManualRefresh(sub.id)}
                        disabled={isRefreshing}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        title="بروزرسانی مجدد از لینک"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => onDelete(sub.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-colors"
                      title="حذف سابسکرایب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>افزودن اشتراک جدید V2ray / Xray</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  نام اشتراک (اختیاری):
                </label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="مثال: سرور اختصاصی آلمان یا اشتراک همراه اول"
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  در صورت خالی گذاشتن، نام به صورت خودکار بر اساس متادیتای سابسکرایب یا دامنه استخراج می‌شود.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  لینک اشتراک یا متن خام کانفیگ‌ها:
                </label>
                <textarea
                  rows={4}
                  value={newSubUrl}
                  onChange={(e) => setNewSubUrl(e.target.value)}
                  placeholder="https://example.com/sub/token&#10;یا لینک‌های vless://, vmess://, trojan://, ss://"
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors dir-ltr text-left"
                ></textarea>
                <p className="text-[11px] text-slate-400 mt-1">
                  پشتیبانی کامل از سابسکرایب‌های Base64، پروتکل‌های VLESS، VMess، Trojan و Shadowsocks.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال دریافت و تست...</span>
                    </>
                  ) : (
                    <span>افزودن و تست پینگ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
