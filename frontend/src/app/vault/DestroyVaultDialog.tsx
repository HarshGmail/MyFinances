'use client';

import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CONFIRMATION_PHRASE = 'DESTROY';

interface DestroyVaultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDestroy: () => Promise<void>;
  isPending: boolean;
  itemCount: number;
}

export function DestroyVaultDialog({
  open,
  onOpenChange,
  onDestroy,
  isPending,
  itemCount,
}: DestroyVaultDialogProps) {
  const [confirmation, setConfirmation] = useState('');

  const handleDestroy = async () => {
    if (confirmation !== CONFIRMATION_PHRASE || isPending) return;
    try {
      await onDestroy();
      toast.success('Vault destroyed');
      setConfirmation('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Could not destroy the vault', { description: (error as Error)?.message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmation('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Destroy vault
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <p className="text-muted-foreground">
            This permanently deletes {itemCount} {itemCount === 1 ? 'entry' : 'entries'} and the
            encryption salt that goes with them. Nobody — including us — can bring it back. Use this
            when you have forgotten your PIN and want to start over.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="vault-destroy-confirmation">
              Type {CONFIRMATION_PHRASE} to confirm
            </Label>
            <Input
              id="vault-destroy-confirmation"
              value={confirmation}
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
              placeholder={CONFIRMATION_PHRASE}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={confirmation !== CONFIRMATION_PHRASE || isPending}
            onClick={handleDestroy}
          >
            {isPending ? 'Destroying…' : 'Destroy vault'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
