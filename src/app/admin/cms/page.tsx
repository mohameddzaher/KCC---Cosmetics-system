'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ImageUpload from '@/components/admin/ImageUpload';
import {
  Plus, Edit2, Trash2, Eye, ChevronDown, Loader2,
  FileText, Briefcase, MessageSquare, Award, Factory,
  Image, Newspaper, HelpCircle, X, Save
} from 'lucide-react';

const contentTabs = [
  { key: 'vision2030', label: 'Vision 2030', icon: Award },
  { key: 'sections', label: 'Sections', icon: FileText },
  { key: 'services', label: 'Services', icon: Briefcase },
  { key: 'testimonials', label: 'Testimonials', icon: MessageSquare },
  { key: 'certificates', label: 'Certificates', icon: Award },
  { key: 'factories', label: 'Factories', icon: Factory },
  { key: 'portfolio', label: 'Portfolio', icon: Image },
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'faqs', label: 'FAQs', icon: HelpCircle },
];

// Tabs backed by dedicated content models (served by /api/content/[type]).
// The rest (sections, vision2030) are CmsSection blocks served by /api/cms.
const CONTENT_MODEL_TABS = ['services', 'testimonials', 'certificates', 'factories', 'portfolio', 'news', 'faqs'];
const isContentTab = (tab: string) => CONTENT_MODEL_TABS.includes(tab);

// Safely resolve a value that may be a plain string or a { en, ar } object.
function pickField(v: any, locale: string): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v[locale] || v.en || '';
  return String(v);
}

// Map the generic CMS form fields to each dedicated model's shape.
function buildContentPayload(tab: string, f: any) {
  const en = f.titleEn, ar = f.titleAr;
  const dEn = f.descriptionEn, dAr = f.descriptionAr;
  const title = { en, ar };
  const description = { en: dEn, ar: dAr };
  const base: any = { enabled: f.enabled };
  const img = f.imageUrl || '';
  switch (tab) {
    case 'services':
      return { ...base, title, description, icon: 'Beaker', image: img };
    case 'certificates':
      return { ...base, title, description, issuer: { en: '', ar: '' }, imageUrl: img, issuedDate: new Date() };
    case 'factories':
      return { ...base, name: title, description, location: { en: f.subtitleEn, ar: f.subtitleAr }, capacity: { en: '', ar: '' }, imageUrl: img, features: [] };
    case 'portfolio':
      return { ...base, title, description, category: { en: f.subtitleEn, ar: f.subtitleAr }, client: '', imageUrl: img, slug: f.slug || en.toLowerCase().replace(/\s+/g, '-') };
    case 'faqs':
      return { ...base, question: title, answer: description, category: 'general' };
    case 'testimonials':
      return { ...base, name: title, company: { en: f.subtitleEn, ar: f.subtitleAr }, content: description, rating: 5, avatar: img };
    case 'news':
      return { title, excerpt: { en: f.subtitleEn, ar: f.subtitleAr }, content: description, slug: f.slug || en.toLowerCase().replace(/\s+/g, '-'), status: f.enabled ? 'published' : 'draft', author: 'KCC', imageUrl: img };
    default:
      return { ...base, title, description };
  }
}

export default function CmsPage() {
  const { locale } = useLanguage();
  const [activeTab, setActiveTab] = useState('sections');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    titleEn: '',
    titleAr: '',
    subtitleEn: '',
    subtitleAr: '',
    badgeEn: '',
    badgeAr: '',
    descriptionEn: '',
    descriptionAr: '',
    slug: '',
    imageUrl: '',
    type: '',
    enabled: true,
  });

  useEffect(() => {
    loadItems(activeTab);
  }, [activeTab]);

  const loadItems = async (tab: string) => {
    setLoading(true);
    try {
      const url = isContentTab(tab) ? `/api/content/${tab}?all=true` : `/api/cms?type=${tab === 'vision2030' ? 'vision2030' : tab}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch CMS items:', res.statusText);
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch CMS items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const delUrl = isContentTab(activeTab) ? `/api/content/${activeTab}/${id}` : `/api/cms/${id}`;
      const res = await fetch(delUrl, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(item => item._id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Failed to delete CMS item:', error);
      alert('Failed to delete item');
    }
  };

  const handleToggle = async (id: string, field: string) => {
    const item = items.find(i => i._id === id);
    if (!item) return;
    try {
      const toggleUrl = isContentTab(activeTab) ? `/api/content/${activeTab}/${id}` : `/api/cms/${id}`;
      const res = await fetch(toggleUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !item[field] }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i._id === id ? updated : i));
      }
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    const fieldsEn = item.fields?.en || {};
    const fieldsAr = item.fields?.ar || {};
    setFormData({
      titleEn: fieldsEn.title || item.title?.en || item.name?.en || item.question?.en || '',
      titleAr: fieldsAr.title || item.title?.ar || item.name?.ar || item.question?.ar || '',
      subtitleEn: fieldsEn.subtitle || '',
      subtitleAr: fieldsAr.subtitle || '',
      badgeEn: fieldsEn.badge || '',
      badgeAr: fieldsAr.badge || '',
      descriptionEn: fieldsEn.description || item.description?.en || item.text?.en || item.answer?.en || item.location?.en || '',
      descriptionAr: fieldsAr.description || item.description?.ar || item.text?.ar || item.answer?.ar || item.location?.ar || '',
      slug: item.slug || '',
      imageUrl: item.imageUrl || item.image || item.avatar || '',
      type: item.type || (activeTab === 'vision2030' ? 'vision2030' : activeTab),
      enabled: item.enabled !== false,
    });
    setShowForm(true);
  };

  const handleOpenCreate = () => {
    setEditItem(null);
    setFormData({
      titleEn: '',
      titleAr: '',
      subtitleEn: '',
      subtitleAr: '',
      badgeEn: '',
      badgeAr: '',
      descriptionEn: '',
      descriptionAr: '',
      slug: '',
      imageUrl: '',
      type: activeTab === 'vision2030' ? 'vision2030' : activeTab,
      enabled: true,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const payload: any = isContentTab(activeTab)
      ? buildContentPayload(activeTab, formData)
      : activeTab === 'vision2030'
      ? {
        type: 'vision2030',
        slug: formData.slug || 'vision-2030-home',
        enabled: formData.enabled,
        status: 'published',
        order: 5,
        fields: {
          en: {
            title: formData.titleEn,
            subtitle: formData.subtitleEn,
            badge: formData.badgeEn,
            description: formData.descriptionEn,
          },
          ar: {
            title: formData.titleAr,
            subtitle: formData.subtitleAr,
            badge: formData.badgeAr,
            description: formData.descriptionAr,
          },
        },
      }
      : {
        type: activeTab,
        slug: formData.slug || formData.titleEn.toLowerCase().replace(/\s+/g, '-'),
        title: { en: formData.titleEn, ar: formData.titleAr },
        description: { en: formData.descriptionEn, ar: formData.descriptionAr },
        enabled: formData.enabled,
      };

    const createUrl = isContentTab(activeTab) ? `/api/content/${activeTab}` : '/api/cms';
    const editUrl = isContentTab(activeTab) ? `/api/content/${activeTab}/${editItem?._id}` : `/api/cms/${editItem?._id}`;
    try {
      if (editItem) {
        const res = await fetch(editUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setItems(prev => prev.map(i => i._id === editItem._id ? updated : i));
          setShowForm(false);
          setEditItem(null);
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to update');
        }
      } else {
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setItems(prev => [...prev, created]);
          setShowForm(false);
          setEditItem(null);
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to create');
        }
      }
    } catch (error) {
      console.error('Failed to save CMS item:', error);
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const getDisplayField = (item: any) => {
    if (item.fields?.[locale]?.title || item.fields?.en?.title) {
      return item.fields?.[locale]?.title || item.fields?.en?.title;
    }
    if (item.title) return pickField(item.title, locale);
    if (item.name) return pickField(item.name, locale);
    if (item.question) return pickField(item.question, locale);
    if (item.clientName) return item.clientName;
    if (item.client) return item.client;
    if (item.key) return item.key;
    return 'Untitled';
  };

  const getSubField = (item: any) => {
    if (item.fields?.[locale]?.description || item.fields?.en?.description) {
      return item.fields?.[locale]?.description || item.fields?.en?.description;
    }
    if (item.description) return pickField(item.description, locale);
    if (item.content) return pickField(item.content, locale).substring(0, 80) + '…';
    if (item.text) return pickField(item.text, locale);
    if (item.answer) return pickField(item.answer, locale).substring(0, 80) + '…';
    if (item.location) return pickField(item.location, locale);
    if (item.company) return pickField(item.company, locale);
    if (item.issuer) return pickField(item.issuer, locale);
    if (item.category) return pickField(item.category, locale);
    if (item.slug) return `/${item.slug}`;
    return '';
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-kcc-green" size={24} />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-dark-400">
          <FileText size={32} className="mb-2" />
          <p>No items found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-800">
              <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Title / Name</th>
              <th className="text-start text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Details</th>
              <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800">
            {items.map((item) => (
              <tr key={item._id} className="hover:bg-dark-800/50 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-dark-100">{getDisplayField(item)}</p>
                  {item.key && <p className="text-xs text-dark-500 mt-0.5">Key: {item.key}</p>}
                  {item.slug && <p className="text-xs text-dark-500 mt-0.5">Slug: {item.slug}</p>}
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm text-dark-400 max-w-xs truncate">{getSubField(item)}</p>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleToggle(item._id, 'enabled')}
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                      item.enabled
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                  >
                    {item.enabled ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-dark-400 hover:text-kcc-green hover:bg-dark-800 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item._id)}
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-dark-900 border border-dark-800 rounded-xl">
        {contentTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditItem(null); }}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-kcc-green/10 text-kcc-green'
                  : 'text-dark-400 hover:text-dark-50 hover:bg-dark-800'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <h2 className="text-base font-semibold text-dark-50 capitalize">{activeTab}</h2>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add New
          </button>
        </div>

        {/* Edit Form */}
        {showForm && (
          <div className="p-5 border-b border-dark-800 bg-dark-800/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-dark-100">
                {editItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditItem(null); }}
                className="text-dark-400 hover:text-dark-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Title (EN)</label>
                <input
                  type="text"
                  value={formData.titleEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                  placeholder="Enter title in English"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Title (AR)</label>
                <input
                  type="text"
                  value={formData.titleAr}
                  onChange={(e) => setFormData(prev => ({ ...prev, titleAr: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                  placeholder="Enter title in Arabic"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Description (EN)</label>
                <textarea
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
                  placeholder="Enter description"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Description (AR)</label>
                <textarea
                  value={formData.descriptionAr}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none resize-none"
                  placeholder="Enter description in Arabic"
                  dir="rtl"
                />
              </div>
              {activeTab === 'vision2030' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-dark-400 mb-1.5">Badge (EN)</label>
                    <input
                      type="text"
                      value={formData.badgeEn}
                      onChange={(e) => setFormData(prev => ({ ...prev, badgeEn: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                      placeholder="KCC x Saudi Vision 2030"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-400 mb-1.5">Badge (AR)</label>
                    <input
                      type="text"
                      value={formData.badgeAr}
                      onChange={(e) => setFormData(prev => ({ ...prev, badgeAr: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                      placeholder="KCC × رؤية السعودية 2030"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-400 mb-1.5">Subtitle (EN)</label>
                    <input
                      type="text"
                      value={formData.subtitleEn}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitleEn: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                      placeholder="Innovation, quality, sustainability, jobs..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-400 mb-1.5">Subtitle (AR)</label>
                    <input
                      type="text"
                      value={formData.subtitleAr}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitleAr: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                      placeholder="الابتكار، الجودة، الاستدامة..."
                      dir="rtl"
                    />
                  </div>
                </>
              )}
              {isContentTab(activeTab) && activeTab !== 'faqs' && (
                <div className="md:col-span-2">
                  <ImageUpload
                    value={formData.imageUrl}
                    onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                    label={activeTab === 'testimonials' ? 'Avatar' : 'Image'}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
                  placeholder="auto-generated-from-title"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-dark-700 bg-dark-950 text-kcc-green focus:ring-kcc-green"
                  />
                  <span className="text-sm text-dark-300">Enabled</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditItem(null); }}
                className="px-4 py-2 text-sm text-dark-400 border border-dark-700 rounded-lg hover:text-dark-50 hover:border-dark-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {renderTable()}
      </div>
    </div>
  );
}
