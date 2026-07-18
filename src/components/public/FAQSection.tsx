'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FAQItem {
  question: { en: string; ar: string };
  answer: { en: string; ar: string };
}

const faqItems: FAQItem[] = [
  {
    question: {
      en: 'What services does KCC offer?',
      ar: 'ما هي الخدمات التي تقدمها KCC؟',
    },
    answer: {
      en: 'KCC provides comprehensive cosmetics manufacturing services including private label production, custom formulation development, quality testing, packaging solutions, regulatory compliance support, and logistics & export services across the MENA region and beyond.',
      ar: 'تقدم KCC خدمات تصنيع مستحضرات التجميل الشاملة بما في ذلك إنتاج العلامة الخاصة، وتطوير التركيبات المخصصة، واختبارات الجودة، وحلول التغليف، ودعم الامتثال التنظيمي، والخدمات اللوجستية والتصدير عبر منطقة الشرق الأوسط وشمال أفريقيا وخارجها.',
    },
  },
  {
    question: {
      en: 'What is the minimum order quantity?',
      ar: 'ما هو الحد الأدنى لكمية الطلب؟',
    },
    answer: {
      en: 'Our minimum order quantities vary depending on the product type and formulation complexity. Typically, our MOQ starts from 1,000 units for most products. We work with you to find the best solution that fits your business needs and budget.',
      ar: 'تختلف الحد الأدنى لكميات الطلب لدينا حسب نوع المنتج وتعقيد التركيبة. عادةً ما يبدأ الحد الأدنى للطلب من 1,000 وحدة لمعظم المنتجات. نعمل معك لإيجاد أفضل حل يناسب احتياجات عملك وميزانيتك.',
    },
  },
  {
    question: {
      en: 'How long does sample development take?',
      ar: 'كم يستغرق تطوير العينات؟',
    },
    answer: {
      en: 'Sample development typically takes 2-4 weeks depending on the complexity of the formulation. This includes initial formulation, stability testing, and any revisions. We ensure every sample meets your exact specifications before moving to production.',
      ar: 'يستغرق تطوير العينات عادةً من 2 إلى 4 أسابيع حسب تعقيد التركيبة. يشمل ذلك التركيب الأولي واختبار الثبات وأي تعديلات. نضمن أن كل عينة تلبي مواصفاتك الدقيقة قبل الانتقال إلى الإنتاج.',
    },
  },
  {
    question: {
      en: 'What certifications does KCC have?',
      ar: 'ما هي الشهادات التي تمتلكها KCC؟',
    },
    answer: {
      en: 'KCC holds ISO 22716 (Cosmetics GMP), SFDA approval, and GMP certification. Our facilities and processes meet international standards for cosmetics manufacturing, ensuring the highest quality and safety for all products we produce.',
      ar: 'تحمل KCC شهادة ISO 22716 (ممارسات التصنيع الجيدة لمستحضرات التجميل)، وموافقة هيئة الغذاء والدواء السعودية (SFDA)، وشهادة GMP. تلبي مرافقنا وعملياتنا المعايير الدولية لتصنيع مستحضرات التجميل.',
    },
  },
  {
    question: {
      en: 'Which countries do you serve?',
      ar: 'ما هي الدول التي تخدمونها؟',
    },
    answer: {
      en: 'We serve clients across the GCC countries (Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman), the broader MENA region, and have expanded our reach to markets in Africa, Europe, and Asia. Our regulatory expertise covers multiple international markets.',
      ar: 'نخدم العملاء في جميع دول مجلس التعاون الخليجي (السعودية، الإمارات، الكويت، قطر، البحرين، عمان)، ومنطقة الشرق الأوسط وشمال أفريقيا الأوسع، وقد وسعنا نطاقنا ليشمل أسواق أفريقيا وأوروبا وآسيا.',
    },
  },
  {
    question: {
      en: 'Can I get a custom formulation?',
      ar: 'هل يمكنني الحصول على تركيبة مخصصة؟',
    },
    answer: {
      en: 'Absolutely! Custom formulation is one of our core strengths. Our experienced team of chemists works closely with you to develop unique formulas tailored to your brand vision, target audience, and market requirements. We can create products from scratch or modify existing formulations.',
      ar: 'بالتأكيد! التركيبات المخصصة هي إحدى نقاط قوتنا الأساسية. يعمل فريقنا من الكيميائيين ذوي الخبرة معك عن كثب لتطوير تركيبات فريدة مصممة خصيصاً لرؤية علامتك التجارية وجمهورك المستهدف ومتطلبات السوق.',
    },
  },
  {
    question: {
      en: 'What is the typical production timeline?',
      ar: 'ما هو الجدول الزمني النموذجي للإنتاج؟',
    },
    answer: {
      en: 'A typical production run takes 4-8 weeks from order confirmation to delivery. This includes raw material procurement, manufacturing, quality control testing, packaging, and shipping. Timelines may vary based on order volume and product complexity.',
      ar: 'يستغرق الإنتاج النموذجي من 4 إلى 8 أسابيع من تأكيد الطلب حتى التسليم. يشمل ذلك شراء المواد الخام والتصنيع واختبارات مراقبة الجودة والتغليف والشحن. قد تختلف الجداول الزمنية بناءً على حجم الطلب وتعقيد المنتج.',
    },
  },
  {
    question: {
      en: 'Do you offer packaging design services?',
      ar: 'هل تقدمون خدمات تصميم التغليف؟',
    },
    answer: {
      en: 'Yes, we offer comprehensive packaging solutions including design consultation, material sourcing, and packaging production. Our team can help you create premium packaging that aligns with your brand identity and stands out on the shelf.',
      ar: 'نعم، نقدم حلول تغليف شاملة تشمل استشارات التصميم وتوفير المواد وإنتاج التغليف. يمكن لفريقنا مساعدتك في إنشاء تغليف متميز يتوافق مع هوية علامتك التجارية ويبرز على الرف.',
    },
  },
];

export default function FAQSection() {
  const { locale } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [list, setList] = useState<FAQItem[]>(faqItems);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/faqs', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setList(data.map((f: any) => ({ question: f.question || { en: '', ar: '' }, answer: f.answer || { en: '', ar: '' } })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const sectionTitle = {
    en: 'Frequently Asked Questions',
    ar: 'الأسئلة الشائعة',
  };

  const sectionSubtitle = {
    en: 'Find answers to the most common questions about our services, processes, and capabilities.',
    ar: 'اعثر على إجابات لأكثر الأسئلة شيوعاً حول خدماتنا وعملياتنا وقدراتنا.',
  };

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative py-12 lg:py-16 bg-cream-50 overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 start-0 w-96 h-96 bg-kcc-rose-light/40 rounded-full blur-[200px]" />
      <div className="absolute bottom-0 end-0 w-80 h-80 bg-kcc-beige-light/35 rounded-full blur-[180px]" />
      <div className="absolute inset-0 noise-soft pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-[11px] uppercase tracking-[0.25em] chip-champagne rounded-full font-medium">
            <HelpCircle size={12} />
            {locale === 'ar' ? 'مركز المساعدة' : 'Help Center'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            <span className="gradient-text">
              {locale === 'ar' ? sectionTitle.ar : sectionTitle.en}
            </span>
          </h2>
          <p className="text-cream-700 text-base sm:text-lg max-w-2xl mx-auto">
            {locale === 'ar' ? sectionSubtitle.ar : sectionSubtitle.en}
          </p>
        </motion.div>

        {/* FAQ Items */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          {list.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className={`group rounded-2xl bg-white/85 backdrop-blur-sm border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'border-kcc-rose-dark/40 shadow-soft'
                    : 'border-cream-300 hover:border-kcc-beige/50 hover:shadow-soft'
                }`}
              >
                {/* Question Button */}
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-start"
                >
                  <span className="text-sm sm:text-base font-semibold text-ink-700 leading-relaxed">
                    {locale === 'ar' ? item.question.ar : item.question.en}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      isOpen ? 'bg-kcc-rose-light/50 text-kcc-rose-dark' : 'bg-cream-200 text-cream-700'
                    }`}
                  >
                    <ChevronDown size={18} />
                  </motion.div>
                </button>

                {/* Answer Panel */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                        <div className="divider-soft mb-4" />
                        <p className="text-sm text-cream-800 leading-relaxed">
                          {locale === 'ar' ? item.answer.ar : item.answer.en}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
