'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ScanFace, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VaultWrongPinError } from '@/utils/vaultCrypto';
import { PinInput, VAULT_PIN_LENGTH } from './PinInput';
import { isIosDevice } from '@/lib/pwa';

interface BiometricSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnable: (pin: string) => Promise<void>;
  isPending: boolean;
}

export function BiometricSetupDialog({
  open,
  onOpenChange,
  onEnable,
  isPending,
}: BiometricSetupDialogProps) {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isIos, setIsIos] = useState(false);
  const biometricLabel = isIos ? 'Face ID' : 'biometric unlock';
  const BiometricIcon = isIos ? ScanFace : Fingerprint;

  useEffect(() => {
    setIsIos(isIosDevice());
  }, []);

  const reset = () => {
    setPin('');
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    if (pin.length !== VAULT_PIN_LENGTH || isPending) return;
    setErrorMessage('');
    try {
      await onEnable(pin);
      toast.success(`${biometricLabel} enabled`);
      reset();
      onOpenChange(false);
    } catch (error) {
      setPin('');
      if (error instanceof VaultWrongPinError) {
        setErrorMessage('Incorrect PIN');
        return;
      }
      if ((error as Error)?.name === 'NotAllowedError') return;
      setErrorMessage((error as Error)?.message || `Could not enable ${biometricLabel}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BiometricIcon className="h-5 w-5" />
            Enable {biometricLabel}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Confirm your PIN once. It is then encrypted with a key only this device can reproduce,
            and stored here — never on the server.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Current PIN</p>
            <PinInput
              value={pin}
              onChange={setPin}
              onComplete={handleSubmit}
              disabled={isPending}
              hasError={Boolean(errorMessage)}
              autoFocus
            />
            {errorMessage && <p className="text-xs text-destructive text-center">{errorMessage}</p>}
          </div>

          <div className="rounded-lg border p-3 text-xs text-muted-foreground space-y-1.5">
            <p>Your PIN keeps working — Face ID is only a shortcut.</p>
            <p>
              Anyone who can unlock this device with their own face or fingerprint can open the
              vault. Changing your PIN or destroying the vault turns this off again.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pin.length !== VAULT_PIN_LENGTH || isPending} onClick={handleSubmit}>
            {isPending ? 'Enabling…' : `Enable ${biometricLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
