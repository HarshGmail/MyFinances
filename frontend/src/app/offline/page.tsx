'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudOff } from 'lucide-react';

export default function Offline() {
  return (
    <div className="p-4 max-w-2xl mx-auto min-h-dvh flex items-center justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudOff className="h-5 w-5" />
            You&apos;re offline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page hasn&apos;t been opened before, so there&apos;s no saved copy to show. Pages
            you&apos;ve already visited still work offline with their last known data.
          </p>
          <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
