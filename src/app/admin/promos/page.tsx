'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Tag, Plus, Edit2, Trash2, Loader2, Search,
  X, ToggleLeft, ToggleRight, Calendar, Percent, DollarSign
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PromosPage() {
  const { tx } = useLanguage();
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    minOrder: 0,
    maxDiscount: 0,
    usageLimit: 0,
    perUserLimit: 1,
    expiresAt: '',
    isActive: true,
  });

  const loadPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/promos');
      if (res.ok) {
        const data = await res.json();
        setPromos(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch promos:', res.statusText);
        setPromos([]);
      }
    } catch (error) {
      console.error('Failed to fetch promos:', error);
      setPromos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);

  const handleOpenCreate = () => {
    setEditingPromo(null);
    setFormData({
      code: '', type: 'percentage', value: 0, minOrder: 0,
      maxDiscount: 0, usageLimit: 0, perUserLimit: 1, expiresAt: '', isActive: true,
    });
    setShowForm(true);
  };

  const handleOpenEdit = (promo: any) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      type: promo.type,
      value: promo.value,
      minOrder: promo.minOrder,
      maxDiscount: promo.maxDiscount,
      usageLimit: promo.usageLimit,
      perUserLimit: promo.perUserLimit,
      expiresAt: promo.expiresAt ? new Date(promo.expiresAt).toISOString().split('T')[0] : '',
      isActive: promo.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: any = {
        code: formData.code,
        type: formData.type,
        value: formData.value,
        minOrder: formData.minOrder,
        maxDiscount: formData.maxDiscount,
        usageLimit: formData.usageLimit,
        perUserLimit: formData.perUserLimit,
        isActive: formData.isActive,
      };
      if (formData.expiresAt) {
        payload.expiresAt = new Date(formData.expiresAt).toISOString();
      } else {
        payload.expiresAt = null;
      }

      if (editingPromo) {
        const res = await fetch(`/api/promos/${editingPromo._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to update promo code');
          return;
        }
      } else {
        const res = await fetch('/api/promos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to create promo code');
          return;
        }
      }
      setShowForm(false);
      setEditingPromo(null);
      loadPromos();
    } catch (error) {
      console.error('Failed to save promo:', error);
      alert('Failed to save promo code');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const res = await fetch(`/api/promos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadPromos();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete promo code');
      }
    } catch (error) {
      console.error('Failed to delete promo:', error);
      alert('Failed to delete promo code');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/promos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        loadPromos();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to toggle promo status');
      }
    } catch (error) {
      console.error('Failed to toggle promo:', error);
    }
  };

  const filteredPromos = promos.filter(p => {
    if (!searchQuery) return true;
    return p.code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No expiry';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tx('Search promo codes...')}
            className="w-full ps-9 pe-3 py-2.5 text-sm bg-surface border border-line rounded-xl text-fg placeholder:text-fg-subtle focus:border-kcc-green focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors"
        >
          <Plus size={16} />{tx('Create Promo Code')}</button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-fg">
              {editingPromo ? `Edit: ${editingPromo.code}` : 'Create New Promo Code'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingPromo(null); }} className="text-fg-muted hover:text-fg" aria-label={tx('Close form')}>
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Promo Code')}</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none uppercase"
                placeholder="SUMMER25"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Type')}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'percentage' | 'fixed' }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
              >
                <option value="percentage">{tx('Percentage (%)')}</option>
                <option value="fixed">{tx('Fixed Amount ($)')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">Value ({formData.type === 'percentage' ? '%' : '$'})</label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Min Order ($)')}</label>
              <input
                type="number"
                value={formData.minOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, minOrder: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Max Discount ($)')}</label>
              <input
                type="number"
                value={formData.maxDiscount}
                onChange={(e) => setFormData(prev => ({ ...prev, maxDiscount: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Usage Limit (0 = unlimited)')}</label>
              <input
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Per User Limit')}</label>
              <input
                type="number"
                value={formData.perUserLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, perUserLimit: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Expires At')}</label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-line bg-bg text-kcc-green focus:ring-kcc-green"
                />
                <span className="text-sm text-fg-muted">{tx('Active')}</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={() => { setShowForm(false); setEditingPromo(null); }} className="px-4 py-2 text-sm text-fg-muted border border-line rounded-lg hover:text-fg">{tx('Cancel')}</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
              {editingPromo ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Promos Table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-fg-muted">
            <Tag size={32} className="mb-2" />
            <p>{tx('No promo codes found')}</p>
          </div>
        ) : (
          <div className="scroll-thin w-full min-w-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Code')}</th>
                  <th className="text-center text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Type')}</th>
                  <th className="text-end text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Value')}</th>
                  <th className="text-center text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Usage')}</th>
                  <th className="text-center text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Status')}</th>
                  <th className="text-start text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Expires')}</th>
                  <th className="text-center text-xs font-medium text-fg-subtle uppercase tracking-wider px-5 py-3">{tx('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPromos.map((promo) => {
                  const expired = isExpired(promo.expiresAt);
                  const usageFull = promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit;
                  return (
                    <tr key={promo._id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <code className="text-sm font-bold text-kcc-green bg-kcc-green/10 px-2.5 py-1 rounded">{promo.code}</code>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                          {promo.type === 'percentage' ? <Percent size={12} /> : <DollarSign size={12} />}
                          {promo.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-end text-sm font-medium text-fg">
                        {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-sm font-medium ${usageFull ? 'text-red-400' : 'text-fg'}`}>
                          {promo.usedCount}
                        </span>
                        <span className="text-xs text-fg-subtle">
                          /{promo.usageLimit || 'unlimited'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {expired ? (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-400">{tx('Expired')}</span>
                        ) : usageFull ? (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-400">{tx('Maxed Out')}</span>
                        ) : promo.isActive ? (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/10 text-green-400">{tx('Active')}</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-surface-3 text-fg-muted">{tx('Inactive')}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                          <Calendar size={13} className="text-fg-subtle shrink-0" />
                          {formatDate(promo.expiresAt)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(promo._id, promo.isActive)}
                            className={`p-1.5 rounded-lg transition-colors ${promo.isActive ? 'text-green-400 hover:bg-surface-2' : 'text-fg-subtle hover:bg-surface-2'}`}
                            title={promo.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {promo.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(promo)}
                            className="p-1.5 text-fg-muted hover:text-kcc-green hover:bg-surface-2 rounded-lg transition-colors"
                            title={tx('Edit')}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(promo._id)}
                            className="p-1.5 text-fg-muted hover:text-red-400 hover:bg-surface-2 rounded-lg transition-colors"
                            title={tx('Delete')}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
