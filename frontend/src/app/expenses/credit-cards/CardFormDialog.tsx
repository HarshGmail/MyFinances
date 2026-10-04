'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAddCreditCardMutation,
  useCardSenderSuggestionsQuery,
  useUpdateCreditCardMutation,
  useUserProfileQuery,
} from '@myfinances/core/api';
import {
  CARD_ISSUERS,
  creditCardFormSchema,
  creditCardFormToPayload,
  knownSendersForIssuer,
  type CreditCardFormValues,
} from '@myfinances/core/schemas/creditCards';
import type { CreditCard, CreditCardIssuer } from '@myfinances/core/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mutationErrorMessage } from '@/app/goals/goalDisplay';
import { SenderEmailPicker } from './SenderEmailPicker';

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard;
}

function initialValues(card?: CreditCard): Partial<CreditCardFormValues> {
  if (!card) {
    return { label: '', lastDigits: '', nameOnCard: '', senderEmails: [], pdfPassword: '' };
  }
  return {
    issuer: card.issuer,
    label: card.label,
    lastDigits: card.lastDigits,
    nameOnCard: card.nameOnCard ?? '',
    senderEmails: [...card.senderEmails],
    pdfPassword: '',
  };
}

function MissingDobNote() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
      <Info className="h-4 w-4 shrink-0" />
      <p>
        Add your date of birth in{' '}
        <Link href="/profile" className="underline font-medium">
          Profile
        </Link>{' '}
        so we can try DOB-based passwords.
      </p>
    </div>
  );
}

function SavedPasswordControls({ card }: { card: CreditCard }) {
  const updateCard = useUpdateCreditCardMutation();

  const clearSavedPassword = () => {
    updateCard.mutate(
      { id: card._id, data: { pdfPassword: '' } },
      {
        onSuccess: () => toast.success('Saved password cleared'),
        onError: (error) =>
          toast.error('Could not clear password', { description: mutationErrorMessage(error) }),
      }
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>
        {card.passwordSource === 'derived'
          ? 'A password was found automatically and saved.'
          : 'A password is saved for this card.'}{' '}
        Leave blank to keep it.
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={clearSavedPassword}
        disabled={updateCard.isPending}
      >
        {updateCard.isPending ? 'Clearing…' : 'Clear saved password'}
      </Button>
    </div>
  );
}

function CardForm({
  card,
  open,
  onDone,
}: {
  card?: CreditCard;
  open: boolean;
  onDone: () => void;
}) {
  const { data: profile } = useUserProfileQuery();
  const suggestionsQuery = useCardSenderSuggestionsQuery(open);
  const addCard = useAddCreditCardMutation();
  const updateCard = useUpdateCreditCardMutation();
  const isPending = addCard.isPending || updateCard.isPending;
  const isEditing = !!card;

  const form = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardFormSchema),
    defaultValues: initialValues(card),
  });

  const changeIssuer = (issuer: CreditCardIssuer, onChange: (value: CreditCardIssuer) => void) => {
    onChange(issuer);
    if (form.getValues('senderEmails').length === 0) {
      form.setValue('senderEmails', knownSendersForIssuer(issuer), { shouldValidate: true });
    }
  };

  const onSubmit = (values: CreditCardFormValues) => {
    const payload = creditCardFormToPayload(values);
    const callbacks = {
      onSuccess: () => {
        toast.success(isEditing ? 'Card updated' : 'Card added');
        onDone();
      },
      onError: (error: unknown) =>
        toast.error(isEditing ? 'Could not update card' : 'Could not add card', {
          description: mutationErrorMessage(error),
        }),
    };
    if (card) {
      updateCard.mutate({ id: card._id, data: payload }, callbacks);
    } else {
      addCard.mutate(payload, callbacks);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="issuer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issuer</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(issuer) =>
                      changeIssuer(issuer as CreditCardIssuer, field.onChange)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CARD_ISSUERS.map((issuer) => (
                        <SelectItem key={issuer.value} value={issuer.value}>
                          {issuer.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SBI Cashback" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="lastDigits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last digits</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="1234"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nameOnCard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name on card (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={profile?.userName ?? ''}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Used to try name-based PDF passwords.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="senderEmails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statement sender emails</FormLabel>
                <SenderEmailPicker
                  value={field.value ?? []}
                  onChange={field.onChange}
                  suggestions={suggestionsQuery.data ?? []}
                  isLoadingSuggestions={suggestionsQuery.isLoading}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pdfPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PDF password (optional)</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder={card?.hasPassword ? 'Unchanged' : ''}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormDescription>
                  Leave blank and we&apos;ll try common formats (name + date of birth, last digits)
                  and save the one that opens the PDF.
                </FormDescription>
                {card?.hasPassword && <SavedPasswordControls card={card} />}
                <FormMessage />
              </FormItem>
            )}
          />

          {card?.passwordHint && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Your bank&apos;s email says: {card.passwordHint}
            </div>
          )}

          {profile && !profile.dob && <MissingDobNote />}
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Add card'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function CardFormDialog({ open, onOpenChange, card }: CardFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{card ? 'Edit card' : 'Add credit card'}</DialogTitle>
          <DialogDescription>
            We look for statement emails from these senders in your linked Gmail and read the PDF.
          </DialogDescription>
        </DialogHeader>
        <CardForm
          key={card?._id ?? 'new'}
          card={card}
          open={open}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
