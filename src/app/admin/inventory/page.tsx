'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Package, Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, Loader2, Search, X, Save
} from 'lucide-react';

export default function InventoryPage() {
  const { locale } = useLanguage();
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Add item form state
  const [itemForm, setItemForm] = useState({
    sku: '', nameEn: '', nameAr: '', category: '',
    currentStock: 0, lowStockThreshold: 0, unit: 'pcs', costPerUnit: 0,
  });

  // Add movement form state
  const [movementForm, setMovementForm] = useState({
    itemId: '', type: 'IN', quantity: 0, reason: '', reference: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, movementsRes] = await Promise.allSettled([
        fetch('/api/inventory'),
        fetch('/api/inventory/movements'),
      ]);

      if (itemsRes.status === 'fulfilled' && itemsRes.value.ok) {
        const data = await itemsRes.value.json();
        setItems(Array.isArray(data) ? data : []);
      }
      if (movementsRes.status === 'fulfilled' && movementsRes.value.ok) {
        const data = await movementsRes.value.json();
        setMovements(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetItemForm = () => {
    setItemForm({ sku: '', nameEn: '', nameAr: '', category: '', currentStock: 0, lowStockThreshold: 0, unit: 'pcs', costPerUnit: 0 });
    setEditingItemId(null);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItemId(item._id);
    setItemForm({
      sku: item.sku || '',
      nameEn: item.name?.en || '',
      nameAr: item.name?.ar || '',
      category: item.category || '',
      currentStock: item.currentStock || 0,
      lowStockThreshold: item.lowStockThreshold || 0,
      unit: item.unit || 'pcs',
      costPerUnit: item.costPerUnit || 0,
    });
    setShowAddItem(true);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveItem = async () => {
    setSaving(true);
    try {
      const payload = {
        sku: itemForm.sku,
        name: { en: itemForm.nameEn, ar: itemForm.nameAr },
        category: itemForm.category,
        currentStock: itemForm.currentStock,
        lowStockThreshold: itemForm.lowStockThreshold,
        unit: itemForm.unit,
        costPerUnit: itemForm.costPerUnit,
        isActive: true,
      };
      const res = await fetch(editingItemId ? `/api/inventory/${editingItemId}` : '/api/inventory', {
        method: editingItemId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        if (editingItemId) {
          setItems(prev => prev.map(it => (it._id === editingItemId ? saved : it)));
        } else {
          setItems(prev => [saved, ...prev]);
        }
        setShowAddItem(false);
        resetItemForm();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save item');
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMovement = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementForm),
      });
      if (res.ok) {
        const created = await res.json();
        setMovements(prev => [created, ...prev]);
        setShowAddMovement(false);
        setMovementForm({ itemId: '', type: 'IN', quantity: 0, reason: '', reference: '' });
        // Reload items to get updated stock
        const itemsRes = await fetch('/api/inventory');
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setItems(Array.isArray(data) ? data : []);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to record movement');
      }
    } catch (error) {
      console.error('Failed to create movement:', error);
      alert('Failed to record movement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(item => item._id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.sku?.toLowerCase().includes(q) ||
      item.name?.en?.toLowerCase().includes(q) ||
      item.name?.ar?.includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  });

  const filteredMovements = movements.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.itemId?.sku?.toLowerCase().includes(q) ||
      m.itemId?.name?.en?.toLowerCase().includes(q) ||
      m.reference?.toLowerCase().includes(q) ||
      m.reason?.toLowerCase().includes(q)
    );
  });

  const lowStockCount = items.filter(i => i.currentStock < i.lowStockThreshold && i.isActive !== false).length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Low Stock Banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertTriangle className="text-red-400 shrink-0" size={20} />
          <p className="text-sm text-red-300">
            <strong>{lowStockCount}</strong> item{lowStockCount !== 1 ? 's' : ''} below minimum stock threshold
          </p>
        </div>
      )}

      {/* Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-0.5 bg-dark-900 border border-dark-800 rounded-lg">
          <button
            type="button"
            onClick={() => { setActiveTab('items'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'items' ? 'bg-kcc-green/20 text-kcc-green' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <Package size={15} />
            Items
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('movements'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'movements' ? 'bg-kcc-green/20 text-kcc-green' : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <ArrowUpCircle size={15} />
            Movements
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'items' && (
            <button
              type="button"
              onClick={() => { if (showAddItem) { setShowAddItem(false); resetItemForm(); } else { resetItemForm(); setShowAddItem(true); } }}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add Item
            </button>
          )}
          {activeTab === 'movements' && (
            <button
              type="button"
              onClick={() => setShowAddMovement(!showAddMovement)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add Movement
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'items' ? 'Search by SKU, name, or category...' : 'Search by SKU, name, reference, or reason...'}
          className="w-full ps-9 pe-3 py-2.5 text-sm bg-dark-900 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none"
        />
      </div>

      {/* Add Item Form */}
      {showAddItem && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-100">{editingItemId ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h3>
            <button type="button" onClick={() => { setShowAddItem(false); resetItemForm(); }} className="text-dark-400 hover:text-dark-50" title="Close">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">SKU</label>
              <input type="text" value={itemForm.sku} onChange={(e) => setItemForm(f => ({ ...f, sku: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="CUP-PP-003" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Name (EN)</label>
              <input type="text" value={itemForm.nameEn} onChange={(e) => setItemForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="Item name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Name (AR)</label>
              <input type="text" dir="rtl" value={itemForm.nameAr} onChange={(e) => setItemForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="اسم العنصر" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Category</label>
              <input type="text" value={itemForm.category} onChange={(e) => setItemForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="Paper Cups" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Initial Stock</label>
              <input type="number" value={itemForm.currentStock} onChange={(e) => setItemForm(f => ({ ...f, currentStock: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Low Stock Threshold</label>
              <input type="number" value={itemForm.lowStockThreshold} onChange={(e) => setItemForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="10" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Unit</label>
              <input type="text" value={itemForm.unit} onChange={(e) => setItemForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="pcs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Cost Per Unit ($)</label>
              <input type="number" step="0.01" value={itemForm.costPerUnit} onChange={(e) => setItemForm(f => ({ ...f, costPerUnit: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="0.00" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => { setShowAddItem(false); resetItemForm(); }} className="px-4 py-2 text-sm text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50">Cancel</button>
            <button type="button" onClick={handleSaveItem} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {editingItemId ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </div>
      )}

      {/* Add Movement Form */}
      {showAddMovement && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-100">Add Stock Movement</h3>
            <button type="button" onClick={() => setShowAddMovement(false)} className="text-dark-400 hover:text-dark-50" title="Close">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Item</label>
              <select value={movementForm.itemId} onChange={(e) => setMovementForm(f => ({ ...f, itemId: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" title="Select item">
                <option value="">Select item...</option>
                {items.map(item => (
                  <option key={item._id} value={item._id}>{item.sku} - {item.name?.en || item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Type</label>
              <select value={movementForm.type} onChange={(e) => setMovementForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" title="Movement type">
                <option value="IN">Stock In</option>
                <option value="OUT">Stock Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Quantity</label>
              <input type="number" value={movementForm.quantity} onChange={(e) => setMovementForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Reason</label>
              <input type="text" value={movementForm.reason} onChange={(e) => setMovementForm(f => ({ ...f, reason: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="Production batch / Order / Adjustment" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Reference</label>
              <input type="text" value={movementForm.reference} onChange={(e) => setMovementForm(f => ({ ...f, reference: e.target.value }))} className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none" placeholder="PO-2026-XXX" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowAddMovement(false)} className="px-4 py-2 text-sm text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50">Cancel</button>
            <button type="button" onClick={handleCreateMovement} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Record Movement
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : activeTab === 'items' ? (
          /* Items Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">SKU</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Category</th>
                  <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Stock</th>
                  <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Threshold</th>
                  <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Cost/Unit</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filteredItems.map((item) => {
                  const isLow = item.currentStock < item.lowStockThreshold && item.isActive !== false;
                  return (
                    <tr key={item._id} className={`hover:bg-dark-800/50 transition-colors ${isLow ? 'bg-red-500/5' : ''}`}>
                      <td className="px-5 py-3.5">
                        <code className="text-xs text-kcc-beige bg-kcc-beige/10 px-2 py-0.5 rounded">{item.sku}</code>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-dark-100">{item.name?.[locale] || item.name?.en || item.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">{item.category}</td>
                      <td className="px-5 py-3.5 text-end">
                        <span className={`text-sm font-bold ${isLow ? 'text-red-400' : 'text-dark-100'}`}>
                          {(item.currentStock || 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-dark-500 ms-1">{item.unit}</span>
                        {isLow && <AlertTriangle size={13} className="inline ms-1.5 text-red-400" />}
                      </td>
                      <td className="px-5 py-3.5 text-end text-sm text-dark-400">{(item.lowStockThreshold || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-end text-sm text-dark-300">${(item.costPerUnit || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          item.isActive !== false ? 'bg-green-500/10 text-green-400' : 'bg-dark-700 text-dark-400'
                        }`}>
                          {item.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => handleOpenEdit(item)} className="p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors" title="Edit">
                            <Edit2 size={15} />
                          </button>
                          <button type="button" onClick={() => handleDeleteItem(item._id)} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-dark-400">
                <Package size={28} className="mb-2" />
                <p className="text-sm">No items found</p>
              </div>
            )}
          </div>
        ) : (
          /* Movements Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Item</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-end text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Quantity</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Reason</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filteredMovements.map((m) => (
                  <tr key={m._id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-dark-400">{formatDate(m.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-dark-100">{m.itemId?.name?.en || m.itemId?.name || '-'}</p>
                      <p className="text-xs text-dark-500">{m.itemId?.sku || '-'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                        m.type === 'IN' ? 'bg-green-500/10 text-green-400' :
                        m.type === 'OUT' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {m.type === 'IN' && <ArrowDownCircle size={12} />}
                        {m.type === 'OUT' && <ArrowUpCircle size={12} />}
                        {m.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-end">
                      <span className={`text-sm font-medium ${
                        m.type === 'IN' ? 'text-green-400' : m.type === 'OUT' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {m.type === 'IN' ? '+' : m.type === 'OUT' ? '-' : ''}{Math.abs(m.quantity).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-dark-300 max-w-xs truncate">{m.reason}</td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs text-dark-400 bg-dark-800 px-2 py-0.5 rounded">{m.reference}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMovements.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-dark-400">
                <ArrowUpCircle size={28} className="mb-2" />
                <p className="text-sm">No movements found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
