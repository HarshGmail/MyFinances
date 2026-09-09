'use client';

import { useState } from 'react';
import { KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PinInput, VAULT_PIN_LENGTH } from './PinInput';

interface VaultSetupProps {
  onCreate: (pin: string) => Promise<void>;
  isBusy: boolean;
}

export function VaultSetup({ onCreate, isBusy }: VaultSetupProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const isMismatch = confirmPin.length === VAULT_PIN_LENGTH && confirmPin !== pin;
  const canSubmit =
    pin.length === VAULT_PIN_LENGTH && confirmPin === pin && acknowledged && !isBusy;

  const handleCreate = async () => {
    if (!canSubmit) return;
    try {
      await onCreate(pin);
      toast.success('Vault created');
    } catch (error) {
      toast.error('Could not create the vault', { description: (error as Error)?.message });
      setPin('');
      setConfirmPin('');
    }
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Set up your vault
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose a 6-digit PIN. Everything you store is encrypted in this browser with it, so the
          server only ever holds scrambled data.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">Choose a PIN</p>
          <PinInput value={pin} onChange={setPin} disabled={isBusy} autoFocus />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-center">Confirm your PIN</p>
          <PinInput
            value={confirmPin}
            onChange={setConfirmPin}
            disabled={isBusy}
            hasError={isMismatch}
          />
          {isMismatch && (
            <p className="text-xs text-destructive text-center">Those PINs do not match</p>
          )}
        </div>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">If you forget this PIN, the data is gone.</p>
              <p className="text-muted-foreground">
                There is no reset link and no way for us to recover it — that is the point of
                encrypting it here rather than on the server. The only way out is to destroy the
                vault and start again.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            I understand this PIN cannot be recovered
          </label>
        </div>

        <Button className="w-full gap-2" disabled={!canSubmit} onClick={handleCreate}>
          <KeyRound className="h-4 w-4" />
          {isBusy ? 'Creating vault…' : 'Create vault'}
        </Button>
      </CardContent>
    </Card>
  );
}
