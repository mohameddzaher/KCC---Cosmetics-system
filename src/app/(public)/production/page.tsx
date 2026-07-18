'use client';

import { motion } from 'framer-motion';
import PageHero from '@/components/public/PageHero';
import {
  FlaskConical, Microscope, Shield, Beaker, Settings, TestTube,
  Layers, Cog, Sparkles, CheckCircle2, Cpu, FileSearch
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const labCapabilities = [
  { icon: FlaskConical, title: 'Emulsion Manufacturing', description: 'Advanced hot and cold emulsion processing for creams, lotions, and serums with precise temperature control.' },
  { icon: Beaker, title: 'Formulation Development', description: 'Custom formulation from scratch or matching existing products with our expert cosmetic chemists.' },
  { icon: TestTube, title: 'Active Ingredient Integration', description: 'Specialized techniques for encapsulation, liposomal delivery, and active ingredient stabilization.' },
  { icon: Layers, title: 'Multi-Phase Processing', description: 'Complex multi-phase production including oil-in-water, water-in-oil, and silicone-based formulations.' },
  { icon: Cog, title: 'Scale-Up Services', description: 'Seamless transition from lab-scale formulation to full production batches with consistent quality.' },
  { icon: Cpu, title: 'Automated Production Lines', description: 'State-of-the-art automated filling, capping, labeling, and packaging systems.' },
];

const qaProcesses = [
  { icon: Microscope, title: 'Microbiological Testing', description: 'Comprehensive microbial testing including challenge tests and preservative efficacy testing.' },
  { icon: Shield, title: 'Stability Studies', description: 'Accelerated and real-time stability testing under ICH-guided conditions for shelf life determination.' },
  { icon: FileSearch, title: 'Raw Material Inspection', description: 'Rigorous incoming inspection of all raw materials and packaging components before production use.' },
  { icon: CheckCircle2, title: 'In-Process Controls', description: 'Continuous monitoring at every production stage including pH, viscosity, and appearance checks.' },
];

const rdHighlights = [
  { title: 'Custom Formulation', description: 'Develop unique formulations tailored to your brand identity and target market.' },
  { title: 'Trend Analysis', description: 'Stay ahead with formulations inspired by the latest global beauty trends and innovations.' },
  { title: 'Ingredient Sourcing', description: 'Access to premium raw materials from trusted global suppliers with full traceability.' },
  { title: 'Regulatory Support', description: 'Navigate GCC and international regulatory requirements with our compliance experts.' },
  { title: 'Pilot Production', description: 'Small-batch production runs for testing and validation before full-scale manufacturing.' },
  { title: 'Performance Testing', description: 'In-vitro and sensory evaluation to validate product claims and performance metrics.' },
];

export default function ProductionPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <PageHero
        title={t('production.title')}
        subtitle={t('production.subtitle')}
        image="https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?w=1600&q=80"
      />

      {/* Featured Image Banner */}
      <section className="px-4 -mt-4 mb-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          >
            <div className="aspect-video rounded-2xl overflow-hidden border border-cream-300">
              <img
                src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80"
                alt="Cosmetics laboratory with advanced formulation equipment"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="aspect-video rounded-2xl overflow-hidden border border-cream-300">
              <img
                src="https://images.unsplash.com/photo-1581093458791-9f3c3250a8b0?w=800&q=80"
                alt="Manufacturing facility with production lines"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="aspect-video rounded-2xl overflow-hidden border border-cream-300 sm:col-span-2 md:col-span-1">
              <img
                src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80"
                alt="Quality testing laboratory equipment"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lab Capabilities */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-700 mb-3">Lab & Manufacturing Capabilities</h2>
            <p className="text-cream-700 max-w-xl mx-auto">
              Our facilities are equipped with cutting-edge technology for every stage of cosmetics production.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {labCapabilities.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 bg-white border border-cream-300 shadow-soft rounded-xl hover:border-cream-400 transition-colors group"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-kcc-green/15 text-kcc-green mb-4 group-hover:bg-kcc-green/20 transition-colors">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-ink-700 mb-2">{item.title}</h3>
                  <p className="text-sm text-cream-700 leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* QA Process */}
      <section className="py-20 px-4 border-y border-cream-300">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-700 mb-3">Quality Assurance Process</h2>
            <p className="text-cream-700 max-w-xl mx-auto">
              Rigorous quality control at every step ensures consistency, safety, and regulatory compliance.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {qaProcesses.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-5 p-6 bg-white border border-cream-300 shadow-soft rounded-xl"
                >
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-kcc-beige-light/55 text-kcc-beige-dark flex items-center justify-center">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-ink-700 mb-2">{item.title}</h3>
                    <p className="text-sm text-cream-700 leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* R&D Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-700 mb-3">Research & Development</h2>
            <p className="text-cream-700 max-w-xl mx-auto">
              Our R&D team drives innovation with cutting-edge formulation science and market trend analysis.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rdHighlights.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-5 bg-white border border-cream-300 shadow-soft rounded-xl hover:border-cream-400 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="text-kcc-green mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-ink-700 mb-1">{item.title}</h4>
                    <p className="text-sm text-cream-700 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
