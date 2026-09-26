'use client';

import Link from 'next/link';
import { ChevronRight, Users, Wallet } from 'lucide-react';
import { WalletSummary } from '@myfinances/core/types';
import { Badge } from '@/components/ui/badge';

interface WalletRowProps {
  wallet: WalletSummary;
  name: string;
}

export function WalletRow({ wallet, name }: WalletRowProps) {
  const entryLabel = wallet.itemCount === 1 ? 'entry' : 'entries';
  const memberLabel = wallet.memberCount === 1 ? 'member' : 'members';

  return (
    <Link
      href={`/vault/wallets/${wallet.id}`}
      className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/40"
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
        <Wallet className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{name}</span>
          {wallet.pendingCount > 0 && (
            <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
              <Users className="h-3 w-3" />
              {wallet.pendingCount}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {wallet.itemCount} {entryLabel} · {wallet.memberCount} {memberLabel} ·{' '}
          {wallet.isOwner ? 'Owner' : `Shared by ${wallet.ownerName || 'someone'}`}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
