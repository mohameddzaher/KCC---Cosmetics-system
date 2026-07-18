'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UserCog, KeyRound, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'profile' | 'password';

export default function ProfileSettings() {
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

  const input = 'w-full px-3 py-2.5 text-sm bg-dark-800 border border-dark-700 rounded-xl text-dark-100 placeholder:text-dark-500 focus:border-kcc-green focus:outline-none';
  const label = 'block text-xs font-medium text-dark-400 mb-1.5';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden"
    >
      <div className="flex border-b border-dark-800">
        <button type="button" onClick={() => setTab('profile')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors ${
            tab === 'profile' ? 'text-kcc-green border-b-2 border-kcc-green' : 'text-dark-400 hover:text-dark-100'}`}>
          <UserCog size={16} /> Edit Profile
        </button>
        <button type="button" onClick={() => setTab('password')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors ${
            tab === 'password' ? 'text-kcc-green border-b-2 border-kcc-green' : 'text-dark-400 hover:text-dark-100'}`}>
          <KeyRound size={16} /> Change Password
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-kcc-green" size={22} /></div>
      ) : tab === 'profile' ? (
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>Full Name</label>
              <input className={input} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label className={label}>Email</label>
              <input type="email" className={input} value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
            <div><label className={label}>Phone</label>
              <input className={input} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+20 1xx xxx xxxx" /></div>
            <div><label className={label}>WhatsApp</label>
              <input className={input} value={profile.whatsapp} onChange={e => setProfile(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+20 1xx xxx xxxx" /></div>
            <div><label className={label}>Company</label>
              <input className={input} value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} /></div>
            <div><label className={label}>Website</label>
              <input className={input} value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} placeholder="https://..." /></div>
            <div><label className={label}>Country</label>
              <input className={input} value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} /></div>
            <div><label className={label}>City</label>
              <input className={input} value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} /></div>
            <div className="sm:col-span-2"><label className={label}>Address</label>
              <input className={input} value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
          {profileMsg && (
            <div className={`flex items-center gap-2 text-sm ${profileMsg.ok ? 'text-kcc-green' : 'text-red-400'}`}>
              {profileMsg.ok ? <Check size={15} /> : <AlertCircle size={15} />}{profileMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={saveProfile} disabled={savingProfile}
              className="px-5 py-2.5 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-xl transition-colors disabled:opacity-50">
              {savingProfile ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-4 max-w-md">
          <div><label className={label}>Current Password</label>
            <input type="password" className={input} value={pw.currentPassword} onChange={e => setPw(p => ({ ...p, currentPassword: e.target.value }))} /></div>
          <div><label className={label}>New Password</label>
            <input type="password" className={input} value={pw.newPassword} onChange={e => setPw(p => ({ ...p, newPassword: e.target.value }))} /></div>
          <div><label className={label}>Confirm New Password</label>
            <input type="password" className={input} value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
          {pwMsg && (
            <div className={`flex items-center gap-2 text-sm ${pwMsg.ok ? 'text-kcc-green' : 'text-red-400'}`}>
              {pwMsg.ok ? <Check size={15} /> : <AlertCircle size={15} />}{pwMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={savePassword} disabled={savingPw}
              className="px-5 py-2.5 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-xl transition-colors disabled:opacity-50">
              {savingPw ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}Update Password
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
