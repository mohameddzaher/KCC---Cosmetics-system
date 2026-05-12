'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/public/HeroSection';
import ServicesSection from '@/components/public/ServicesSection';
import StatsSection from '@/components/public/StatsSection';
import ProcessSection from '@/components/public/ProcessSection';
import Vision2030Section from '@/components/public/Vision2030Section';
import FAQSection from '@/components/public/FAQSection';
import TestimonialsSection from '@/components/public/TestimonialsSection';
import ContactFormSection from '@/components/public/ContactFormSection';
import NewsSection from '@/components/public/NewsSection';
import NewsletterSection from '@/components/public/NewsletterSection';
import CTASection from '@/components/public/CTASection';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <StatsSection />
        <Vision2030Section />
        <ProcessSection />
        <FAQSection />
        <TestimonialsSection />
        <ContactFormSection />
        <NewsSection />
        <NewsletterSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
