'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X, Calendar, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Certificate {
  id: string;
  title: string;
  titleAr: string;
  issuer: string;
  issuerAr: string;
  date: string;
  description: string;
  descriptionAr: string;
  category: string;
  categoryAr: string;
  image: string;
}

const certificates: Certificate[] = [
  {
    id: '1',
    title: 'ISO 45001:2018 OHS',
    titleAr: 'آيزو 45001:2018 - نظام إدارة السلامة والصحة المهنية',
    issuer: 'International Organization for Standardization',
    issuerAr: 'المنظمة الدولية للمعايير',
    date: '2023-01-15',
    description: 'Occupational Health & Safety Management System. This certification demonstrates our commitment to providing a safe and healthy workplace for all employees, preventing work-related injuries and health issues, and continually improving our OHS performance across all manufacturing operations.',
    descriptionAr: 'نظام إدارة السلامة والصحة المهنية. تُظهر هذه الشهادة التزامنا بتوفير بيئة عمل آمنة وصحية لجميع الموظفين، ومنع الإصابات والمشاكل الصحية المرتبطة بالعمل، والتحسين المستمر لأداء السلامة والصحة المهنية في جميع عمليات التصنيع.',
    category: 'Safety',
    categoryAr: 'السلامة',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  },
  {
    id: '2',
    title: 'ISO 22000:2018 FSSC',
    titleAr: 'آيزو 22000:2018 - نظام إدارة سلامة الغذاء',
    issuer: 'International Organization for Standardization',
    issuerAr: 'المنظمة الدولية للمعايير',
    date: '2023-06-20',
    description: 'Food Safety Management System (FSSC). This certification ensures that our manufacturing processes comply with the highest food safety standards, including hazard analysis and critical control points (HACCP) principles, applicable to cosmetics that may come in contact with skin and oral products.',
    descriptionAr: 'نظام إدارة سلامة الغذاء (FSSC). تضمن هذه الشهادة أن عمليات التصنيع لدينا تتوافق مع أعلى معايير سلامة الغذاء، بما في ذلك مبادئ تحليل المخاطر ونقاط التحكم الحرجة (HACCP)، والتي تنطبق على مستحضرات التجميل التي قد تلامس الجلد ومنتجات العناية بالفم.',
    category: 'Food Safety',
    categoryAr: 'سلامة الغذاء',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80',
  },
  {
    id: '3',
    title: 'ISO 9001:2015 QMS',
    titleAr: 'آيزو 9001:2015 - نظام إدارة الجودة',
    issuer: 'International Organization for Standardization',
    issuerAr: 'المنظمة الدولية للمعايير',
    date: '2023-03-10',
    description: 'Quality Management System. This globally recognized certification demonstrates our systematic approach to quality management, ensuring consistent product quality, customer satisfaction, and continuous improvement across all our manufacturing and business processes.',
    descriptionAr: 'نظام إدارة الجودة. تُظهر هذه الشهادة المعترف بها عالمياً نهجنا المنظم لإدارة الجودة، مما يضمن جودة منتج متسقة ورضا العملاء والتحسين المستمر في جميع عمليات التصنيع والأعمال لدينا.',
    category: 'Quality',
    categoryAr: 'الجودة',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
  },
  {
    id: '4',
    title: 'ISO 14001:2015 EHS',
    titleAr: 'آيزو 14001:2015 - نظام الإدارة البيئية',
    issuer: 'International Organization for Standardization',
    issuerAr: 'المنظمة الدولية للمعايير',
    date: '2023-09-05',
    description: 'Environmental Management System. This certification demonstrates our structured approach to minimizing environmental impact, managing waste responsibly, reducing carbon footprint, and continually improving our environmental performance in cosmetics manufacturing.',
    descriptionAr: 'نظام الإدارة البيئية. تُظهر هذه الشهادة نهجنا المنظم لتقليل التأثير البيئي، وإدارة النفايات بمسؤولية، وتقليل البصمة الكربونية، والتحسين المستمر لأدائنا البيئي في تصنيع مستحضرات التجميل.',
    category: 'Environment',
    categoryAr: 'البيئة',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
  },
];

export default function CertificatesPage() {
  const { t, locale } = useLanguage();
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [list, setList] = useState<Certificate[]>(certificates);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/certificates', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setList(
          data.map((c: any, i: number) => ({
            id: c._id || String(i),
            title: c.title?.en || '',
            titleAr: c.title?.ar || '',
            issuer: c.issuer?.en || '',
            issuerAr: c.issuer?.ar || '',
            date: c.issuedDate || '',
            description: c.description?.en || '',
            descriptionAr: c.description?.ar || '',
            category: 'Certification',
            categoryAr: 'شهادة',
            image: c.imageUrl || certificates[i % certificates.length].image,
          }))
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const getTitle = (cert: Certificate) => locale === 'ar' ? cert.titleAr : cert.title;
  const getIssuer = (cert: Certificate) => locale === 'ar' ? cert.issuerAr : cert.issuer;
  const getDescription = (cert: Certificate) => locale === 'ar' ? cert.descriptionAr : cert.description;
  const getCategory = (cert: Certificate) => locale === 'ar' ? cert.categoryAr : cert.category;

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <section className="relative pt-8 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />
        <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-kcc-rose-light/40 blur-[120px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink-700 mb-4">{t('certificates.title')}</h1>
            <p className="text-lg text-cream-800">{t('certificates.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Certificates Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6">
            {list.map((cert, i) => (
              <motion.button
                key={cert.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelected(cert)}
                className="text-start p-6 bg-white border border-cream-300 shadow-soft rounded-2xl hover:border-cream-400 hover:bg-white/90 transition-all duration-300 group"
              >
                {/* Certificate image */}
                <div className="aspect-[3/2] rounded-xl overflow-hidden border border-cream-400 mb-5 relative">
                  <img
                    src={cert.image}
                    alt={getTitle(cert)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cream-50/75 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Award size={40} className="text-kcc-green/70 drop-shadow-lg group-hover:text-kcc-green transition-colors" />
                  </div>
                </div>

                {/* Category badge */}
                <span className="inline-block text-xs font-medium text-kcc-beige-dark bg-kcc-beige/10 px-2.5 py-1 rounded-full mb-3">
                  {getCategory(cert)}
                </span>

                {/* Title */}
                <h3 className="text-lg font-semibold text-ink-700 mb-2 group-hover:text-kcc-green transition-colors">
                  {getTitle(cert)}
                </h3>

                {/* Issuer & Date */}
                <div className="flex items-center gap-3 text-xs text-cream-700">
                  <span className="flex items-center gap-1">
                    <Building2 size={12} />
                    {getIssuer(cert)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(cert.date).getFullYear()}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white border border-cream-300 rounded-2xl overflow-hidden"
            >
              {/* Header image */}
              <div className="aspect-[2/1] relative overflow-hidden">
                <img
                  src={selected.image}
                  alt={getTitle(selected)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cream-100/80 to-cream-100/30" />
                <Award size={64} className="text-kcc-green/70 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" />
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="absolute top-4 end-4 p-2 bg-white/95 rounded-lg text-cream-700 hover:text-ink-700 transition-colors"
                  title={t('common.close')}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <span className="inline-block text-xs font-medium text-kcc-beige-dark bg-kcc-beige/10 px-2.5 py-1 rounded-full mb-3">
                  {getCategory(selected)}
                </span>
                <h2 className="text-xl font-bold text-ink-700 mb-2">{getTitle(selected)}</h2>
                <div className="flex items-center gap-4 text-sm text-cream-700 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} />
                    {getIssuer(selected)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(selected.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-cream-800 leading-relaxed text-sm">{getDescription(selected)}</p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mt-6 px-5 py-2.5 border border-cream-400 text-cream-800 hover:text-ink-700 hover:border-cream-500 rounded-xl transition-colors text-sm"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
