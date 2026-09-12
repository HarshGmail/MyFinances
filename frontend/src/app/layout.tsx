import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import {
  Navbar,
  RouteGuard,
  Toaster,
  ThemeSyncer,
  DemoBanner,
  ServiceWorkerRegistrar,
} from '@/components';
import Providers from './providers';
import { AuthProvider } from '@/context/AuthContext';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { PWA_THEME_COLOR_DARK, PWA_THEME_COLOR_LIGHT } from '@/lib/pwa';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'My Finance',
  description: 'Manage Your Finances',
  applicationName: 'MyFinance',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'MyFinance',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: PWA_THEME_COLOR_LIGHT },
    { media: '(prefers-color-scheme: dark)', color: PWA_THEME_COLOR_DARK },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh flex flex-col`}
      >
        <Providers>
          <AuthProvider>
            <RouteGuard>
              <ThemeSyncer />
              <ServiceWorkerRegistrar />
              <div className="flex flex-col min-h-dvh">
                <Navbar />
                <DemoBanner />
                <div className="flex-1 overflow-auto pb-4">
                  <Suspense>{children}</Suspense>
                </div>
                <SpeedInsights />
                <Analytics />
                <Toaster />
              </div>
            </RouteGuard>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
