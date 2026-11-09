'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallOffer } from '@/hooks/useInstallOffer';

export function InstallAppButton() {
  const { offer, install } = useInstallOffer();

  if (offer?.kind !== 'prompt') return null;

  return (
    <Button onClick={install} className="gap-2">
      <Download className="h-4 w-4" />
      Install app
    </Button>
  );
}
