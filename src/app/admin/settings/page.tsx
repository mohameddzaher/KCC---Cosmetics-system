'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings, Globe, Bell, Share2, Save, Loader2,
  CheckCircle, Mail, Phone, MapPin, Building2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const defaultSettings = {
  general: {
    siteName: { en: '', ar: '' },
    contactEmail: '',
    contactPhone: '',
    whatsapp: '',
    contactAddress: { en: '', ar: '' },
    companyName: { en: '', ar: '' },
    emails: { info: '', sales: '', support: '', hr: '', careers: '' },
    phones: { primary: '', secondary: '' },
    socialMedia: {
      instagram: '',
      twitter: '',
      linkedin: '',
      facebook: '',
      youtube: '',
      tiktok: '',
      snapchat: '',
    },
  },
  referral: {
    enabled: true,
    creditAmount: 50,
    minOrderForCredit: 100,
    maxCreditsPerUser: 500,
    expirationDays: 365,
  },
  notifications: {
    emailNewOrder: true,
    emailOrderStatusChange: true,
    emailLowStock: true,
    emailNewCustomer: false,
    emailPaymentReceived: true,
    emailDailyReport: true,
    emailWeeklyReport: false,
    recipientEmails: '',
  },
};

export default function SettingsPage() {
  const { tx } = useLanguage();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  /**
   * Whether the server can send mail at all. Every toggle below is inert
   * without SMTP credentials, so this is checked and stated outright rather
   * than left for someone to discover when an email never arrives.
   */
  const [mail, setMail] = useState<{ configured: boolean; from?: string; missing: string[] } | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings/mail', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMail(d))
      .catch(() => {});
  }, []);

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await res.json();
      setTestResult(
        res.ok
          ? { ok: true, text: `Sent to ${data.to}. Check the inbox (and the spam folder).` }
          : { ok: false, text: data.error || 'Send failed' }
      );
    } catch (e) {
      setTestResult({ ok: false, text: e instanceof Error ? e.message : 'Send failed' });
    } finally {
      setTesting(false);
    }
  };
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'referral' | 'notifications'>('general');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const g = data.general || {};
        setSettings({
          // Deep-merge so newly added nested fields (emails/phones/social) are never undefined.
          general: {
            ...defaultSettings.general,
            ...g,
            siteName: { ...defaultSettings.general.siteName, ...(g.siteName || {}) },
            companyName: { ...defaultSettings.general.companyName, ...(g.companyName || {}) },
            contactAddress: { ...defaultSettings.general.contactAddress, ...(g.contactAddress || {}) },
            emails: { ...defaultSettings.general.emails, ...(g.emails || {}) },
            phones: { ...defaultSettings.general.phones, ...(g.phones || {}) },
            socialMedia: { ...defaultSettings.general.socialMedia, ...(g.socialMedia || {}) },
          },
          referral: { ...defaultSettings.referral, ...(data.referral || {}) },
          notifications: { ...defaultSettings.notifications, ...(data.notifications || {}) },
        });
      } else {
        console.error('Failed to fetch settings:', res.statusText);
        // Keep defaults on error
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (section: 'general' | 'referral' | 'notifications') => {
    setSaving(section);
    setSaveError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data: settings[section] }),
      });
      if (res.ok) {
        setSaveSuccess(section);
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        const err = await res.json();
        setSaveError(err.error || 'Failed to save settings');
        setTimeout(() => setSaveError(null), 5000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveError('Failed to save settings');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(null);
    }
  };

  const sections = [
    { key: 'general' as const, label: 'General', icon: Settings },
    { key: 'referral' as const, label: 'Referral Program', icon: Share2 },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-kcc-green" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
          <CheckCircle size={16} />{tx('Settings saved successfully!')}</div>
      )}

      {/* Error Message */}
      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {saveError}
        </div>
      )}

      {/* Section Navigation */}
      <div className="tab-bar">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              type="button"
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeSection === section.key
                  ? 'bg-kcc-green/10 text-kcc-green'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-2'
              }`}
            >
              <Icon size={16} />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {activeSection === 'general' && (
        <div className="bg-surface border border-line rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-line">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-kcc-green" />
              <h2 className="text-base font-semibold text-fg">{tx('General Settings')}</h2>
            </div>
            <button
              type="button"
              onClick={() => handleSave('general')}
              disabled={saving === 'general'}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {saving === 'general' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
          <div className="p-5 space-y-5">
            {/* Site Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <Globe size={12} />{tx('Site Name (EN)')}</label>
                <input
                  type="text"
                  value={settings.general.siteName.en}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, siteName: { ...prev.general.siteName, en: e.target.value } } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <Globe size={12} />{tx('Site Name (AR)')}</label>
                <input
                  type="text"
                  value={settings.general.siteName.ar}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, siteName: { ...prev.general.siteName, ar: e.target.value } } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <Building2 size={12} />{tx('Company Name (EN)')}</label>
                <input
                  type="text"
                  value={settings.general.companyName.en}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, companyName: { ...prev.general.companyName, en: e.target.value } } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <Building2 size={12} />{tx('Company Name (AR)')}</label>
                <input
                  type="text"
                  value={settings.general.companyName.ar}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, companyName: { ...prev.general.companyName, ar: e.target.value } } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <Mail size={12} />{tx('Contact Email')}</label>
                <input
                  type="email"
                  value={settings.general.contactEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, contactEmail: e.target.value } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <Phone size={12} />{tx('Contact Phone')}</label>
                <input
                  type="text"
                  value={settings.general.contactPhone}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, contactPhone: e.target.value } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <Phone size={12} />{tx('WhatsApp')}</label>
                <input
                  type="text"
                  value={settings.general.whatsapp}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, whatsapp: e.target.value } }))}
                  placeholder="+966 5x xxx xxxx"
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <Phone size={12} />{tx('Secondary Phone')}</label>
                <input
                  type="text"
                  value={settings.general.phones.secondary}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, phones: { ...prev.general.phones, secondary: e.target.value } } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
              </div>
            </div>

            {/* Department Emails */}
            <div>
              <h3 className="text-sm font-medium text-fg mb-3">{tx('Department Emails')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['info', 'sales', 'support', 'hr', 'careers'] as const).map((dept) => (
                  <div key={dept}>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5 capitalize">
                      <Mail size={12} /> {dept}
                    </label>
                    <input
                      type="email"
                      value={settings.general.emails[dept]}
                      onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, emails: { ...prev.general.emails, [dept]: e.target.value } } }))}
                      placeholder={`${dept}@kcc-bv.com`}
                      className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <MapPin size={12} />{tx('Address (EN)')}</label>
                <input
                  type="text"
                  value={settings.general.contactAddress.en}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, contactAddress: { ...prev.general.contactAddress, en: e.target.value } } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-1.5">
                  <MapPin size={12} />{tx('Address (AR)')}</label>
                <input
                  type="text"
                  value={settings.general.contactAddress.ar}
                  onChange={(e) => setSettings(prev => ({ ...prev, general: { ...prev.general, contactAddress: { ...prev.general.contactAddress, ar: e.target.value } } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Social Media */}
            <div>
              <h3 className="text-sm font-medium text-fg mb-3">{tx('Social Media Links')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(settings.general.socialMedia).map(([platform, url]) => (
                  <div key={platform}>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5 capitalize">{platform}</label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: {
                          ...prev.general,
                          socialMedia: { ...prev.general.socialMedia, [platform]: e.target.value }
                        }
                      }))}
                      className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                      placeholder={`https://${platform}.com/...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral Program Settings */}
      {activeSection === 'referral' && (
        <div className="bg-surface border border-line rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-line">
            <div className="flex items-center gap-2">
              <Share2 size={18} className="text-kcc-beige" />
              <h2 className="text-base font-semibold text-fg">{tx('Referral Program Configuration')}</h2>
            </div>
            <button
              type="button"
              onClick={() => handleSave('referral')}
              disabled={saving === 'referral'}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {saving === 'referral' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.referral.enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, referral: { ...prev.referral, enabled: e.target.checked } }))}
                  className="w-4 h-4 rounded border-line bg-bg text-kcc-green focus:ring-kcc-green"
                />
                <span className="text-sm font-medium text-fg">{tx('Enable Referral Program')}</span>
              </label>
              <p className="text-xs text-fg-subtle mt-1 ms-6">{tx('When enabled, customers can share referral codes and earn credits.')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Credit Amount ($)')}</label>
                <input
                  type="number"
                  value={settings.referral.creditAmount}
                  onChange={(e) => setSettings(prev => ({ ...prev, referral: { ...prev.referral, creditAmount: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
                <p className="text-xs text-fg-subtle mt-1">{tx('Amount credited per successful referral')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Min Order for Credit ($)')}</label>
                <input
                  type="number"
                  value={settings.referral.minOrderForCredit}
                  onChange={(e) => setSettings(prev => ({ ...prev, referral: { ...prev.referral, minOrderForCredit: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
                <p className="text-xs text-fg-subtle mt-1">{tx('Referred user must place an order above this amount')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Max Credits Per User ($)')}</label>
                <input
                  type="number"
                  value={settings.referral.maxCreditsPerUser}
                  onChange={(e) => setSettings(prev => ({ ...prev, referral: { ...prev.referral, maxCreditsPerUser: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
                <p className="text-xs text-fg-subtle mt-1">{tx('Maximum total credits a single user can earn')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Credit Expiration (days)')}</label>
                <input
                  type="number"
                  value={settings.referral.expirationDays}
                  onChange={(e) => setSettings(prev => ({ ...prev, referral: { ...prev.referral, expirationDays: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                />
                <p className="text-xs text-fg-subtle mt-1">{tx('Number of days before credits expire (0 = never)')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeSection === 'notifications' && (
        <div className="bg-surface border border-line rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-line">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-yellow-400" />
              <h2 className="text-base font-semibold text-fg">{tx('Notification Preferences')}</h2>
            </div>
            <button
              type="button"
              onClick={() => handleSave('notifications')}
              disabled={saving === 'notifications'}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {saving === 'notifications' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
          <div className="p-5 space-y-5">
            {mail && !mail.configured && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-fg">{tx('Email sending is not configured')}</p>
                <p className="mt-1 text-xs text-fg-muted">
                  {tx('These preferences are saved, but no mail can leave the server until SMTP credentials are set. Missing:')}{' '}
                  <span className="font-mono">{mail.missing.join(', ')}</span>
                </p>
              </div>
            )}
            {mail?.configured && (
              <div className="rounded-lg border border-line bg-surface-2 p-4">
                <p className="text-sm font-medium text-fg">
                  {tx('Sending from')} <span className="font-mono text-xs">{mail.from}</span>
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder={tx('you@example.com')}
                    aria-label={tx('Send a test email')}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg focus:border-kcc-green focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendTest}
                    disabled={testing || !testTo.includes('@')}
                    className="shrink-0 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-3 disabled:opacity-50"
                  >
                    {testing ? <Loader2 size={14} className="animate-spin" /> : tx('Send a test email')}
                  </button>
                </div>
                {testResult && (
                  <p className={`mt-2 text-xs ${testResult.ok ? 'text-kcc-green' : 'text-red-500'}`}>
                    {testResult.text}
                  </p>
                )}
              </div>
            )}

            {/* Recipient Emails */}
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">{tx('Notification Recipients')}</label>
              <input
                type="text"
                value={settings.notifications.recipientEmails}
                onChange={(e) => setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, recipientEmails: e.target.value } }))}
                className="w-full px-3 py-2 text-sm bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
                placeholder={tx('email1@kcc.com, email2@kcc.com')}
              />
              <p className="text-xs text-fg-subtle mt-1">{tx('Comma-separated list of email addresses')}</p>
            </div>

            {/* Email Notifications */}
            <div>
              <h3 className="text-sm font-medium text-fg mb-3">{tx('Email Notifications')}</h3>
              <div className="space-y-3">
                {[
                  { key: 'emailNewOrder', label: 'New Order Placed', desc: 'Receive email when a new order is submitted' },
                  { key: 'emailOrderStatusChange', label: 'Order Status Change', desc: 'Receive email when order status is updated' },
                  { key: 'emailLowStock', label: 'Low Stock Alert', desc: 'Receive email when inventory falls below threshold' },
                  { key: 'emailNewCustomer', label: 'New Customer Registration', desc: 'Receive email when a new customer registers' },
                  { key: 'emailPaymentReceived', label: 'Payment Received', desc: 'Receive email when a payment is recorded' },
                  { key: 'emailDailyReport', label: 'Daily Summary Report', desc: 'Requires a scheduled job on the server — not sent yet' },
                  { key: 'emailWeeklyReport', label: 'Weekly Summary Report', desc: 'Requires a scheduled job on the server — not sent yet' },
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between p-3 bg-bg border border-line rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-fg">{item.label}</p>
                      <p className="text-xs text-fg-subtle mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ms-4">
                      <input
                        type="checkbox"
                        checked={(settings.notifications as any)[item.key]}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, [item.key]: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-fg-subtle peer-checked:after:bg-surface after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-kcc-green"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
