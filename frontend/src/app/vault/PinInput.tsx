'use client';

import { KeyboardEvent, ClipboardEvent, useRef } from 'react';

export const VAULT_PIN_LENGTH = 6;

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export function PinInput({
  value,
  onChange,
  onComplete,
  disabled,
  hasError,
  autoFocus,
}: PinInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const boxes = Array.from({ length: VAULT_PIN_LENGTH });

  const focusIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(VAULT_PIN_LENGTH - 1, index));
    inputsRef.current[clamped]?.focus();
  };

  const commit = (next: string) => {
    onChange(next);
    if (next.length === VAULT_PIN_LENGTH) onComplete?.(next);
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    if (digits.length > 1) {
      const pasted = digits.slice(0, VAULT_PIN_LENGTH);
      commit(pasted);
      focusIndex(pasted.length);
      return;
    }
    const characters = value.padEnd(index, ' ').split('');
    characters[index] = digits;
    const next = characters.join('').replace(/\s/g, '').slice(0, VAULT_PIN_LENGTH);
    commit(next);
    focusIndex(index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const next = value.slice(0, Math.max(0, Math.min(index, value.length - 1)));
      onChange(next);
      focusIndex(next.length);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusIndex(index - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusIndex(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('Text').replace(/\D/g, '');
    if (!digits) return;
    event.preventDefault();
    const pasted = digits.slice(0, VAULT_PIN_LENGTH);
    commit(pasted);
    focusIndex(pasted.length);
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {boxes.map((_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          name={`vault-digit-${index}`}
          aria-label={`PIN digit ${index + 1}`}
          maxLength={VAULT_PIN_LENGTH}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={() => {
            if (index > value.length) focusIndex(value.length);
          }}
          className={`h-12 w-11 sm:h-14 sm:w-12 rounded-lg border bg-background text-center text-xl font-semibold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${
            hasError ? 'border-destructive' : 'border-input'
          }`}
        />
      ))}
    </div>
  );
}
