'use client';

import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function VaultUnsupported() {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          The vault needs a secure connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Your secrets are encrypted in this browser before they are sent anywhere, which needs the
          Web Crypto API. Browsers only expose it over HTTPS or on localhost.
        </p>
        {origin && (
          <p>
            This page is currently loaded from{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{origin}</code>.
          </p>
        )}
        <p>
          Open the app over HTTPS — or on{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">localhost</code> during
          development — and the vault will work.
        </p>
      </CardContent>
    </Card>
  );
}
