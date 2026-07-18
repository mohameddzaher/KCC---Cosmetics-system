'use client';

import { useState } from 'react';
import { KeyRound, Loader2, Check, AlertCircle, Copy } from 'lucide-react';

interface Props {
  customerId: string;
  email: string;
  isActive: boolean;
  onChange: () => void;
}

/**
 * Super-admin / admin control to give a customer login credentials
 * (username = email, plus a password) so they can sign in and place requests.
 */
export default function CustomerCredentials({ customerId, email, isActive, onChange }: Props) {
  const [pwd, setPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const genPassword = () => {
    const p = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(Math.random() * 90 + 10);
    setPwd(p);
  };

  const save = async () => {
    setMsg(null);
    if (!pwd || pwd.length < 6) { setMsg({ ok: false, text: 'Password must be at least 6 characters.' }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/credentials`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, isActive: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: 'Login is ready. Share the username & password with the customer.' });
        onChange();
      } else {
        setMsg({ ok: false, text: data.error || 'Failed to set credentials.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const copyCreds = () => {
    navigator.clipboard.writeText(`Username: ${email}\nPassword: ${pwd}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
        <KeyRound size={16} className="text-kcc-green" /> Login Access
      </h2>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-dark-400 mb-1">Username (email)</label>
          <div className="px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-200 font-mono break-all">{email}</div>
        </div>

        <div>
          <label className="block text-xs text-dark-400 mb-1">Set / reset password</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Type or generate a password"
              className="flex-1 px-3 py-2 text-sm bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
            />
            <button type="button" onClick={genPassword} className="px-2.5 py-2 text-xs text-dark-300 border border-dark-700 rounded-lg hover:text-kcc-green hover:border-kcc-green/40" title="Generate">Gen</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${isActive ? 'bg-green-500/10 text-green-400' : 'bg-dark-700 text-dark-400'}`}>
            {isActive ? 'Login enabled' : 'Login disabled'}
          </span>
        </div>

        {msg && (
          <div className={`flex items-start gap-2 text-xs ${msg.ok ? 'text-kcc-green' : 'text-red-400'}`}>
            {msg.ok ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-dark-950 bg-kcc-green hover:bg-kcc-green-light rounded-lg transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Set credentials
          </button>
          {pwd && (
            <button type="button" onClick={copyCreds} className="px-3 py-2 text-sm text-dark-300 border border-dark-700 rounded-lg hover:text-kcc-green hover:border-kcc-green/40" title="Copy username + password">
              {copied ? <Check size={14} className="text-kcc-green" /> : <Copy size={14} />}
            </button>
          )}
        </div>
        <p className="text-[11px] text-dark-500">The customer signs in at <span className="text-dark-300">/login</span> and can then request samples & bulk orders.</p>
      </div>
    </div>
  );
}
