'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
  OverlayConfig,
  DEFAULT_OVERLAYS,
  countActiveOverlays,
  useStockDetailStore,
} from './stockDetailStore';

interface ToggleRowProps {
  label: string;
  description: string;
  swatchClass: string;
  checked: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (checked: boolean) => void;
}

function ToggleRow({
  label,
  description,
  swatchClass,
  checked,
  disabled,
  disabledReason,
  onChange,
}: ToggleRowProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 py-2.5 ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className={`mt-1.5 block h-0.5 w-6 flex-shrink-0 rounded ${swatchClass}`} />
        <div className="space-y-0.5 min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">
            {disabled && disabledReason ? disabledReason : description}
          </div>
        </div>
      </div>
      <Toggle
        pressed={checked}
        onPressedChange={onChange}
        disabled={disabled}
        size="sm"
        aria-label={`Toggle ${label}`}
        className="h-7 px-3 text-xs border border-muted-foreground/40 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
      >
        {checked ? 'On' : 'Off'}
      </Toggle>
    </div>
  );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">{children}</div>
    </section>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isIntraday: boolean;
  hasDayHL: boolean;
}

export default function OverlaysDrawer({ isOpen, onClose, isIntraday, hasDayHL }: Props) {
  const committed = useStockDetailStore((s) => s.overlays);
  const setCommitted = useStockDetailStore((s) => s.setOverlays);

  const [draft, setDraft] = useState<OverlayConfig>(committed);

  // Reseed draft from committed each time the drawer opens so stale edits
  // from a previous open don't carry over.
  useEffect(() => {
    if (isOpen) setDraft(committed);
  }, [isOpen, committed]);

  const set = (patch: Partial<OverlayConfig>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(committed);

  const apply = () => {
    setCommitted(draft);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">Overlays &amp; Indicators</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Toggle overlays here, then hit <b>Apply</b> to redraw the chart.
          </p>
        </SheetHeader>

        <div className="space-y-6 pb-24 px-1">
          <SectionGroup title="Simple Moving Averages">
            <ToggleRow
              label="SMA 20"
              description="Avg close of last 20 bars · short-term trend"
              swatchClass="bg-amber-500"
              checked={draft.sma20}
              onChange={(v) => set({ sma20: v })}
            />
            <ToggleRow
              label="SMA 50"
              description="Avg close of last 50 bars · medium-term trend"
              swatchClass="bg-violet-500"
              checked={draft.sma50}
              onChange={(v) => set({ sma50: v })}
            />
          </SectionGroup>

          <SectionGroup title="Exponential Moving Averages">
            <ToggleRow
              label="EMA 9"
              description="Fast EMA · reacts quickly to price shifts"
              swatchClass="bg-pink-400"
              checked={draft.ema9}
              onChange={(v) => set({ ema9: v })}
            />
            <ToggleRow
              label="EMA 21"
              description="Medium EMA · balance of speed and smoothing"
              swatchClass="bg-indigo-400"
              checked={draft.ema21}
              onChange={(v) => set({ ema21: v })}
            />
            <ToggleRow
              label="EMA 50"
              description="Slow EMA · broader trend with recent bias"
              swatchClass="bg-fuchsia-400"
              checked={draft.ema50}
              onChange={(v) => set({ ema50: v })}
            />
          </SectionGroup>

          <SectionGroup title="Bands">
            <ToggleRow
              label="Bollinger Bands (20, 2σ)"
              description="20-period SMA ± 2 standard deviations · volatility envelope"
              swatchClass="bg-teal-400"
              checked={draft.bollinger}
              onChange={(v) => set({ bollinger: v })}
            />
          </SectionGroup>

          <SectionGroup title="Levels & Structure">
            <ToggleRow
              label="Support / Resistance"
              description="Auto-detected pivot levels with role-reversal (dashed = flipped)"
              swatchClass="bg-gradient-to-r from-green-500 to-red-500"
              checked={draft.srLines}
              onChange={(v) => set({ srLines: v })}
            />
          </SectionGroup>

          <SectionGroup title="Your Activity">
            <ToggleRow
              label="My Transactions"
              description="Thin vertical lines at each buy (green) and sell (red) date"
              swatchClass="bg-gradient-to-r from-green-500 to-red-500"
              checked={draft.transactions}
              onChange={(v) => set({ transactions: v })}
            />
          </SectionGroup>

          <SectionGroup title="Volume">
            <ToggleRow
              label="Volume SMA 20"
              description="20-bar average of volume · highlights unusual activity"
              swatchClass="bg-sky-400"
              checked={draft.volSma}
              onChange={(v) => set({ volSma: v })}
            />
          </SectionGroup>

          <SectionGroup title="Intraday &amp; Session">
            <ToggleRow
              label="VWAP"
              description="Volume-weighted average price, resets daily"
              swatchClass="bg-cyan-500"
              checked={draft.vwap}
              disabled={!isIntraday}
              disabledReason="Only meaningful on intraday timeframes (1D / 1W)"
              onChange={(v) => set({ vwap: v })}
            />
            <ToggleRow
              label="Day H/L"
              description="Horizontal lines at today's session high &amp; low"
              swatchClass="bg-emerald-500"
              checked={draft.dayHL}
              disabled={!hasDayHL}
              disabledReason="Day high/low not available for this symbol"
              onChange={(v) => set({ dayHL: v })}
            />
          </SectionGroup>
        </div>

        <div className="sticky bottom-0 left-0 right-0 border-t bg-background px-1 py-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraft(DEFAULT_OVERLAYS)}
            disabled={countActiveOverlays(draft) === 0}
          >
            Clear all
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft(committed)}
              disabled={!dirty}
            >
              Reset
            </Button>
            <Button size="sm" onClick={apply} disabled={!dirty}>
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
