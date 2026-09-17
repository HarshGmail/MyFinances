'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Copy, Smartphone, TriangleAlert, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useJoinWalletMutation } from '@/api/mutations';
import { useWalletInviteInfoQuery } from '@/api/query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  decodeWalletKeyFromLink,
  importWalletKeyRaw,
  isVaultCryptoAvailable,
  wrapKeyForPublicKey,
} from '@/utils/vaultCrypto';
import { isStandaloneDisplayMode } from '@/lib/pwa';
import { buildInviteCode } from '../../wallets/inviteCode';
import { useVaultSession } from '../../useVaultSession';
import { VaultLocked } from '../../VaultLocked';
import { VaultUnsupported } from '../../VaultUnsupported';

const KEY_FRAGMENT_PREFIX = '#k=';

interface JoinWalletPageProps {
  params: Promise<{ token: string }>;
}

function readWalletKeyFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const { hash } = window.location;
  if (!hash.startsWith(KEY_FRAGMENT_PREFIX)) return null;
  return hash.slice(KEY_FRAGMENT_PREFIX.length) || null;
}

export default function JoinWalletPage({ params }: JoinWalletPageProps) {
  const { token } = use(params);
  const [linkKey, setLinkKey] = useState<string | null>(null);
  const [hasReadHash, setHasReadHash] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'pending' | 'active'>('idle');
  const [isBrowserTab, setIsBrowserTab] = useState(false);

  useEffect(() => {
    setLinkKey(readWalletKeyFromHash());
    setHasReadHash(true);
  }, []);

  useEffect(() => {
    setIsBrowserTab(!isStandaloneDisplayMode());
  }, []);

  const session = useVaultSession();
  const { data: invite, isLoading, isError, error } = useWalletInviteInfoQuery(token);
  const { mutateAsync: joinWallet, isPending } = useJoinWalletMutation();

  useEffect(() => {
    if (invite?.membershipStatus) setJoinStatus(invite.membershipStatus);
  }, [invite]);

  const handleJoin = async () => {
    if (!linkKey || !session.publicKeyJwk) return;
    try {
      const walletKey = await importWalletKeyRaw(decodeWalletKeyFromLink(linkKey));
      const wrappedWalletKey = await wrapKeyForPublicKey(walletKey, session.publicKeyJwk);
      const result = await joinWallet({ token, wrappedWalletKey });
      setJoinStatus(result.status === 'active' ? 'active' : 'pending');
      toast.success(
        result.status === 'active' ? 'You already have access' : 'Request sent to the owner'
      );
    } catch (joinError) {
      toast.error('Could not request access', { description: (joinError as Error)?.message });
    }
  };

  if (!hasReadHash || session.status === 'loading') {
    return (
      <div className="p-4 sm:p-6 max-w-md mx-auto space-y-4">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (session.status === 'unsupported' || !isVaultCryptoAvailable()) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <VaultUnsupported />
      </div>
    );
  }

  if (!linkKey) {
    return (
      <div className="p-4 sm:p-6 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-amber-500" />
              This link is incomplete
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The decryption key travels in the part of the link after the{' '}
              <code className="bg-muted px-1 rounded text-xs">#</code>, and it is missing here. Some
              apps strip it when a link is forwarded.
            </p>
            <p>Ask whoever shared the wallet to send you the full link again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status === 'setup') {
    return (
      <div className="p-4 sm:p-6 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Set up your vault first</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Shared wallets are encrypted to your personal vault key, so you need a vault before
              you can join one. It takes a moment to set up.
            </p>
            <Button asChild className="w-full">
              <Link href="/vault">Create my vault</Link>
            </Button>
            <p className="text-xs">Come back to this link once that is done.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status === 'locked') {
    return (
      <div className="p-4 sm:p-6 max-w-md mx-auto space-y-4">
        <p className="text-sm text-center text-muted-foreground">
          Unlock your vault to join this shared wallet
        </p>
        <VaultLocked
          onUnlock={session.unlock}
          onBiometricUnlock={session.unlockWithBiometrics}
          isBiometricEnrolled={session.isBiometricEnrolled}
          isBusy={session.isBusy}
          lockedUntil={session.lockedUntil}
          attemptsRemaining={session.attemptsRemaining}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-md mx-auto space-y-4">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !invite) {
    return (
      <div className="p-4 sm:p-6 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-destructive" />
              This invite cannot be used
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{(error as Error)?.message || 'The link may have expired or been revoked.'}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/vault?tab=wallets">Go to my wallets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>A shared wallet</CardTitle>
          <p className="text-sm text-muted-foreground">
            {invite.ownerName || 'Someone'} shared a wallet with {invite.itemCount}{' '}
            {invite.itemCount === 1 ? 'entry' : 'entries'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {joinStatus === 'active' ? (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p>You already have access to this wallet.</p>
              </div>
              <Button asChild className="w-full">
                <Link href={`/vault/wallets/${invite.walletId}`}>Open wallet</Link>
              </Button>
            </>
          ) : joinStatus === 'pending' ? (
            <>
              <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Waiting for approval</p>
                  <p className="text-muted-foreground">
                    {invite.ownerName || 'The owner'} has to approve your request before the
                    contents become visible to you.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/vault?tab=wallets">Go to my wallets</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Requesting access sends your name to the owner. You will be able to read the
                contents once they approve.
              </p>
              {isBrowserTab && (
                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Have MyFinance on your Home Screen?</p>
                      <p className="text-muted-foreground">
                        The installed app keeps its own sign-in and vault session, so joining here
                        in the browser means signing in and unlocking twice. Copy the invite code
                        instead, then paste it in the app under Vault → Wallets → Join.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(buildInviteCode({ token, key: linkKey }))
                        .then(() => toast.success('Invite code copied — paste it in the app'))
                        .catch(() => toast.error('Could not copy the invite code'));
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy invite code for the app
                  </Button>
                </div>
              )}
              <Button
                className="w-full"
                disabled={isPending || !session.hasSharingKeys}
                onClick={handleJoin}
              >
                {isPending ? 'Sending request…' : 'Request access'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
