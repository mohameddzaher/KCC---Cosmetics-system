'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Brain, Plus, Edit2, Trash2, Loader2, Search,
  X, ToggleLeft, ToggleRight, Tag
} from 'lucide-react';

export default function KnowledgePage() {
  const { locale } = useLanguage();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    question: { en: '', ar: '' },
    answer: { en: '', ar: '' },
    category: '',
    keywords: [] as string[],
    keywordInput: '',
    enabled: true,
  });

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge?all=true');
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch knowledge articles:', res.statusText);
        setArticles([]);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleOpenCreate = () => {
    setEditingArticle(null);
    setFormData({
      question: { en: '', ar: '' },
      answer: { en: '', ar: '' },
      category: '',
      keywords: [],
      keywordInput: '',
      enabled: true,
    });
    setShowForm(true);
  };

  const handleOpenEdit = (article: any) => {
    setEditingArticle(article);
    setFormData({
      question: { en: article.question?.en || '', ar: article.question?.ar || '' },
      answer: { en: article.answer?.en || '', ar: article.answer?.ar || '' },
      category: article.category || '',
      keywords: Array.isArray(article.keywords) ? [...article.keywords] : [],
      keywordInput: '',
      enabled: article.enabled !== false,
    });
    setShowForm(true);
  };

  const handleAddKeyword = () => {
    const kw = formData.keywordInput.trim().toLowerCase();
    if (kw && !formData.keywords.includes(kw)) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, kw],
        keywordInput: '',
      }));
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword),
    }));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        question: formData.question,
        answer: formData.answer,
        category: formData.category,
        keywords: formData.keywords,
        enabled: formData.enabled,
      };

      if (editingArticle) {
        const res = await fetch(`/api/knowledge/${editingArticle._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to update article');
          return;
        }
      } else {
        const res = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, order: articles.length + 1 }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to create article');
          return;
        }
      }
      setShowForm(false);
      setEditingArticle(null);
      loadArticles();
    } catch (error) {
      console.error('Failed to save article:', error);
      alert('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadArticles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete article');
      }
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert('Failed to delete article');
    }
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        loadArticles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to toggle article status');
      }
    } catch (error) {
      console.error('Failed to toggle article:', error);
    }
  };

  const filteredArticles = articles.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.question?.en || '').toLowerCase().includes(q) ||
      (a.question?.ar || '').includes(q) ||
      (a.category || '').toLowerCase().includes(q) ||
      (Array.isArray(a.keywords) && a.keywords.some((k: string) => k.includes(q)))
    );
  });

  const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, categories, keywords..."
            className="w-full ps-9 pe-3 py-2.5 text-sm bg-dark-900 border border-dark-800 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-dark-400">{filteredArticles.length} articles</span>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Article
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-100">
              {editingArticle ? 'Edit Knowledge Article' : 'Add New Knowledge Article'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingArticle(null); }} className="text-dark-400 hover:text-dark-50" aria-label="Close form">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4">
            {/* Question fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Question (EN)</label>
                <input
                  type="text"
                  value={formData.question.en}
                  onChange={(e) => setFormData(prev => ({ ...prev, question: { ...prev.question, en: e.target.value } }))}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                  placeholder="What is the minimum order?"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Question (AR)</label>
                <input
                  type="text"
                  value={formData.question.ar}
                  onChange={(e) => setFormData(prev => ({ ...prev, question: { ...prev.question, ar: e.target.value } }))}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                  dir="rtl"
                  placeholder="\u0645\u0627 \u0647\u0648 \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0637\u0644\u0628\u061f"
                />
              </div>
            </div>

            {/* Answer fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Answer (EN)</label>
                <textarea
                  value={formData.answer.en}
                  onChange={(e) => setFormData(prev => ({ ...prev, answer: { ...prev.answer, en: e.target.value } }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
                  placeholder="Enter the answer..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Answer (AR)</label>
                <textarea
                  value={formData.answer.ar}
                  onChange={(e) => setFormData(prev => ({ ...prev, answer: { ...prev.answer, ar: e.target.value } }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
                  dir="rtl"
                  placeholder="\u0623\u062f\u062e\u0644 \u0627\u0644\u0625\u062c\u0627\u0628\u0629..."
                />
              </div>
            </div>

            {/* Category & Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                  placeholder="e.g., Orders, Products, Shipping"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Keywords (press Enter or comma to add)</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-dark-950 border border-dark-700 rounded-lg min-h-[38px]">
                  {formData.keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-kcc-green/10 text-kcc-green rounded-full">
                      {kw}
                      <button type="button" onClick={() => handleRemoveKeyword(kw)} className="hover:text-red-400" aria-label={`Remove keyword ${kw}`}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={formData.keywordInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, keywordInput: e.target.value }))}
                    onKeyDown={handleKeywordKeyDown}
                    onBlur={handleAddKeyword}
                    className="flex-1 min-w-[80px] text-sm bg-transparent text-dark-100 focus:outline-none"
                    placeholder={formData.keywords.length === 0 ? 'Add keywords...' : ''}
                  />
                </div>
              </div>
            </div>

            {/* Enabled toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-dark-700 bg-dark-950 text-kcc-green focus:ring-kcc-green"
                />
                <span className="text-sm text-dark-300">Enabled (visible to users)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={() => { setShowForm(false); setEditingArticle(null); }} className="px-4 py-2 text-sm text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
              {editingArticle ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Articles Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-kcc-green" size={24} />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-dark-400">
            <Brain size={32} className="mb-2" />
            <p>No knowledge articles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Question (EN)</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Category</th>
                  <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Keywords</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Enabled</th>
                  <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filteredArticles.map((article) => (
                  <tr key={article._id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-dark-100 max-w-sm">{(article.question && article.question[locale]) || article.question?.en || ''}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-kcc-beige/10 text-kcc-beige">
                        {article.category || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(article.keywords || []).slice(0, 3).map((kw: string) => (
                          <span key={kw} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-dark-800 text-dark-300 rounded">
                            <Tag size={9} />
                            {kw}
                          </span>
                        ))}
                        {(article.keywords || []).length > 3 && (
                          <span className="text-xs text-dark-500">+{article.keywords.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(article._id, article.enabled)}
                        className={`p-1 rounded-lg transition-colors ${article.enabled ? 'text-green-400' : 'text-dark-500'}`}
                        title={article.enabled ? 'Disable' : 'Enable'}
                      >
                        {article.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(article)}
                          className="p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(article._id)}
                          className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
