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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<void>;
  isPending: boolean;
}

export function CreateWalletDialog({
  open,
  onOpenChange,
  onCreate,
  isPending,
}: CreateWalletDialogProps) {
  const [name, setName] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    try {
      await onCreate(trimmed);
      setName('');
      onOpenChange(false);
      toast.success('Wallet created');
    } catch (error) {
      toast.error('Could not create the wallet', { description: (error as Error)?.message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a wallet</DialogTitle>
          <p className="text-sm text-muted-foreground">
            A wallet is a set of entries you share with friends. Everyone can add their own, and
            everyone can see and copy what is inside.
          </p>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="wallet-name">Wallet name</Label>
          <Input
            id="wallet-name"
            value={name}
            autoComplete="off"
            placeholder="Discount Cards"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleCreate();
            }}
          />
          <p className="text-xs text-muted-foreground">
            The name is encrypted too — only members can read it.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || isPending} onClick={handleCreate}>
            {isPending ? 'Creating…' : 'Create wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
