'use client';

import { useEffect, useState } from 'react';
import {
  clearCapturedInstallPrompt,
  getCapturedInstallPrompt,
  INSTALL_READY_EVENT,
  type InstallPromptEvent,
} from '@/lib/install';
import { isIosDevice, isStandaloneDisplayMode } from '@/lib/pwa';

export type InstallOffer = { kind: 'prompt'; event: InstallPromptEvent } | { kind: 'ios' } | null;

function resolveInstallOffer(): InstallOffer {
  if (isStandaloneDisplayMode()) return null;
  const capturedPrompt = getCapturedInstallPrompt();
  if (capturedPrompt) return { kind: 'prompt', event: capturedPrompt };
  return isIosDevice() ? { kind: 'ios' } : null;
}

export function useInstallOffer(): { offer: InstallOffer; install: () => Promise<void> } {
  const [offer, setOffer] = useState<InstallOffer>(null);

  useEffect(() => {
    const refreshOffer = () => setOffer(resolveInstallOffer());
    const markInstalled = () => {
      clearCapturedInstallPrompt();
      setOffer(null);
    };

    refreshOffer();
    window.addEventListener(INSTALL_READY_EVENT, refreshOffer);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener(INSTALL_READY_EVENT, refreshOffer);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  const install = async () => {
    const capturedPrompt = getCapturedInstallPrompt();
    if (!capturedPrompt) return;
    await capturedPrompt.prompt();
    await capturedPrompt.userChoice;
    clearCapturedInstallPrompt();
    window.dispatchEvent(new Event(INSTALL_READY_EVENT));
  };

  return { offer, install };
}
