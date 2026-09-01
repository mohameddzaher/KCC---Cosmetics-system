'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * All client-side context providers live here so that the root layout can stay
 * a server component and export real Next.js `metadata` (title, OG, canonical…).
 */
export default function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  /**
   * Resolved on the server from the `kcc-locale` cookie, so the first render —
   * server and client alike — is already in the reader's language. Reading it
   * from localStorage in an effect meant an Arabic visitor saw the English
   * navigation and copy for a moment on every page.
   */
  initialLocale?: 'en' | 'ar';
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider initialLocale={initialLocale}>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
