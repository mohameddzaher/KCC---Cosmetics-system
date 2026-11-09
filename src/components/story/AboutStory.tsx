'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ABOUT, HERO, STORY_IMG } from '@/lib/storyContent';
import { Eyebrow, Reveal, Rise, Tilt, WordsReveal, usePick } from './primitives';

/* eslint-disable @next/next/no-img-element -- the story photographs are local, sized webp files */

export function AboutHero() {
  const pick = usePick();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['0%', '20%']);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1.05, 1.15]);
  return (
    <section ref={ref} className="relative isolate -mt-16 flex min-h-[80svh] items-end overflow-hidden bg-[#0a160e] pb-16 pt-32">
      <motion.img src={STORY_IMG('eccbv')} alt="" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover" style={{ y, scale }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0a160e] via-[#0a160e]/60 to-[#0a160e]/20" aria-hidden />
      <div className="page-shell w-full">
        <Eyebrow dark>{pick(HERO.eyebrow)}</Eyebrow>
        <WordsReveal as="h1" text={pick(ABOUT.heroTitle)} className="font-serif text-5xl leading-none text-white sm:text-7xl" />
        <Rise delay={0.5}><p className="mt-5 max-w-2xl font-serif text-2xl italic text-[#DCEBDD]">{pick(ABOUT.heroSub)}</p></Rise>
        <Rise delay={0.7}><p className="mt-3 font-semibold text-kcc-green-light">{pick(HERO.tagline)}</p></Rise>
      </div>
    </section>
  );
}

/** Cairo 1981, Amsterdam 2020, Jeddah 2027: the group's road, drawn as the reader scrolls. */
export function GroupJourney() {
  const pick = usePick();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
  const line = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0, 1]);
  const imgs = ['eccg', 'eccbv', 'plant'];
  return (
    <section className="relative overflow-hidden bg-cream-50 py-20 lg:py-28">
      <div className="page-shell">
        <div className="mb-14 grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <Eyebrow>{pick(ABOUT.group.eyebrow)}</Eyebrow>
            <WordsReveal text={pick(ABOUT.group.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
          </div>
          <Rise delay={0.2}><p className="leading-relaxed text-cream-700">{pick(ABOUT.group.text)}</p></Rise>
        </div>
        <div ref={ref} className="relative">
          <div className="absolute inset-x-0 top-6 hidden h-0.5 bg-cream-300 lg:block" aria-hidden>
            <motion.div className="h-full origin-[0%_50%] bg-kcc-green rtl:origin-[100%_50%]" style={{ scaleX: line }} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {ABOUT.group.milestones.map((m, i) => (
              <Reveal key={m.year} delay={i * 0.2}>
                <div className="relative">
                  <span className="relative z-10 mb-6 inline-flex h-12 items-center rounded-full bg-kcc-green px-5 dark:bg-[#1F5A40] font-serif text-2xl text-white shadow-soft">{m.year}</span>
                  <Tilt max={4}>
                    <div className="overflow-hidden rounded-[2rem] border border-cream-300 bg-surface shadow-soft">
                      <div className="h-48 overflow-hidden">
                        <img src={STORY_IMG(imgs[i])} alt="" loading="lazy" className="story-kenburns h-full w-full object-cover" />
                      </div>
                      <div className="p-6">
                        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-kcc-green">{pick(m.place)}</p>
                        <h3 className="mt-1 font-serif text-2xl text-ink-800">{pick(m.name)}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-cream-700">{pick(m.text)}</p>
                      </div>
                    </div>
                  </Tilt>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DecadesSection() {
  const pick = usePick();
  return (
    <section className="relative overflow-hidden bg-cream-100 py-20 lg:py-28">
      <div className="page-shell grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
        <Reveal from="start">
          <div className="grid grid-cols-2 gap-4">
            <img src={STORY_IMG('fact')} alt="" loading="lazy" className="aspect-[3/4] w-full rounded-3xl object-cover shadow-soft-lg" />
            <img src={STORY_IMG('clean')} alt="" loading="lazy" className="mt-12 aspect-[3/4] w-full rounded-3xl object-cover shadow-soft-lg" />
          </div>
        </Reveal>
        <div>
          <Eyebrow>{pick(ABOUT.decades.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(ABOUT.decades.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
          <Rise delay={0.2}><p className="mt-5 leading-relaxed text-cream-700">{pick(ABOUT.decades.text)}</p></Rise>
          <Rise delay={0.3}><p className="mt-8 text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-kcc-green">{pick(ABOUT.decades.brings)}</p></Rise>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {ABOUT.decades.list.map((x, i) => (
              <Rise key={i} delay={0.35 + i * 0.07}>
                <li className="flex items-center gap-2 rounded-2xl border border-cream-300 bg-surface px-4 py-3 text-sm text-ink-700">
                  <Check size={16} className="shrink-0 text-kcc-green" />
                  {pick(x)}
                </li>
              </Rise>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function WhySaudiSection() {
  const pick = usePick();
  return (
    <section className="relative overflow-hidden bg-cream-50 py-20 lg:py-28">
      <div className="page-shell">
        <div className="mb-12 max-w-4xl">
          <Eyebrow>{pick(ABOUT.whySaudi.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(ABOUT.whySaudi.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {ABOUT.whySaudi.items.map((x, i) => (
            <Rise key={i} delay={(i % 2) * 0.12}>
              <div className="group flex h-full gap-5 rounded-3xl border border-cream-300 bg-surface p-6 transition-shadow hover:shadow-soft-lg">
                <span className="font-serif text-4xl leading-none text-kcc-green/40 transition-colors group-hover:text-kcc-green">0{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-ink-800">{pick(x.title)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-cream-700">{pick(x.text)}</p>
                </div>
              </div>
            </Rise>
          ))}
        </div>

        <div className="mt-20 mb-10 max-w-3xl">
          <Eyebrow>{pick(ABOUT.win.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(ABOUT.win.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
          <Rise delay={0.2}><p className="mt-3 font-serif text-2xl italic text-kcc-green">{pick(ABOUT.win.sub)}</p></Rise>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {ABOUT.win.items.map((x, i) => (
            <Reveal key={i} delay={i * 0.2}>
              <div className="group relative h-[26rem] overflow-hidden rounded-[2rem]">
                <img src={STORY_IMG(x.img)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a160e]/95 via-[#0a160e]/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                  <span className="font-serif text-5xl text-[#7FD39A]">0{i + 1}</span>
                  <h3 className="mt-2 font-serif text-3xl">{pick(x.title)}</h3>
                  <p className="mt-2 max-w-md text-sm text-white/80">{pick(x.text)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

interface TeamMember { _id: string; name: string; role: { en: string; ar: string }; image: string; section: string; order: number }

/**
 * The leadership as the profile names it. Team members added in the admin
 * panel (Content → Team, section "team") still appear below them.
 */
export function LeadershipSection() {
  const pick = usePick();
  const { locale } = useLanguage();
  const [team, setTeam] = useState<TeamMember[]>([]);
  useEffect(() => {
    fetch('/api/team')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTeam(Array.isArray(d) ? d.filter((m: TeamMember) => m.section === 'team').sort((a: TeamMember, b: TeamMember) => a.order - b.order) : []))
      .catch(() => setTeam([]));
  }, []);
  return (
    <section className="relative overflow-hidden bg-cream-100 py-20 lg:py-28">
      <div className="page-shell">
        <div className="mb-12 flex flex-col items-center text-center">
          <Eyebrow>{pick(ABOUT.leadership.eyebrow)}</Eyebrow>
          <WordsReveal text={pick(ABOUT.leadership.title)} className="font-serif text-4xl leading-tight text-ink-800 sm:text-5xl" />
        </div>
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-4 sm:max-w-2xl sm:grid-cols-3 lg:max-w-6xl lg:grid-cols-6">
          {ABOUT.leadership.people.map((x, i) => (
            <Rise key={x.img} delay={i * 0.08}>
              <figure className="group text-center">
                <div className="overflow-hidden rounded-3xl bg-surface">
                  <img src={STORY_IMG(x.img)} alt={pick(x.name)} loading="lazy" className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <figcaption className="mt-3">
                  <p className="font-semibold text-ink-800">{pick(x.name)}</p>
                  <p className="text-xs text-cream-700">{pick(x.role)}</p>
                </figcaption>
              </figure>
            </Rise>
          ))}
        </div>
        {team.length > 0 && (
          <div className="mx-auto mt-14 grid max-w-sm grid-cols-2 gap-4 text-center sm:max-w-2xl sm:grid-cols-4">
            {team.map((m) => (
              <figure key={m._id}>
                {m.image && <img src={m.image} alt={m.name} loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />}
                <figcaption className="mt-2">
                  <p className="text-sm font-semibold text-ink-800">{m.name}</p>
                  <p className="text-xs text-cream-700">{m.role?.[locale] || m.role?.en}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
