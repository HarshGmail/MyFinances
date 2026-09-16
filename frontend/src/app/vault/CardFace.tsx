'use client';

import { Nfc } from 'lucide-react';
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
}

export function CardFace({ content, isNumberRevealed }: CardFaceProps) {
  const face = getCardFace(content);
  const displayNumber = isNumberRevealed && face.fullNumber ? face.fullNumber : face.maskedNumber;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-br ${networkTheme(
        face.network
      )} p-5 text-white shadow-lg aspect-[1.586/1] max-w-[26rem] flex flex-col justify-between`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-[-6rem] h-52 w-52 rounded-full bg-white/5 blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-wide truncate">
            {face.issuer || 'Card'}
          </div>
          {face.cardLabel && <div className="text-xs text-white/70 truncate">{face.cardLabel}</div>}
        </div>
        {face.cardType && (
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur-sm">
            {face.cardType}
          </span>
        )}
      </div>

      <div className="relative flex items-center gap-3">
        <div className="h-7 w-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 shadow-inner sm:h-8 sm:w-11" />
        <Nfc className="h-4 w-4 text-white/60 sm:h-5 sm:w-5" />
      </div>

      <div className="relative font-mono text-base tracking-[0.15em] sm:text-lg sm:tracking-[0.2em]">
        {displayNumber}
      </div>

      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-wider text-white/50">Card Holder</div>
          <div className="text-xs font-medium truncate sm:text-sm">{face.nameOnCard || '—'}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[9px] uppercase tracking-wider text-white/50">Expires</div>
          <div className="text-xs font-medium font-mono sm:text-sm">{face.expiry || '—'}</div>
        </div>
        {face.network && (
          <div className="shrink-0 text-sm font-semibold italic tracking-tight text-white/90">
            {face.network}
          </div>
        )}
      </div>
    </div>
  );
}
