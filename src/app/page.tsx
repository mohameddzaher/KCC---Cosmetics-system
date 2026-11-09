'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import FAQSection from '@/components/public/FAQSection';
import NewsSection from '@/components/public/NewsSection';
import ProductStage from '@/components/story/ProductStage';
import { SmoothScroll, VelocityBand, LinesStrips, TextureShowcase } from '@/components/story/Motion2';
import {
  StoryHero, DirectionSection, NumbersSection, CommitmentSection, PlantSection,
  LinesSlider, MakeSection, FormulateXSection, OdmSection, QualitySection,
  PartnersSection, CaseSection, PromiseSection,
} from '@/components/story/HomeStory';

/**
 * The home page tells the company's story in the order of its commercial
 * profile (KCC Commercial Profile 2027): the cover, the product on its stage
 * opening onto the Jeddah plant, who we are, the scale behind us, what we
 * make, how we work, quality, and the promise. The FAQ and news
 * stay, managed from the admin panel as before.
 */
export default function HomePage() {
  return (
    // site-public: the website's own dark palette (see globals.css).
    <div className="site-public contents">
      <SmoothScroll />
      <Navbar />
      <main>
        <StoryHero />
        <ProductStage />
        <PlantSection />
        <DirectionSection />
        <NumbersSection />
        <VelocityBand />
        <CommitmentSection />
        <LinesStrips />
        <LinesSlider />
        <MakeSection />
        <TextureShowcase />
        <FormulateXSection />
        <OdmSection />
        <QualitySection />
        <PartnersSection />
        <CaseSection />
        <FAQSection />
        <NewsSection />
        <PromiseSection />
      </main>
      <Footer />
    </div>
  );
}
