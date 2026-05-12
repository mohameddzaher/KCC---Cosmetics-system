'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Award, Users, Globe2, Sparkles, Shield } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

interface TeamMember {
  _id: string;
  name: string;
  role: { en: string; ar: string };
  image: string;
  section: 'leadership' | 'team';
  order: number;
}

export default function AboutPage() {
  const { t, locale } = useLanguage();
  const [leaders, setLeaders] = useState<TeamMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetch('/api/team')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLeaders(data.filter((m: TeamMember) => m.section === 'leadership'));
          setTeamMembers(data.filter((m: TeamMember) => m.section === 'team'));
        }
      })
      .catch(() => {
        // Fallback: use static data if API not available
      });
  }, []);

  const values = [
    { icon: Award, title: t('about.excellence'), description: t('about.excellenceDesc') },
    { icon: Shield, title: t('about.integrity'), description: t('about.integrityDesc') },
    { icon: Sparkles, title: t('about.innovation'), description: t('about.innovationDesc') },
    { icon: Globe2, title: t('about.sustainability'), description: t('about.sustainabilityDesc') },
  ];

  const stats = [
    { number: '15+', label: t('about.yearsExp') },
    { number: '500+', label: t('about.productsLaunched') },
    { number: '200+', label: t('about.happyClients') },
    { number: '12', label: t('about.countriesServed') },
  ];

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero Section */}
      <section className="relative pt-8 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-kcc-rose-light/40 blur-[120px]" />
        <div className="absolute bottom-0 -right-32 w-80 h-80 rounded-full bg-kcc-beige-light/45 blur-[100px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-kcc-beige-dark border border-kcc-beige/55 rounded-full bg-kcc-beige-light/35 mb-6">
              {t('about.title')}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink-700 mb-6">
              {t('about.title')}
            </h1>
            <p className="text-lg text-cream-800 max-w-2xl mx-auto leading-relaxed">
              {t('about.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-ink-700 mb-6">{t('about.ourStory')}</h2>
              <div className="space-y-4 text-cream-800 leading-relaxed">
                <p>{t('about.storyP1')}</p>
                <p>{t('about.storyP2')}</p>
                <p>{t('about.storyP3')}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-cream-400">
                <img
                  src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80"
                  alt="KCC cosmetics laboratory with advanced equipment"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 border-y border-cream-300">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-kcc-green mb-2">{stat.number}</p>
              <p className="text-sm text-cream-700">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 bg-white border border-cream-300 shadow-soft rounded-2xl"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-kcc-green/15 text-kcc-green mb-5">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold text-ink-700 mb-3">{t('about.ourMission')}</h3>
              <p className="text-cream-800 leading-relaxed">
                {t('about.missionDesc')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="p-8 bg-white border border-cream-300 shadow-soft rounded-2xl"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-kcc-beige-light/55 text-kcc-beige-dark mb-5">
                <Eye size={24} />
              </div>
              <h3 className="text-xl font-bold text-ink-700 mb-3">{t('about.ourVision')}</h3>
              <p className="text-cream-800 leading-relaxed">
                {t('about.visionDesc')}
              </p>
            </motion.div>
          </div>

          {/* Values */}
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-700 mb-3">{t('about.ourValues')}</h2>
            <p className="text-cream-700">{t('about.valuesSubtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 bg-white border border-cream-300 shadow-soft rounded-xl hover:border-cream-400 transition-colors"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-kcc-green/15 text-kcc-green mb-4">
                    <Icon size={20} />
                  </div>
                  <h4 className="text-lg font-semibold text-ink-700 mb-2">{value.title}</h4>
                  <p className="text-sm text-cream-700 leading-relaxed">{value.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Leadership Section — CEO Only */}
      <section className="py-20 px-4 border-t border-cream-300">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-700 mb-3">{t('about.leadershipTeam')}</h2>
            <p className="text-cream-700">{t('about.leadershipSubtitle')}</p>
          </div>
          <div className="max-w-xs mx-auto">
            {leaders.length > 0 ? (
              leaders.map((member, i) => (
                <motion.div
                  key={member._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 bg-white border border-cream-300 shadow-soft rounded-xl"
                >
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 border-2 border-cream-400">
                    {member.image ? (
                      <Image
                        src={member.image}
                        alt={member.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-kcc-green/15 flex items-center justify-center">
                        <Users size={32} className="text-kcc-green" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-ink-700 mb-1">{member.name}</h4>
                  <p className="text-sm text-cream-700">{member.role[locale]}</p>
                </motion.div>
              ))
            ) : (
              /* Fallback static CEO */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center p-6 bg-white border border-cream-300 shadow-soft rounded-xl"
              >
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 border-2 border-cream-400">
                  <Image
                    src="/images/mohamedsalah.jpeg"
                    alt="Dr. Mohamed Salah"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="font-semibold text-ink-700 mb-1">Dr. Mohamed Salah</h4>
                <p className="text-sm text-cream-700">{t('about.ceoFounder')}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Our Team Section */}
      <section className="py-20 px-4 border-t border-cream-300">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-700 mb-3">{t('about.ourTeam')}</h2>
            <p className="text-cream-700">{t('about.ourTeamSubtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {teamMembers.length > 0 ? (
              teamMembers.map((member, i) => (
                <motion.div
                  key={member._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 bg-white border border-cream-300 shadow-soft rounded-xl hover:border-cream-400 transition-colors"
                >
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 border-2 border-cream-400">
                    {member.image ? (
                      <Image
                        src={member.image}
                        alt={member.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-kcc-green/15 flex items-center justify-center">
                        <Users size={28} className="text-kcc-green" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-ink-700 mb-1">{member.name}</h4>
                  <p className="text-sm text-cream-700">{member.role[locale]}</p>
                </motion.div>
              ))
            ) : (
              /* Fallback static team */
              [
                { name: 'Heba Essam', role: t('about.commercialManager'), image: '/images/heba.jpg' },
                { name: 'Rawan Ashraf', role: t('about.marketingStrategist'), image: '/images/rawan.jpg' },
                { name: 'Fadwa Alaa', role: t('about.marketingAnalyst'), image: '/images/fadwa.jpg' },
                { name: 'Youssra El-Gendy', role: t('about.seniorKeyAccountManager'), image: '/images/youssra.jpg' },
                { name: 'Marianne Georges', role: t('about.projectManager'), image: '/images/marianne.jpg' },
                { name: 'Maryam Zarie', role: t('about.registrationLegalSpecialist'), image: '/images/maryam.jpg' },
              ].map((member, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 bg-white border border-cream-300 shadow-soft rounded-xl hover:border-cream-400 transition-colors"
                >
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 border-2 border-cream-400">
                    <Image
                      src={member.image}
                      alt={member.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-semibold text-ink-700 mb-1">{member.name}</h4>
                  <p className="text-sm text-cream-700">{member.role}</p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
