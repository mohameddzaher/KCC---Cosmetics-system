'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ListChecks, Boxes, ArrowRight, Sparkles } from 'lucide-react';

export default function SampleQuizAdminLanding() {
  const [counts, setCounts] = useState({ questions: 0, products: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/sample-quiz/brief-questions').then((r) => r.json()),
      fetch('/api/sample-quiz/product-config').then((r) => r.ok ? r.json() : { configs: [] }),
    ]).then(([qs, pc]) => {
      setCounts({
        questions: Array.isArray(qs) ? qs.length : 0,
        products: Array.isArray(pc.configs) ? pc.configs.length : 0,
      });
    }).catch(() => {});
  }, []);

  const cards = [
    {
      key: 'questions',
      title: 'Brief Questions',
      desc: 'The 12 questions customers answer before picking a category. Add, reorder, edit options, set conditions.',
      href: '/admin/sample-quiz/questions',
      Icon: ListChecks,
      stat: `${counts.questions} active`,
      color: 'from-kcc-rose-light/40 to-kcc-rose/15',
    },
    {
      key: 'products',
      title: 'Product Spec Configs',
      desc: 'For every product (level-3 item) decide which spec categories show, which options are allowed, and the rules.',
      href: '/admin/sample-quiz/products',
      Icon: Boxes,
      stat: `${counts.products} configured`,
      color: 'from-kcc-beige-light/40 to-kcc-beige/15',
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="text-kcc-rose" size={18} />
        <p className="text-[11px] uppercase tracking-[0.32em] text-dark-400 font-medium">
          Sample Quiz Engine
        </p>
      </div>
      <h1 className="text-3xl font-bold text-dark-50 mb-2">Quiz Configuration</h1>
      <p className="text-dark-400 mb-10 max-w-xl">
        Everything that powers the customer-facing Sample quiz. Edits are reflected on the site instantly — no caching.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {cards.map((c) => {
          const Icon = c.Icon;
          return (
            <motion.div key={c.key} whileHover={{ y: -3 }}>
              <Link
                href={c.href}
                className={`group block relative overflow-hidden rounded-2xl border border-dark-700 bg-dark-900 p-7 hover:border-kcc-rose/40 transition-all`}
              >
                <div className={`absolute inset-0 -z-0 bg-gradient-to-br ${c.color} opacity-30 group-hover:opacity-60 transition-opacity`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-kcc-rose/15 text-kcc-rose flex items-center justify-center">
                      <Icon size={22} />
                    </div>
                    <span className="text-xs font-mono text-dark-400">{c.stat}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-dark-50 mb-2">{c.title}</h2>
                  <p className="text-sm text-dark-400 mb-6 leading-relaxed">{c.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm text-kcc-rose font-medium group-hover:gap-2.5 transition-all">
                    Manage <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 p-5 rounded-2xl border border-dark-700 bg-dark-900/60">
        <p className="text-xs uppercase tracking-[0.22em] text-kcc-beige mb-2">Live preview</p>
        <p className="text-sm text-dark-300">
          Open the customer quiz at <Link href="/order/sample" target="_blank" className="text-kcc-rose underline">/order/sample</Link> in a new tab — refresh after saving an admin change to see it apply instantly.
        </p>
      </div>
    </div>
  );
}
