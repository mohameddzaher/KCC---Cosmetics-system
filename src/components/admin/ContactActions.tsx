'use client';

import { Phone, Mail, MessageCircle, Globe } from 'lucide-react';

interface ContactActionsProps {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  size?: number;
  className?: string;
  /** When set, log the interaction (e.g. open an activity) on click */
  onInteract?: (channel: 'call' | 'whatsapp' | 'email' | 'website') => void;
}

const digitsOnly = (v?: string) => (v ? v.replace(/[^\d]/g, '') : '');

const normalizeUrl = (v?: string) => {
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

export default function ContactActions({
  phone, whatsapp, email, website, size = 16, className = '', onInteract,
}: ContactActionsProps) {
  const wa = digitsOnly(whatsapp || phone);
  const tel = (phone || whatsapp || '').replace(/\s+/g, '');
  const site = normalizeUrl(website);

  const base =
    'inline-flex items-center justify-center w-8 h-8 rounded-lg border border-dark-700 transition-colors';

  return (
    <div className={`flex items-center gap-1.5 ${className}`} onClick={(e) => e.stopPropagation()}>
      {tel ? (
        <a
          href={`tel:${tel}`}
          onClick={() => onInteract?.('call')}
          title={`Call ${phone || whatsapp}`}
          aria-label="Call"
          className={`${base} text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/40`}
        >
          <Phone size={size} />
        </a>
      ) : null}

      {wa ? (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onInteract?.('whatsapp')}
          title="Chat on WhatsApp"
          aria-label="WhatsApp"
          className={`${base} text-green-400 hover:bg-green-500/10 hover:border-green-500/40`}
        >
          <MessageCircle size={size} />
        </a>
      ) : null}

      {email ? (
        <a
          href={`mailto:${email}`}
          onClick={() => onInteract?.('email')}
          title={`Email ${email}`}
          aria-label="Email"
          className={`${base} text-kcc-green hover:bg-kcc-green/10 hover:border-kcc-green/40`}
        >
          <Mail size={size} />
        </a>
      ) : null}

      {site ? (
        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onInteract?.('website')}
          title="Open website"
          aria-label="Website"
          className={`${base} text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/40`}
        >
          <Globe size={size} />
        </a>
      ) : null}
    </div>
  );
}
