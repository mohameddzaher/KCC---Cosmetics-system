'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X, Calendar, Building2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHero from '@/components/public/PageHero';
import { onImgError } from '@/lib/imageFallback';
import { useCmsSection } from '@/lib/useCmsSection';
import { useContentList } from '@/lib/useContentList';
import ContentSkeleton from '@/components/public/ContentSkeleton';

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
  /* Editable under Admin -> CMS Manager -> "certifications". */
  const { content: assurance } = useCmsSection('certifications', {
    en: {
      eyebrow: 'What this means for you',
      title: 'Credentials are only useful if they change something',
      lede: 'These are not badges for a footer. Each one changes what we are able to do for a brand, and what a regulator will accept from it.',
      points: [
        {
          title: 'ISO 22716 — Good Manufacturing Practice',
          body: 'Every batch is made to a documented procedure and traceable back to its raw material lots. That record is what a regulator, an auditor or a retailer asks for when something needs explaining.',
        },
        {
          title: 'SFDA-licensed facility',
          body: 'Producing in a licensed facility means your product is documented for Saudi registration from the first batch, rather than being reconstructed for the paperwork after it is made.',
        },
        {
          title: 'Testing before release',
          body: 'Stability, microbiological and pH testing on every formula, with dermatological and SPF testing where the claim needs it. Nothing ships on the strength of a recipe alone.',
        },
      ],
    },
    ar: {
      eyebrow: 'ماذا يعني ذلك لك',
      title: 'الشهادات لا قيمة لها ما لم تغيّر شيئًا',
      lede: 'هذه ليست شارات تُوضع في تذييل الصفحة. كل واحدة منها تغيّر ما نستطيع تقديمه للعلامة التجارية، وما ستقبله الجهة التنظيمية منها.',
      points: [
        {
          title: 'ISO 22716 — ممارسات التصنيع الجيد',
          body: 'كل تشغيلة تُصنَّع وفق إجراء موثّق ويمكن تتبّعها رجوعًا إلى تشغيلات موادها الخام. وهذا السجل هو ما تطلبه الجهة التنظيمية أو المدقّق أو التاجر عند الحاجة لتفسير أي أمر.',
        },
        {
          title: 'منشأة مرخّصة من الهيئة العامة للغذاء والدواء',
          body: 'الإنتاج في منشأة مرخّصة يعني أن منتجك موثّق للتسجيل السعودي من أول دفعة، بدل إعادة تجميع الأوراق بعد التصنيع.',
        },
        {
          title: 'الفحص قبل الإفراج',
          body: 'فحوص الثبات والأحياء الدقيقة ودرجة الحموضة لكل تركيبة، مع الفحص الجلدي وفحص معامل الحماية حين يتطلب الادعاء ذلك. لا شيء يُشحن بالاعتماد على الوصفة وحدها.',
        },
      ],
    },
  });

  const [selected, setSelected] = useState<Certificate | null>(null);
  /*
   * Nothing renders until the real list has answered — the page used to paint
   * four hardcoded certificates and cut back to the two that actually exist.
   */
  const { items: list, ready } = useContentList<Certificate>(
    '/api/content/certificates',
    (c, i) => ({
      id: String(c._id || i),
      title: (c.title as Record<string, string>)?.en || '',
      titleAr: (c.title as Record<string, string>)?.ar || '',
      issuer: (c.issuer as Record<string, string>)?.en || '',
      issuerAr: (c.issuer as Record<string, string>)?.ar || '',
      date: String(c.issuedDate || ''),
      description: (c.description as Record<string, string>)?.en || '',
      descriptionAr: (c.description as Record<string, string>)?.ar || '',
      category: 'Certification',
      categoryAr: 'شهادة',
      image: String(c.imageUrl || certificates[i % certificates.length].image),
    }),
    certificates
  );

  const getTitle = (cert: Certificate) => locale === 'ar' ? cert.titleAr : cert.title;
  const getIssuer = (cert: Certificate) => locale === 'ar' ? cert.issuerAr : cert.issuer;
  const getDescription = (cert: Certificate) => locale === 'ar' ? cert.descriptionAr : cert.description;
  const getCategory = (cert: Certificate) => locale === 'ar' ? cert.categoryAr : cert.category;

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <PageHero
        title={t('certificates.title')}
        subtitle={t('certificates.subtitle')}
        image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80"
      />

      {/* Certificates Grid */}
      <section className="py-12 px-4">
        <div className="page-shell">
          {/*
            Wrapping and centred, capped per card.

            A two-column grid over two certificates gave each one half of a
            1440px page, so a 3:2 image became 780px tall and the card filled
            the screen on its own. These are credentials, not hero imagery:
            the card is capped, the plate stays a modest ratio, and however
            many there are they sit centred rather than stretched.
          */}
          <div className="flex flex-wrap justify-center gap-6">
            {!ready ? (
              <ContentSkeleton count={2} className="flex flex-wrap justify-center gap-6" height="h-80 w-full max-w-[24rem] flex-1 basis-[19rem]" />
            ) : list.map((cert, i) => (
              <motion.button
                key={cert.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelected(cert)}
                className="group w-full max-w-[24rem] flex-1 basis-[19rem] rounded-2xl border border-cream-300 bg-surface p-5 text-start shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-kcc-beige/60 hover:shadow-soft-lg"
              >
                {/* Certificate plate */}
                <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-xl border border-cream-400">
                  <img
                    onError={onImgError}
                    src={cert.image}
                    alt={getTitle(cert)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso-950/45 via-espresso-950/10 to-transparent" />
                  <span className="absolute bottom-3 end-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface/95 shadow-soft backdrop-blur-sm">
                    <Award size={18} className="text-kcc-green" />
                  </span>
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


      {/* What the credentials actually buy you */}
      <section className="border-t border-cream-300 bg-cream-50 py-16 lg:py-20">
        <div className="page-shell">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.3em] text-kcc-rose-dark">
              {assurance.eyebrow}
            </p>
            <h2 className="font-serif text-2xl leading-tight text-ink-800 sm:text-3xl">
              {assurance.title}
            </h2>
            <div className="mx-auto mt-5 h-px w-14 bg-gradient-to-r from-transparent via-kcc-rose-dark/50 to-transparent" />
            <p className="mt-5 text-base leading-relaxed text-cream-800">{assurance.lede}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {assurance.points.map((point: { title: string; body: string }, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="rounded-2xl border border-cream-300 bg-surface p-6"
              >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-kcc-green/10 text-kcc-green">
                  <ShieldCheck size={18} />
                </span>
                <h3 className="mb-2 font-serif text-lg text-ink-800">{point.title}</h3>
                <p className="text-sm leading-relaxed text-cream-800">{point.body}</p>
              </motion.div>
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
              className="w-full max-w-lg bg-surface border border-cream-300 rounded-2xl overflow-hidden"
            >
              {/* Header image */}
              <div className="aspect-[2/1] relative overflow-hidden">
                <img
                  onError={onImgError}
                  src={selected.image}
                  alt={getTitle(selected)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cream-100/80 to-cream-100/30" />
                <Award size={64} className="text-kcc-green/70 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" />
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="absolute top-4 end-4 p-2 bg-surface/95 rounded-lg text-cream-700 hover:text-ink-700 transition-colors"
                  title={t('common.close')}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <span className="inline-block text-xs font-medium text-kcc-beige-dark bg-kcc-beige/10 px-2.5 py-1 rounded-full mb-3">
                  {getCategory(selected)}
                </span>
                <h2 className="font-serif text-xl sm:text-2xl text-ink-800 mb-2">{getTitle(selected)}</h2>
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
