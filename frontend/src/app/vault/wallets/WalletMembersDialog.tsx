'use client';

import { useState } from 'react';
import { Check, TriangleAlert, UserMinus, X } from 'lucide-react';
import { toast } from 'sonner';
import { WalletMemberRecord } from '@myfinances/core/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: WalletMemberRecord[];
  isLoading: boolean;
  isOwner: boolean;
  isPending: boolean;
  sharedItemCount: number;
  onApprove: (userId: string) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}

export function WalletMembersDialog({
  open,
  onOpenChange,
  members,
  isLoading,
  isOwner,
  isPending,
  sharedItemCount,
  onApprove,
  onReject,
  onRemove,
}: WalletMembersDialogProps) {
  const [removedName, setRemovedName] = useState('');

  const pending = members.filter((member) => member.status === 'pending');
  const active = members.filter((member) => member.status === 'active');

  const run = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error('That did not work', { description: (error as Error)?.message });
    }
  };

  const handleRemove = async (member: WalletMemberRecord) => {
    try {
      await onRemove(member.userId);
      setRemovedName(member.name || member.email);
      toast.success('Member removed and wallet key rotated');
    } catch (error) {
      toast.error('Could not remove the member', { description: (error as Error)?.message });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setRemovedName('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              {isOwner && pending.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Requests to join ({pending.length})</div>
                  <div className="rounded-lg border divide-y">
                    {pending.map((member) => (
                      <div key={member.userId} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {member.name || 'Unnamed user'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 shrink-0"
                          disabled={isPending}
                          onClick={() => run(() => onApprove(member.userId), 'Member approved')}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-destructive hover:text-destructive"
                          title="Reject"
                          disabled={isPending}
                          onClick={() => run(() => onReject(member.userId), 'Request rejected')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium">In this wallet ({active.length})</div>
                <div className="rounded-lg border divide-y">
                  {active.map((member) => (
                    <div key={member.userId} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {member.name || 'Unnamed user'}
                          {member.isMe && (
                            <span className="text-muted-foreground font-normal"> (you)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                      </div>
                      {member.role === 'owner' ? (
                        <Badge variant="secondary" className="shrink-0">
                          Owner
                        </Badge>
                      ) : (
                        isOwner && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 shrink-0 text-destructive hover:text-destructive"
                            disabled={isPending}
                            onClick={() => handleRemove(member)}
                          >
                            <UserMinus className="h-4 w-4" />
                            Remove
                          </Button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {removedName && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <TriangleAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{removedName} can no longer open this wallet</p>
                    <p className="text-muted-foreground">
                      The key was rotated, so they cannot read anything added from now on. They had
                      access to {sharedItemCount} {sharedItemCount === 1 ? 'entry' : 'entries'}{' '}
                      though — rotation cannot undo what was already seen or copied, so consider
                      regenerating the CVV or changing the ATM PIN on anything sensitive.
                    </p>
                  </div>
                </div>
              )}

              {isOwner && (
                <p className="text-xs text-muted-foreground">
                  Removing someone rotates the wallet key and invalidates any invite links you have
                  already sent.
                </p>
              )}
            </>
          )}
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
