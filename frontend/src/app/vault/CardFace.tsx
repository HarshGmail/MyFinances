'use client';

import { ReactNode } from 'react';
import { VaultItemContent } from '@/api/dataInterface';
import { getCardFace } from './vaultTypes';

const NETWORK_THEMES: Record<string, string> = {
  visa: 'from-[#1a1f71] via-[#2a3a8c] to-[#4b57a8]',
  mastercard: 'from-[#3a1c12] via-[#7a2d17] to-[#c4491f]',
  rupay: 'from-[#0b3d2e] via-[#12684b] to-[#1f9d6e]',
  'american express': 'from-[#0b3f5c] via-[#12688c] to-[#3fa4c9]',
  'diners club': 'from-[#1e1b33] via-[#3b3560] to-[#6357a3]',
};

const DEFAULT_THEME = 'from-[#23262c] via-[#33373f] to-[#4a4f59]';

function networkTheme(network: string): string {
  return NETWORK_THEMES[network.trim().toLowerCase()] ?? DEFAULT_THEME;
}

interface CardFaceProps {
  content: VaultItemContent;
  isNumberRevealed?: boolean;
  actions?: ReactNode;
}

export function CardFace({ content, isNumberRevealed, actions }: CardFaceProps) {
  const face = getCardFace(content);
  const displayNumber = isNumberRevealed && face.fullNumber ? face.fullNumber : face.maskedNumber;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-gradient-to-br ${networkTheme(
        face.network
      )} p-4 text-white shadow-md aspect-[1.7/1] max-w-[21rem] flex flex-col justify-between`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-[-5rem] h-40 w-40 rounded-full bg-white/5 blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-wide truncate">
            {face.issuer || 'Card'}
          </div>
          {face.cardLabel && (
            <div className="text-[11px] text-white/70 truncate">{face.cardLabel}</div>
          )}
        </div>
        {face.cardType && (
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider backdrop-blur-sm">
            {face.cardType}
          </span>
        )}
      </div>

      {actions && <div className="relative flex items-center gap-0.5 -ml-1.5">{actions}</div>}

      <div className="relative font-mono text-sm tracking-[0.12em] sm:text-base sm:tracking-[0.16em]">
        {displayNumber}
      </div>

      <div className="relative flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[8px] uppercase tracking-wider text-white/50">Card Holder</div>
          <div className="text-[11px] font-medium truncate">{face.nameOnCard || '—'}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[8px] uppercase tracking-wider text-white/50">Expires</div>
          <div className="text-[11px] font-medium font-mono">{face.expiry || '—'}</div>
        </div>
        {face.network && (
          <div className="shrink-0 text-xs font-semibold italic tracking-tight text-white/90">
            {face.network}
          </div>
        )}
      </div>
    </div>
  );
}
