import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.tarkovbuddy.org'),
  title: 'TarkovBuddy - Escape from Tarkov Quest Tracker',
  description: 'Free Escape from Tarkov quest tracker for Kappa Container, quest items, and hideout progression. Cloud sync and automatic progress tracking.',
  keywords: ['escape from tarkov', 'tarkov quest tracker', 'kappa container', 'eft tracker', 'tarkov kappa guide'],
  authors: [{ name: 'Knivet' }],
  openGraph: {
    title: 'TarkovBuddy - Complete Escape from Tarkov Quest Tracker',
    description: 'Track Kappa quests, quest items, and hideout progression. Free tracker with cloud sync.',
    url: 'https://www.tarkovbuddy.org/',
    siteName: 'TarkovBuddy',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TarkovBuddy - Escape from Tarkov Quest Tracker',
    description: 'Free quest tracker for Kappa Container, quest items, and hideout. Cloud sync and automatic progress tracking.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
