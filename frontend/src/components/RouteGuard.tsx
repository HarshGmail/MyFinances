'use client';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const LAST_ROUTE_KEY = 'lastRoute';
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/privacy',
  '/forgot-password',
  '/reset-password',
  '/offline',
];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isSessionResolved } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Cache last visited route except public routes (preserve query params)
  // Invalid routes are automatically cleared by /not-found.tsx, so no validation needed here
  useEffect(() => {
    if (!PUBLIC_ROUTES.includes(pathname)) {
      localStorage.setItem(LAST_ROUTE_KEY, pathname + window.location.search);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isSessionResolved) return;
    // If not logged in, redirect to /
    if (!isLoggedIn && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/');
    }
    // If logged in, prevent access to / (login/signup) but allow /privacy
    if (
      isLoggedIn &&
      (pathname === '/' ||
        pathname === '/login' ||
        pathname === '/signup' ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password')
    ) {
      const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
      if (lastRoute) {
        router.replace(lastRoute);
      } else {
        router.replace('/home');
      }
    }
  }, [isLoggedIn, isSessionResolved, pathname, router]);

  return <>{children}</>;
}
