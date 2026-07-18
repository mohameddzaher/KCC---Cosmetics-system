'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHero from '@/components/public/PageHero';

const tabs = [
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms of Service' },
];

export default function PoliciesPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('privacy');

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <PageHero
        title="Policies"
        subtitle="Legal information and policies"
        image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80"
      />

      {/* Content */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 border-b border-cream-300 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  activeTab === tab.key
                    ? 'bg-kcc-green text-white shadow-lg shadow-kcc-green/20'
                    : 'text-cream-700 hover:text-ink-700 hover:bg-blush-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-cream-300 shadow-soft rounded-2xl p-6 sm:p-8"
          >
            {activeTab === 'privacy' && (
              <div className="space-y-6 text-cream-800 leading-relaxed text-sm">
                <h2 className="text-2xl font-bold text-ink-700">{t('footer.privacy')}</h2>
                <p className="text-cream-700">Last updated: January 1, 2024</p>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">1. Information We Collect</h3>
                  <p>
                    KCC - Saudi Company for Cosmetics (&quot;KCC&quot;, &quot;we&quot;, &quot;our&quot;) collects information
                    that you provide directly to us, including your name, email address, phone number,
                    company name, and any other information you choose to provide when using our services.
                  </p>
                  <p>
                    We also automatically collect certain information when you visit our website, including
                    your IP address, browser type, operating system, referring URLs, and information about
                    how you interact with our website.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">2. How We Use Your Information</h3>
                  <p>We use the information we collect to:</p>
                  <ul className="space-y-2 ms-4">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-kcc-green mt-2 shrink-0" />
                      Process and fulfill your orders and sample requests
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-kcc-green mt-2 shrink-0" />
                      Communicate with you about your orders and our services
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-kcc-green mt-2 shrink-0" />
                      Improve our website and services
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-kcc-green mt-2 shrink-0" />
                      Comply with legal obligations
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">3. Data Security</h3>
                  <p>
                    We implement appropriate technical and organizational measures to protect your personal
                    information against unauthorized access, alteration, disclosure, or destruction. However,
                    no method of transmission over the Internet is 100% secure.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">4. Data Retention</h3>
                  <p>
                    We retain your personal information for as long as necessary to fulfill the purposes for
                    which it was collected, including to satisfy any legal, accounting, or reporting requirements.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">5. Your Rights</h3>
                  <p>
                    You have the right to access, correct, or delete your personal information. You may also
                    have the right to restrict or object to certain processing of your data. To exercise these
                    rights, please contact us at privacy@kcc.sa.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">6. Contact Us</h3>
                  <p>
                    If you have any questions about this Privacy Policy, please contact us at:
                    <br />
                    Email: privacy@kcc.sa
                    <br />
                    Phone: +966 11 XXX XXXX
                    <br />
                    Address: Riyadh, Kingdom of Saudi Arabia
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-6 text-cream-800 leading-relaxed text-sm">
                <h2 className="text-2xl font-bold text-ink-700">{t('footer.terms')}</h2>
                <p className="text-cream-700">Last updated: January 1, 2024</p>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">1. Acceptance of Terms</h3>
                  <p>
                    By accessing and using the KCC website and services, you accept and agree to be bound by
                    these Terms of Service. If you do not agree to these terms, please do not use our services.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">2. Services</h3>
                  <p>
                    KCC provides cosmetics manufacturing services including but not limited to: private label
                    manufacturing, contract manufacturing, formulation development, sample production, and
                    bulk production. All services are subject to availability and our acceptance of your order.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">3. Orders and Payment</h3>
                  <p>
                    All orders placed through our website are subject to acceptance and confirmation. We reserve
                    the right to refuse any order. Payment terms will be specified in the quotation provided for
                    each order. Prices are subject to change without prior notice.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">4. Intellectual Property</h3>
                  <p>
                    All formulations developed by KCC remain the intellectual property of KCC unless otherwise
                    agreed in writing. Custom formulations developed for clients under contract may be subject
                    to separate intellectual property agreements.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">5. Limitation of Liability</h3>
                  <p>
                    KCC shall not be liable for any indirect, incidental, special, consequential, or punitive
                    damages arising out of or related to your use of our services. Our total liability shall not
                    exceed the amount paid by you for the specific order giving rise to the claim.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">6. Governing Law</h3>
                  <p>
                    These Terms shall be governed by and construed in accordance with the laws of the Kingdom
                    of Saudi Arabia. Any disputes arising from these terms shall be subject to the exclusive
                    jurisdiction of the courts in Riyadh, Saudi Arabia.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-ink-700">7. Contact</h3>
                  <p>
                    For questions about these Terms of Service, please contact us at:
                    <br />
                    Email: legal@kcc.sa
                    <br />
                    Phone: +966 11 XXX XXXX
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
