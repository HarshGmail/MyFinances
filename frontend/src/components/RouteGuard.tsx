'use client';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const LAST_ROUTE_KEY = 'lastRoute';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Cache last visited route except /, /login, /signup
  useEffect(() => {
    if (pathname !== '/' && pathname !== '/login' && pathname !== '/signup') {
      localStorage.setItem(LAST_ROUTE_KEY, pathname);
    }
  }, [pathname]);

  useEffect(() => {
    // If not logged in, redirect to /
    if (!isLoggedIn && pathname !== '/') {
      router.replace('/');
    }
    // If logged in, prevent access to / (login/signup)
    if (isLoggedIn && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
      const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
      if (lastRoute) {
        router.replace(lastRoute);
      } else {
        router.replace('/home');
      }
    }
  }, [isLoggedIn, pathname, router]);

  return <>{children}</>;
}
