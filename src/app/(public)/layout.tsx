'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // site-public: the website's own dark palette (see globals.css).
    <div className="site-public contents">
      <Navbar />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </div>
  );
}
