'use client';

import React from 'react';

interface OtpDateInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function OtpDateInput({ value, onChange, className = '' }: OtpDateInputProps) {
  const inputs = Array(8).fill(0);
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const dashPositions = [2, 4]; // after DD and MM

  // Handle input change
  const handleInput = (idx: number, val: string) => {
    // Ensure value is a string
    const currentValue = value || '';
    const arr = currentValue.split('');

    if (val.length > 1) val = val.slice(-1); // Only last digit

    // Validation for each box
    if (idx === 0 && !/[0-3]/.test(val)) return; // D1: 0-3
    if (idx === 1) {
      if (currentValue[0] === '3' && !/[0-1]/.test(val)) return; // D2: 0-1 if D1 is 3
      if (!/[0-9]/.test(val)) return;
    }
    if (idx === 2 && !/[0-1]/.test(val)) return; // M1: 0-1
    if (idx === 3) {
      if (currentValue[2] === '1' && !/[0-2]/.test(val)) return; // M2: 0-2 if M1 is 1
      if (!/[0-9]/.test(val)) return;
    }
    if (idx >= 4 && !/[0-9]/.test(val)) return;

    arr[idx] = val;
    // Fill next
    for (let i = idx + 1; i < 8; i++) {
      if (!arr[i]) arr[i] = '';
    }
    onChange(arr.join(''));
    if (val && idx < 7) {
      refs.current[idx + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const currentValue = value || '';
      if (currentValue[idx]) {
        // Clear current
        const arr = currentValue.split('');
        arr[idx] = '';
        onChange(arr.join(''));
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
        const arr = currentValue.split('');
        arr[idx - 1] = '';
        onChange(arr.join(''));
      }
      e.preventDefault();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('Text').replace(/\D/g, '').slice(0, 8);
    if (pasted.length === 8) {
      onChange(pasted);
      refs.current[7]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className={`flex gap-1 justify-center items-center ${className}`} onPaste={handlePaste}>
      {inputs.map((_, idx) => (
        <React.Fragment key={idx}>
          <input
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="w-8 h-10 text-center border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            value={value[idx] || ''}
            onChange={(e) => handleInput(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
          />
          {dashPositions.includes(idx + 1) && (
            <span className="mx-1 text-lg font-bold select-none">-</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
