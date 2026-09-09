'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useVaultSession } from './useVaultSession';
import { VaultLocked } from './VaultLocked';
import { VaultSetup } from './VaultSetup';
import { VaultShell } from './VaultShell';
import { VaultUnsupported } from './VaultUnsupported';

export default function VaultPage() {
  const session = useVaultSession();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {session.status === 'loading' && (
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {session.status === 'unsupported' && <VaultUnsupported />}

      {session.status === 'setup' && (
        <VaultSetup onCreate={session.createVault} isBusy={session.isBusy} />
      )}

      {session.status === 'locked' && (
        <VaultLocked
          onUnlock={session.unlock}
          isBusy={session.isBusy}
          lockedUntil={session.lockedUntil}
          attemptsRemaining={session.attemptsRemaining}
        />
      )}

      {session.status === 'unlocked' && (
        <VaultShell
          items={session.items}
          damagedIds={session.damagedIds}
          isBusy={session.isBusy}
          onLock={session.lock}
          onSave={session.saveItem}
          onRemove={session.removeItem}
          onChangePin={session.changePin}
          onDestroy={session.destroy}
        />
      )}
    </div>
  );
}
