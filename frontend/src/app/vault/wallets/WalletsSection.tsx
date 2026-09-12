'use client';

import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { WalletSummary } from '@/api/dataInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateWalletDialog } from './CreateWalletDialog';
import { WalletRow } from './WalletRow';

interface WalletsSectionProps {
  wallets: WalletSummary[] | undefined;
  names: Record<string, string>;
  isLoading: boolean;
  hasSharingKeys: boolean;
  isPending: boolean;
  onCreate: (name: string) => Promise<void>;
}

export function WalletsSection({
  wallets,
  names,
  isLoading,
  hasSharingKeys,
  isPending,
  onCreate,
}: WalletsSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Wallets</h2>
          <p className="text-sm text-muted-foreground">
            Pool entries with friends — everyone adds their own and everyone can copy
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          disabled={!hasSharingKeys}
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {!hasSharingKeys && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="py-3 text-sm">
            Your sharing keys could not be loaded, so wallets are unavailable. Locking and unlocking
            the vault usually sets them up.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !wallets || wallets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 font-medium">No wallets yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Create one to share selected card or account details with friends. Wallets others
              share with you appear here once they approve your request.
            </p>
            <Button
              size="sm"
              className="mt-4 gap-1.5"
              disabled={!hasSharingKeys}
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create a wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <WalletRow key={wallet.id} wallet={wallet} name={names[wallet.id] ?? '…'} />
          ))}
        </div>
      )}

      <CreateWalletDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={onCreate}
        isPending={isPending}
      />
    </div>
  );
}
