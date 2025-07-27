import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar, RouteGuard, Toaster, ThemeSyncer } from '@/components';
import Providers from './providers';
import { AuthProvider } from '@/context/AuthContext';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          <AuthProvider>
            <RouteGuard>
              <ThemeSyncer />
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <div className="flex-1 overflow-auto pb-4">{children}</div>
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
