'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PinInput, VAULT_PIN_LENGTH } from './PinInput';

interface ChangePinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangePin: (newPin: string) => Promise<void>;
  isPending: boolean;
  damagedCount: number;
}

export function ChangePinDialog({
  open,
  onOpenChange,
  onChangePin,
  isPending,
  damagedCount,
}: ChangePinDialogProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const isMismatch = confirmPin.length === VAULT_PIN_LENGTH && confirmPin !== pin;
  const canSubmit = pin.length === VAULT_PIN_LENGTH && confirmPin === pin && !isPending;

  const reset = () => {
    setPin('');
    setConfirmPin('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await onChangePin(pin);
      toast.success('Vault PIN changed');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Could not change the PIN', { description: (error as Error)?.message });
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
          <DialogTitle>Change vault PIN</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Every entry is re-encrypted in this browser with the new PIN before it is saved.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">New PIN</p>
            <PinInput value={pin} onChange={setPin} disabled={isPending} autoFocus />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Confirm new PIN</p>
            <PinInput
              value={confirmPin}
              onChange={setConfirmPin}
              disabled={isPending}
              hasError={isMismatch}
            />
            {isMismatch && (
              <p className="text-xs text-destructive text-center">Those PINs do not match</p>
            )}
          </div>

          {damagedCount > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {damagedCount} {damagedCount === 1 ? 'entry' : 'entries'} could not be decrypted and
              will be dropped when the PIN changes.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isPending ? 'Re-encrypting…' : 'Change PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
