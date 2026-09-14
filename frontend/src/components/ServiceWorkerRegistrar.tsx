'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A failed registration only costs offline support, never a working page.
    });

    navigator.storage?.persist?.().catch(() => {});
  }, []);

  return null;
}
