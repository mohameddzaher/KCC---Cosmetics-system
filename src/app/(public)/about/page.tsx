'use client';

import { AboutHero, GroupJourney, DecadesSection, WhySaudiSection, LeadershipSection } from '@/components/story/AboutStory';
import { DirectionSection, NumbersSection, QualitySection, PromiseSection } from '@/components/story/HomeStory';
import { SmoothScroll, VelocityBand } from '@/components/story/Motion2';

/**
 * About KCC, from the company's commercial profile: the group's road from
 * Cairo (1981) through Amsterdam (2020) to Jeddah (2027), its direction, its
 * scale, why the Kingdom, who leads it, and how it works.
 */
export default function AboutPage() {
  return (
    <>
      <SmoothScroll />
      <AboutHero />
      <GroupJourney />
      <DirectionSection />
      <NumbersSection />
      <VelocityBand />
      <DecadesSection />
      <WhySaudiSection />
      <LeadershipSection />
      <QualitySection />
      <PromiseSection />
    </>
  );
}
