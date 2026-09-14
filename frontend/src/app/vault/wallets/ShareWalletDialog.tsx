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

interface ShareWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletName: string;
  onCreateLink: (expiresInDays: number, maxUses: number) => Promise<string>;
  isPending: boolean;
}

export function ShareWalletDialog({
  open,
  onOpenChange,
  walletName,
  onCreateLink,
  isPending,
}: ShareWalletDialogProps) {
  const [link, setLink] = useState('');
  const [canShareLink, setCanShareLink] = useState(false);

  useEffect(() => {
    setCanShareLink(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const handleGenerate = async () => {
    try {
      setLink(await onCreateLink(EXPIRY_DAYS, MAX_USES));
    } catch (error) {
      toast.error('Could not create the invite link', { description: (error as Error)?.message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setLink('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share &ldquo;{walletName}&rdquo;</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Anyone with an account who opens this link can request to join. You approve each request
            before they can see anything.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {link ? (
            <div className="space-y-1.5">
              <Label htmlFor="wallet-invite-link">Invite link</Label>
              <div className="flex gap-2">
                <Input
                  id="wallet-invite-link"
                  readOnly
                  value={link}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  title="Copy invite link"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(link)
                      .then(() => toast.success('Invite link copied'))
                      .catch(() => toast.error('Could not copy the link'));
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {canShareLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    title="Share invite link"
                    onClick={() => {
                      navigator.share({ url: link, title: 'Shared wallet invite' }).catch(() => {});
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Expires in {EXPIRY_DAYS} days · usable {MAX_USES} times
              </p>
            </div>
          ) : (
            <Button className="w-full gap-2" disabled={isPending} onClick={handleGenerate}>
              <Link2 className="h-4 w-4" />
              {isPending ? 'Generating…' : 'Generate invite link'}
            </Button>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <TriangleAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Treat this link like a key</p>
              <p className="text-muted-foreground">
                The part after <code className="bg-muted px-1 rounded text-xs">#</code> is the
                decryption key and never reaches our servers. Send it over a channel you trust, and
                only to people you mean to let in.
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
