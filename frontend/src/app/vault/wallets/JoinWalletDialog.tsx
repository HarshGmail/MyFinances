'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseWalletInvite } from './inviteCode';

interface JoinWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (token: string, key: string) => Promise<void>;
  isPending: boolean;
}

export function JoinWalletDialog({ open, onOpenChange, onJoin, isPending }: JoinWalletDialogProps) {
  const [rawInvite, setRawInvite] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const reset = () => {
    setRawInvite('');
    setErrorMessage('');
  };

  const handleJoin = async () => {
    if (!rawInvite.trim() || isPending) return;
    setErrorMessage('');

    let parsed;
    try {
      parsed = parseWalletInvite(rawInvite);
    } catch (parseError) {
      setErrorMessage((parseError as Error).message);
      return;
    }

    try {
      await onJoin(parsed.token, parsed.key);
      reset();
      onOpenChange(false);
    } catch (joinError) {
      setErrorMessage((joinError as Error)?.message || 'Could not use that invite');
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
          <DialogTitle>Join a wallet</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Paste the invite code or link someone sent you. The owner approves your request before
            you can see anything.
          </p>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="wallet-invite-input">Invite code or link</Label>
          <Textarea
            id="wallet-invite-input"
            rows={3}
            autoComplete="off"
            spellCheck={false}
            placeholder="MFW1.…"
            className="font-mono text-xs"
            value={rawInvite}
            onChange={(event) => {
              setRawInvite(event.target.value);
              setErrorMessage('');
            }}
          />
          {errorMessage ? (
            <p className="text-xs text-destructive">{errorMessage}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Joining here keeps you in this app, so you stay signed in and your vault stays
              unlocked.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!rawInvite.trim() || isPending} onClick={handleJoin}>
            {isPending ? 'Requesting…' : 'Request access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
