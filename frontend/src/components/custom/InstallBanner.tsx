'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallOffer } from '@/hooks/useInstallOffer';

const APP_NAME = 'MyFinance';
const SNOOZE_STORAGE_KEY = 'myfinance.install-banner.snoozed-until';
const SNOOZE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function isBannerSnoozed(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_STORAGE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function snoozeBanner(): void {
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, String(Date.now() + SNOOZE_DAYS * DAY_MS));
  } catch {
    return;
  }
}

export function InstallBanner() {
  const { offer, install } = useInstallOffer();
  const [snoozed, setSnoozed] = useState(true);

  useEffect(() => {
    setSnoozed(isBannerSnoozed());
  }, []);

  if (!offer || snoozed) return null;

  const dismiss = () => {
    snoozeBanner();
    setSnoozed(true);
  };

  return (
    <div role="region" aria-label="Install app" className="border-b bg-card text-card-foreground">
      <div className="flex items-center gap-3 px-3 py-2 text-sm sm:px-6">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Download className="size-4" />
        </span>
        <p className="min-w-0 flex-1 text-muted-foreground">
          {offer.kind === 'prompt' ? (
            <>
              Install <strong className="text-foreground">{APP_NAME}</strong> for a home screen
              icon, full screen and quicker opening.
            </>
          ) : (
            <>
              Add <strong className="text-foreground">{APP_NAME}</strong> to your home screen: tap{' '}
              <strong className="text-foreground">Share</strong>, then{' '}
              <strong className="text-foreground">Add to Home Screen</strong>.
            </>
          )}
        </p>
        {offer.kind === 'prompt' && (
          <Button size="sm" onClick={install} className="shrink-0">
            Install
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label="Hide for now"
          className="shrink-0"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
