'use client';

import { useEffect, useState } from 'react';
import {
  Save, Globe, FileText, Image, Edit2, Search,
  Loader2, CheckCircle, AlertCircle, ExternalLink
} from 'lucide-react';

export default function SeoPage() {
  const [globalSeo, setGlobalSeo] = useState({
    titleTemplate: { en: '', ar: '' },
    defaultDescription: { en: '', ar: '' },
    defaultOgImage: '',
    twitterCard: 'summary_large_image',
    canonicalBase: '',
  });
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [globalRes, pagesRes] = await Promise.allSettled([
        fetch('/api/seo'),
        fetch('/api/seo/pages'),
      ]);

      if (globalRes.status === 'fulfilled' && globalRes.value.ok) {
        const data = await globalRes.value.json();
        setGlobalSeo({
          titleTemplate: data.titleTemplate || { en: '', ar: '' },
          defaultDescription: data.defaultDescription || { en: '', ar: '' },
          defaultOgImage: data.defaultOgImage || '',
          twitterCard: data.twitterCard || 'summary_large_image',
          canonicalBase: data.canonicalBase || '',
        });
      }
      if (pagesRes.status === 'fulfilled' && pagesRes.value.ok) {
        const data = await pagesRes.value.json();
        setPages(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load SEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobal = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'global', ...globalSeo }),
      });
      if (res.ok) {
        setSaveSuccess('global');
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Failed to save global SEO:', error);
      alert('Failed to save global SEO settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePage = async () => {
    if (!editingPage) return;
    setSaving(true);
    try {
      const res = await fetch('/api/seo/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: editingPage.page,
          title: editingPage.title,
          description: editingPage.description,
          robots: editingPage.robots,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPages(prev => prev.map(p => p._id === editingPage._id ? updated : p));
        setEditingPage(null);
        setSaveSuccess('page');
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Failed to save page SEO:', error);
      alert('Failed to save page SEO');
    } finally {
      setSaving(false);
    }
  };

  const filteredPages = pages.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.page?.toLowerCase().includes(q) || p.title?.en?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-kcc-green" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Messages */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
          <CheckCircle size={16} />
          SEO settings saved successfully!
        </div>
      )}

      {/* Global SEO Settings */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-kcc-green" />
            <h2 className="text-base font-semibold text-dark-50">Global SEO Settings</h2>
          </div>
          <button
            type="button"
            onClick={handleSaveGlobal}
            disabled={saving}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Global Settings
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Title Template (EN)</label>
              <input
                type="text"
                value={globalSeo.titleTemplate.en}
                onChange={(e) => setGlobalSeo(prev => ({ ...prev, titleTemplate: { ...prev.titleTemplate, en: e.target.value } }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                placeholder="%s | Site Name"
              />
              <p className="text-xs text-dark-500 mt-1">Use %s for page title placeholder</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Title Template (AR)</label>
              <input
                type="text"
                value={globalSeo.titleTemplate.ar}
                onChange={(e) => setGlobalSeo(prev => ({ ...prev, titleTemplate: { ...prev.titleTemplate, ar: e.target.value } }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                dir="rtl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Default Description (EN)</label>
              <textarea
                value={globalSeo.defaultDescription.en}
                onChange={(e) => setGlobalSeo(prev => ({ ...prev, defaultDescription: { ...prev.defaultDescription, en: e.target.value } }))}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
              />
              <p className="text-xs text-dark-500 mt-1">{globalSeo.defaultDescription.en.length}/160 characters</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Default Description (AR)</label>
              <textarea
                value={globalSeo.defaultDescription.ar}
                onChange={(e) => setGlobalSeo(prev => ({ ...prev, defaultDescription: { ...prev.defaultDescription, ar: e.target.value } }))}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
                dir="rtl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Default OG Image URL</label>
              <div className="relative">
                <Image size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  value={globalSeo.defaultOgImage}
                  onChange={(e) => setGlobalSeo(prev => ({ ...prev, defaultOgImage: e.target.value }))}
                  className="w-full ps-9 pe-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Twitter Card Type</label>
              <select
                value={globalSeo.twitterCard}
                onChange={(e) => setGlobalSeo(prev => ({ ...prev, twitterCard: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                title="Twitter card type"
              >
                <option value="summary">summary</option>
                <option value="summary_large_image">summary_large_image</option>
                <option value="app">app</option>
                <option value="player">player</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Canonical Base URL</label>
              <div className="relative">
                <ExternalLink size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  value={globalSeo.canonicalBase}
                  onChange={(e) => setGlobalSeo(prev => ({ ...prev, canonicalBase: e.target.value }))}
                  className="w-full ps-9 pe-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Page SEO */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-kcc-beige" />
            <h2 className="text-base font-semibold text-dark-50">Page-Level SEO</h2>
          </div>
          <div className="relative w-64">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="w-full ps-9 pe-3 py-1.5 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none"
            />
          </div>
        </div>

        {/* Edit Page Form */}
        {editingPage && (
          <div className="p-5 border-b border-dark-800 bg-dark-800/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-dark-100">
                Editing SEO for: <code className="text-kcc-green ms-1">{editingPage.page}</code>
              </h3>
              <button type="button" onClick={() => setEditingPage(null)} className="text-dark-400 hover:text-dark-50 text-sm">Cancel</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Page Title (EN)</label>
                <input
                  type="text"
                  value={editingPage.title?.en || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, title: { ...editingPage.title, en: e.target.value } })}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Page Title (AR)</label>
                <input
                  type="text"
                  value={editingPage.title?.ar || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, title: { ...editingPage.title, ar: e.target.value } })}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Description (EN)</label>
                <textarea
                  value={editingPage.description?.en || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, description: { ...editingPage.description, en: e.target.value } })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
                />
                <p className="text-xs text-dark-500 mt-1">{(editingPage.description?.en || '').length}/160 characters</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Description (AR)</label>
                <textarea
                  value={editingPage.description?.ar || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, description: { ...editingPage.description, ar: e.target.value } })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Robots</label>
                <select
                  value={editingPage.robots || 'index,follow'}
                  onChange={(e) => setEditingPage({ ...editingPage, robots: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                  title="Robots directive"
                >
                  <option value="index,follow">index, follow</option>
                  <option value="noindex,follow">noindex, follow</option>
                  <option value="index,nofollow">index, nofollow</option>
                  <option value="noindex,nofollow">noindex, nofollow</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setEditingPage(null)} className="px-4 py-2 text-sm text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50">Cancel</button>
              <button
                type="button"
                onClick={handleSavePage}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Page SEO
              </button>
            </div>
          </div>
        )}

        {/* Pages List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800">
                <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Page</th>
                <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Title (EN)</th>
                <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Description (EN)</th>
                <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Robots</th>
                <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {filteredPages.map((page) => (
                <tr key={page._id} className="hover:bg-dark-800/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <code className="text-sm text-kcc-green">{page.page}</code>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-dark-200 max-w-xs truncate">{page.title?.en || '-'}</td>
                  <td className="px-5 py-3.5 text-sm text-dark-400 max-w-xs truncate">{page.description?.en || '-'}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                      page.robots?.includes('noindex') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                    }`}>
                      {page.robots || 'index,follow'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => setEditingPage({ ...page })}
                      className="p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors"
                      title="Edit page SEO"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-dark-400">
              <FileText size={28} className="mb-2" />
              <p className="text-sm">No page SEO entries found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
