'use client';

import {
  ChangeEvent,
  ClipboardEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useRef,
} from 'react';

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
  const hadFocusRef = useRef(false);
  const boxes = Array.from({ length: VAULT_PIN_LENGTH });
  const activeIndex = Math.min(value.length, VAULT_PIN_LENGTH - 1);

  useEffect(() => {
    if (disabled || !hadFocusRef.current) return;
    const focused = document.activeElement;
    const focusLeftTheComponent =
      focused &&
      focused !== document.body &&
      !inputsRef.current.includes(focused as HTMLInputElement);
    if (focusLeftTheComponent) return;
    inputsRef.current[activeIndex]?.focus();
  }, [activeIndex, disabled]);

  const commit = (next: string) => {
    const trimmed = next.slice(0, VAULT_PIN_LENGTH);
    onChange(trimmed);
    if (trimmed.length === VAULT_PIN_LENGTH) onComplete?.(trimmed);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const inputType = (event.nativeEvent as InputEvent).inputType;
    if (inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') {
      event.target.value = '';
      onChange(value.slice(0, -1));
      return;
    }
    const digits = event.target.value.replace(/\D/g, '');
    if (!digits || value.length >= VAULT_PIN_LENGTH) {
      event.target.value = value[activeIndex] ?? '';
      return;
    }
    const isBulkFill = digits.length > 1;
    commit(isBulkFill ? digits : value + digits);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    event.preventDefault();
    onChange(value.slice(0, -1));
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('Text').replace(/\D/g, '');
    if (!digits) return;
    event.preventDefault();
    commit(digits);
  };

  const handleMouseDown = (index: number, event: MouseEvent<HTMLInputElement>) => {
    if (index === activeIndex) return;
    event.preventDefault();
    inputsRef.current[activeIndex]?.focus();
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const nextFocused = event.relatedTarget as HTMLInputElement | null;
    if (nextFocused && !inputsRef.current.includes(nextFocused)) hadFocusRef.current = false;
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
          tabIndex={index === activeIndex ? 0 : -1}
          autoFocus={autoFocus && index === 0}
          value={value[index] ?? ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onMouseDown={(event) => handleMouseDown(index, event)}
          onFocus={() => {
            hadFocusRef.current = true;
          }}
          onBlur={handleBlur}
          className={`h-12 w-11 sm:h-14 sm:w-12 rounded-lg border bg-background text-center text-xl font-semibold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${
            hasError ? 'border-destructive' : 'border-input'
          }`}
        />
      ))}
    </div>
  );
}
