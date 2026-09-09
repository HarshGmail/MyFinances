'use client';

import { useEffect, useState } from 'react';
import { Lock, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VaultWrongPinError } from '@/utils/vaultCrypto';
import { PinInput, VAULT_PIN_LENGTH } from './PinInput';

interface VaultLockedProps {
  onUnlock: (pin: string) => Promise<void>;
  isBusy: boolean;
  lockedUntil: string | null;
  attemptsRemaining?: number;
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function VaultLocked({
  onUnlock,
  isBusy,
  lockedUntil,
  attemptsRemaining,
}: VaultLockedProps) {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const lockoutEndsAt = lockedUntil ? new Date(lockedUntil).getTime() : 0;
  const remainingLockoutMs = lockoutEndsAt - now;
  const isLockedOut = remainingLockoutMs > 0;

  useEffect(() => {
    if (!isLockedOut) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isLockedOut]);

  const handleUnlock = async (candidate: string) => {
    if (candidate.length !== VAULT_PIN_LENGTH || isBusy || isLockedOut) return;
    setErrorMessage('');
    try {
      await onUnlock(candidate);
    } catch (error) {
      setPin('');
      if (error instanceof VaultWrongPinError) {
        setErrorMessage('Incorrect PIN');
        return;
      }
      setErrorMessage((error as Error)?.message || 'Could not unlock the vault');
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Vault locked</CardTitle>
        <p className="text-sm text-muted-foreground">Enter your 6-digit PIN to unlock</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <PinInput
          value={pin}
          onChange={setPin}
          onComplete={handleUnlock}
          disabled={isBusy || isLockedOut}
          hasError={Boolean(errorMessage)}
          autoFocus
        />

        {errorMessage && !isLockedOut && (
          <p className="text-sm text-destructive text-center">{errorMessage}</p>
        )}

        {!isLockedOut &&
          !errorMessage &&
          typeof attemptsRemaining === 'number' &&
          attemptsRemaining <= 2 && (
            <p className="text-xs text-amber-500 text-center">
              {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} left before the
              vault locks temporarily
            </p>
          )}

        {isLockedOut && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <TriangleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Too many failed attempts</p>
              <p className="text-muted-foreground">
                Try again in {formatCountdown(remainingLockoutMs)}.
              </p>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          disabled={pin.length !== VAULT_PIN_LENGTH || isBusy || isLockedOut}
          onClick={() => handleUnlock(pin)}
        >
          {isBusy ? 'Unlocking…' : 'Unlock'}
        </Button>
      </CardContent>
    </Card>
  );
}
