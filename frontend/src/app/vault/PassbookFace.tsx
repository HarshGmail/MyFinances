'use client';

import { ReactNode } from 'react';
import { Landmark } from 'lucide-react';
import { VaultItemContent } from '@/api/dataInterface';
import { maskValue } from './vaultTypes';

interface PassbookFaceProps {
  content: VaultItemContent;
  isNumberRevealed?: boolean;
  actions?: ReactNode;
  marker?: ReactNode;
}

function passbookRow(label: string, value: string) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="shrink-0 text-[9px] uppercase tracking-wider text-white/45">{label}</span>
      <span className="flex-1 border-b border-dotted border-white/20" />
      <span className="shrink-0 font-mono text-[11px] text-white/90">{value}</span>
    </div>
  );
}

export function PassbookFace({ content, isNumberRevealed, actions, marker }: PassbookFaceProps) {
  const fields = content.fields;
  const bankName = (fields.bankName ?? '').trim() || 'Bank Account';
  const accountHolder = (fields.accountHolder ?? '').trim();
  const accountNumber = (fields.accountNumber ?? '').trim();
  const ifsc = (fields.ifsc ?? '').trim();
  const branch = (fields.branch ?? '').trim();
  const accountType = (fields.accountType ?? '').trim();

  const shownNumber = accountNumber
    ? isNumberRevealed
      ? accountNumber
      : maskValue(accountNumber)
    : '—';

  return (
    <div className="relative w-full max-w-[21rem] overflow-hidden rounded-xl bg-gradient-to-br from-[#15322b] via-[#1c4438] to-[#2b5c49] p-4 text-white shadow-md aspect-[1.7/1] flex flex-col justify-between">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-5 w-px bg-white/15" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-6 w-px bg-white/10" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/5 blur-2xl"
      />

      <div className="relative ml-4 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold tracking-wide truncate">{bankName}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              {accountType || 'Passbook'}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {ifsc && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[9px] tracking-wider backdrop-blur-sm">
              {ifsc}
            </span>
          )}
          {marker}
        </div>
      </div>

      {actions && <div className="relative ml-2.5 flex items-center gap-0.5">{actions}</div>}

      <div className="relative ml-4 space-y-1.5">
        {passbookRow('A/C No', shownNumber)}
        {passbookRow('Holder', accountHolder || '—')}
        {branch && passbookRow('Branch', branch)}
      </div>
    </div>
  );
}
