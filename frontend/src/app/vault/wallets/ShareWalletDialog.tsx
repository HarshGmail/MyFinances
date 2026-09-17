'use client';

import { useEffect, useState } from 'react';
import { Copy, Link2, Share2, TriangleAlert } from 'lucide-react';
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

const EXPIRY_DAYS = 7;
const MAX_USES = 5;

export interface WalletInvite {
  link: string;
  code: string;
}

interface ShareWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletName: string;
  onCreateLink: (expiresInDays: number, maxUses: number) => Promise<WalletInvite>;
  isPending: boolean;
}

function copyValue(value: string, label: string) {
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error(`Could not copy the ${label.toLowerCase()}`));
}

export function ShareWalletDialog({
  open,
  onOpenChange,
  walletName,
  onCreateLink,
  isPending,
}: ShareWalletDialogProps) {
  const [invite, setInvite] = useState<WalletInvite | null>(null);
  const [canShareLink, setCanShareLink] = useState(false);

  useEffect(() => {
    setCanShareLink(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const handleGenerate = async () => {
    try {
      setInvite(await onCreateLink(EXPIRY_DAYS, MAX_USES));
    } catch (error) {
      toast.error('Could not create the invite', { description: (error as Error)?.message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setInvite(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{walletName}&rdquo;</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Anyone with an account can request to join. You approve each request before they can see
            anything.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {invite ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="wallet-invite-code">Invite code</Label>
                <div className="flex gap-2">
                  <Input
                    id="wallet-invite-code"
                    readOnly
                    value={invite.code}
                    className="font-mono text-xs"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    title="Copy invite code"
                    onClick={() => copyValue(invite.code, 'Invite code')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {canShareLink && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      title="Share invite code"
                      onClick={() => {
                        navigator
                          .share({ text: invite.code, title: 'Shared wallet invite' })
                          .catch(() => {});
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Best for chat apps. They paste this into Vault → Wallets → Join, which opens in
                  their installed app and survives WhatsApp mangling the link.
                </p>
              </div>

              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Prefer a tappable link?
                </summary>
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="wallet-invite-link">Invite link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wallet-invite-link"
                      readOnly
                      value={invite.link}
                      className="font-mono text-xs"
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      title="Copy invite link"
                      onClick={() => copyValue(invite.link, 'Invite link')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chat apps sometimes drop the part after{' '}
                    <code className="bg-muted px-1 rounded">#</code> when they build a preview, and
                    the link is useless without it. Send the code instead if that happens.
                  </p>
                </div>
              </details>

              <p className="text-xs text-muted-foreground">
                Expires in {EXPIRY_DAYS} days · usable {MAX_USES} times
              </p>
            </>
          ) : (
            <Button className="w-full gap-2" disabled={isPending} onClick={handleGenerate}>
              <Link2 className="h-4 w-4" />
              {isPending ? 'Generating…' : 'Create invite'}
            </Button>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <TriangleAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Treat this like a key</p>
              <p className="text-muted-foreground">
                The invite carries the decryption key, and it never reaches our servers. Send it
                over a channel you trust, and only to people you mean to let in.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
