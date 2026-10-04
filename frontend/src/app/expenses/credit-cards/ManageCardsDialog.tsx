'use client';

import { useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteCreditCardMutation, useResetCardSyncMutation } from '@myfinances/core/api';
import { issuerLabel } from '@myfinances/core/schemas/creditCards';
import type { CreditCard } from '@myfinances/core/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mutationErrorMessage } from '@/app/goals/goalDisplay';
import { CardFormDialog } from './CardFormDialog';
import { cardDisplayName, lastSyncedLabel, passwordBadge } from './cardDisplay';

interface ManageCardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCard[];
}

type CardFormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; cardId: string };

function DeleteCardDialog({
  card,
  onOpenChange,
}: {
  card: CreditCard | null;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteCard = useDeleteCreditCardMutation();

  const confirmDelete = () => {
    if (!card) return;
    deleteCard.mutate(card._id, {
      onSuccess: () => {
        toast.success(`Deleted ${cardDisplayName(card)}`);
        onOpenChange(false);
      },
      onError: (error) =>
        toast.error('Could not delete card', { description: mutationErrorMessage(error) }),
    });
  };

  return (
    <Dialog open={card !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete card?</DialogTitle>
          <DialogDescription>
            {card ? cardDisplayName(card) : ''} and all of its imported statements and transactions
            will be removed. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteCard.isPending}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deleteCard.isPending}>
            {deleteCard.isPending ? 'Deleting…' : 'Delete card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManagedCardRow({
  card,
  onEdit,
  onDelete,
}: {
  card: CreditCard;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const resetSync = useResetCardSyncMutation();
  const password = passwordBadge(card);

  const resyncFromScratch = () => {
    resetSync.mutate(card._id, {
      onSuccess: () =>
        toast.success('Sync reset', {
          description: 'The next sync will re-read every statement for this card.',
        }),
      onError: (error) =>
        toast.error('Could not reset sync', { description: mutationErrorMessage(error) }),
    });
  };

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{cardDisplayName(card)}</p>
          <p className="text-xs text-muted-foreground">
            {issuerLabel(card.issuer)} · {lastSyncedLabel(card.lastSyncAt)}
          </p>
        </div>
        <Badge variant="outline" className={`font-normal ${password.className}`}>
          {password.label}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {card.senderEmails.map((email) => (
          <Badge key={email} variant="secondary" className="font-normal max-w-full">
            <span className="truncate">{email}</span>
          </Badge>
        ))}
      </div>

      {card.passwordHint && (
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          Your bank&apos;s email says: {card.passwordHint}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resyncFromScratch}
          disabled={resetSync.isPending}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          {resetSync.isPending ? 'Resetting…' : 'Re-sync from scratch'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function ManageCardsDialog({ open, onOpenChange, cards }: ManageCardsDialogProps) {
  const [cardForm, setCardForm] = useState<CardFormState>({ mode: 'closed' });
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  const editingCard =
    cardForm.mode === 'edit' ? cards.find((card) => card._id === cardForm.cardId) : undefined;

  const closeCardForm = (isOpen: boolean) => {
    if (!isOpen) setCardForm({ mode: 'closed' });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Manage cards</DialogTitle>
            <DialogDescription>
              Edit sender emails and PDF passwords, or re-read every statement from scratch.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {cards.map((card) => (
              <ManagedCardRow
                key={card._id}
                card={card}
                onEdit={() => setCardForm({ mode: 'edit', cardId: card._id })}
                onDelete={() => setCardToDelete(card)}
              />
            ))}
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button onClick={() => setCardForm({ mode: 'add' })}>
              <Plus className="h-4 w-4 mr-2" />
              Add card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardFormDialog
        open={cardForm.mode !== 'closed'}
        onOpenChange={closeCardForm}
        card={editingCard}
      />

      <DeleteCardDialog
        card={cardToDelete}
        onOpenChange={(isOpen) => !isOpen && setCardToDelete(null)}
      />
    </>
  );
}
