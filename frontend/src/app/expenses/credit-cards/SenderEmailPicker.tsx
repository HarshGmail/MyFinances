'use client';

import { useState, type KeyboardEvent } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { issuerLabel } from '@myfinances/core/schemas/creditCards';
import type { CardSenderSuggestion } from '@myfinances/core/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pluralise } from './cardDisplay';

const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function SuggestionRow({
  suggestion,
  checked,
  onToggle,
}: {
  suggestion: CardSenderSuggestion;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-accent">
      <input
        type="checkbox"
        className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
        checked={checked}
        onChange={onToggle}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium break-all">{suggestion.email}</span>
          {suggestion.issuer && (
            <Badge variant="secondary" className="font-normal">
              {issuerLabel(suggestion.issuer)}
            </Badge>
          )}
          {suggestion.isAlertSender && (
            <Badge variant="outline" className="font-normal">
              Spend alerts
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {suggestion.count > 0
            ? `${pluralise(suggestion.count, 'email')} found`
            : 'Known bank sender'}
        </p>
        {suggestion.latestSubject && (
          <p className="text-xs text-muted-foreground truncate" title={suggestion.latestSubject}>
            {suggestion.latestSubject}
          </p>
        )}
      </div>
    </label>
  );
}

export function SenderEmailPicker({
  value,
  onChange,
  suggestions,
  isLoadingSuggestions,
}: {
  value: string[];
  onChange: (emails: string[]) => void;
  suggestions: CardSenderSuggestion[];
  isLoadingSuggestions: boolean;
}) {
  const [customEmail, setCustomEmail] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const toggle = (email: string) => {
    onChange(value.includes(email) ? value.filter((entry) => entry !== email) : [...value, email]);
  };

  const remove = (email: string) => onChange(value.filter((entry) => entry !== email));

  const addCustomEmail = () => {
    const email = normaliseEmail(customEmail);
    if (!SIMPLE_EMAIL_PATTERN.test(email)) {
      setCustomError('Enter a valid email address');
      return;
    }
    if (!value.includes(email)) onChange([...value, email]);
    setCustomEmail('');
    setCustomError(null);
  };

  const addOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addCustomEmail();
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1 pr-1 font-normal max-w-full">
              <span className="truncate">{email}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-background/60"
                onClick={() => remove(email)}
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="rounded-md border">
        <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
          Senders found in your inbox
        </p>
        <div className="max-h-56 overflow-y-auto divide-y">
          {isLoadingSuggestions ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching your inbox…
            </div>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No statement senders found. Add the address your bank emails statements from below.
            </p>
          ) : (
            suggestions.map((suggestion) => {
              const email = normaliseEmail(suggestion.email);
              return (
                <SuggestionRow
                  key={email}
                  suggestion={suggestion}
                  checked={value.includes(email)}
                  onToggle={() => toggle(email)}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="statements@yourbank.com"
            value={customEmail}
            onChange={(event) => {
              setCustomEmail(event.target.value);
              setCustomError(null);
            }}
            onKeyDown={addOnEnter}
            autoComplete="off"
          />
          <Button type="button" variant="outline" onClick={addCustomEmail} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {customError && <p className="text-sm text-destructive">{customError}</p>}
      </div>
    </div>
  );
}
