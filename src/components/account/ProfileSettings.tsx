'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UserCog, KeyRound, Loader2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Tab = 'profile' | 'password';

export default function ProfileSettings() {
  const { tx } = useLanguage();
  const { refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    name: '', email: '', phone: '', whatsapp: '', website: '',
    company: '', country: '', city: '', address: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', { cache: 'no-store' });
      if (res.ok) {
        const u = await res.json();
        setProfile({
          name: u.name || '', email: u.email || '', phone: u.phone || '',
          whatsapp: u.whatsapp || '', website: u.website || '', company: u.company || '',
          country: u.country || '', city: u.city || '', address: u.address || '',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ ok: true, text: 'Profile updated successfully.' });
        await refreshUser();
      } else {
        setProfileMsg({ ok: false, text: data.error || 'Failed to update profile.' });
      }
    } catch {
      setProfileMsg({ ok: false, text: 'Network error.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (pw.newPassword !== pw.confirm) {
      setPwMsg({ ok: false, text: 'New password and confirmation do not match.' });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ ok: true, text: 'Password changed successfully.' });
        setPw({ currentPassword: '', newPassword: '', confirm: '' });
      } else {
        setPwMsg({ ok: false, text: data.error || 'Failed to change password.' });
      }
    } catch {
      setPwMsg({ ok: false, text: 'Network error.' });
    } finally {
      setSavingPw(false);
    }
  };

  const input = 'w-full px-3 py-2.5 text-sm bg-surface-2 border border-line rounded-xl text-fg placeholder:text-fg-subtle focus:border-kcc-green focus:outline-none';
  const label = 'block text-xs font-medium text-fg-muted mb-1.5';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="bg-surface/50 border border-line rounded-2xl overflow-hidden"
    >
      <div className="scroll-thin flex justify-center overflow-x-auto border-b border-line">
        <button type="button" onClick={() => setTab('profile')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-colors ${
            tab === 'profile' ? 'text-kcc-green border-b-2 border-kcc-green' : 'text-fg-muted hover:text-fg'}`}>
          <UserCog size={16} />{tx('Edit Profile')}</button>
        <button type="button" onClick={() => setTab('password')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-colors ${
            tab === 'password' ? 'text-kcc-green border-b-2 border-kcc-green' : 'text-fg-muted hover:text-fg'}`}>
          <KeyRound size={16} />{tx('Change Password')}</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-kcc-green" size={22} /></div>
      ) : tab === 'profile' ? (
        <div className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div><label className={label}>{tx('Full Name')}</label>
              <input className={input} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label className={label}>{tx('Email')}</label>
              <input type="email" className={input} value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
            <div><label className={label}>{tx('Phone')}</label>
              <input className={input} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+966 5x xxx xxxx" /></div>
            <div><label className={label}>{tx('WhatsApp')}</label>
              <input className={input} value={profile.whatsapp} onChange={e => setProfile(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+966 5x xxx xxxx" /></div>
            <div><label className={label}>{tx('Company')}</label>
              <input className={input} value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} /></div>
            <div><label className={label}>{tx('Website')}</label>
              <input className={input} value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} placeholder="https://..." /></div>
            <div><label className={label}>{tx('Country')}</label>
              <input className={input} value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} /></div>
            <div><label className={label}>{tx('City')}</label>
              <input className={input} value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} /></div>
            <div className="sm:col-span-2 xl:col-span-3"><label className={label}>{tx('Address')}</label>
              <input className={input} value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
          {profileMsg && (
            <div className={`flex items-center gap-2 text-sm ${profileMsg.ok ? 'text-kcc-green' : 'text-red-400'}`}>
              {profileMsg.ok ? <Check size={15} /> : <AlertCircle size={15} />}{profileMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={saveProfile} disabled={savingProfile}
              className="px-5 py-2.5 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-xl transition-colors disabled:opacity-50">
              {savingProfile ? <Loader2 size={14} className="me-1.5 inline animate-spin" /> : null}
              {tx('Save Changes')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-6">
          {/* One toggle for the three fields: when you are changing a password
              you want to check all of them at once, not one at a time. */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPw ? tx('Hide password') : tx('Show password')}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div><label className={label}>{tx('Current Password')}</label>
              <input type={showPw ? 'text' : 'password'} autoComplete="current-password" className={input} value={pw.currentPassword} onChange={e => setPw(p => ({ ...p, currentPassword: e.target.value }))} /></div>
            <div><label className={label}>{tx('New Password')}</label>
              <input type={showPw ? 'text' : 'password'} autoComplete="new-password" className={input} value={pw.newPassword} onChange={e => setPw(p => ({ ...p, newPassword: e.target.value }))} /></div>
            <div><label className={label}>{tx('Confirm New Password')}</label>
              <input type={showPw ? 'text' : 'password'} autoComplete="new-password" className={input} value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
          </div>
          {pwMsg && (
            <div className={`flex items-center gap-2 text-sm ${pwMsg.ok ? 'text-kcc-green' : 'text-red-400'}`}>
              {pwMsg.ok ? <Check size={15} /> : <AlertCircle size={15} />}{pwMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={savePassword} disabled={savingPw}
              className="px-5 py-2.5 text-sm font-medium text-brand-fg bg-brand hover:bg-brand-hover rounded-xl transition-colors disabled:opacity-50">
              {savingPw ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}Update Password
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
