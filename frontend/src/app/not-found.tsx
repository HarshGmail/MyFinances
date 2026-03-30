'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  // Clear invalid route from localStorage to prevent infinite loops
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastRoute');
    }
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen flex items-center justify-center">
      <Card className="w-full border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
            Page Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-amber-600 dark:text-amber-300">
              Oops! The page you're looking for doesn't exist (404).
            </p>
            <p className="text-xs text-muted-foreground">
              The route has been cleared. You'll be taken to the home page.
            </p>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={() => router.push('/home')} className="gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
