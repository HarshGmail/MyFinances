'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/numbers';
import { Info } from 'lucide-react';

interface FYGains {
  stcgGains?: number;
  ltcgGains?: number;
  stcgTax?: number;
  ltcgTax?: number;
  flatGains?: number;
  flatTax?: number;
  lots?: unknown[];
}

interface UnrealizedBreakdown {
  stcg: number;
  ltcg: number;
  flat30: number;
  stcgTax: number;
  ltcgTax: number;
  flatTax: number;
}

interface CapitalGainsSummaryProps {
  realizedByFY: Record<string, FYGains>;
  unrealized?: UnrealizedBreakdown;
  assetType: 'stocks' | 'gold' | 'crypto' | 'mutualFunds';
  currentFY: string;
  isLoading?: boolean;
}

function gainColor(value: number) {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

export function CapitalGainsSummary({
  realizedByFY,
  unrealized,
  assetType,
  currentFY,
  isLoading,
}: CapitalGainsSummaryProps) {
  const fyList = Object.keys(realizedByFY).sort().reverse();
  const [selectedFY, setSelectedFY] = useState<string>(
    fyList.includes(currentFY) ? currentFY : (fyList[0] ?? currentFY)
  );

  const isCrypto = assetType === 'crypto';
  const isGold = assetType === 'gold';

  const data = realizedByFY[selectedFY];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capital Gains</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Capital Gains Tax</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FY Selector */}
        {fyList.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {fyList.map((fy) => (
              <button
                key={fy}
                onClick={() => setSelectedFY(fy)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedFY === fy
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                FY {fy}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No realized gains yet.</p>
        )}

        {/* Realized Gains */}
        {data && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Realized — FY {selectedFY}
            </p>
            <div className="rounded-lg border divide-y text-sm">
              {isCrypto ? (
                <Row label="Gains (30% flat)" gain={data.flatGains ?? 0} tax={data.flatTax ?? 0} />
              ) : (
                <>
                  <Row
                    label={`STCG (${isGold ? 'Slab rate' : '20%'})`}
                    gain={data.stcgGains ?? 0}
                    tax={isGold ? undefined : (data.stcgTax ?? 0)}
                    note={isGold ? 'Taxable at income slab rate' : undefined}
                  />
                  <Row label="LTCG (12.5%)" gain={data.ltcgGains ?? 0} tax={data.ltcgTax ?? 0} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Unrealized Gains */}
        {unrealized && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Unrealized (if sold today)
            </p>
            <div className="rounded-lg border divide-y text-sm">
              {isCrypto ? (
                <Row label="Gains (30% flat)" gain={unrealized.flat30} tax={unrealized.flatTax} />
              ) : (
                <>
                  <Row
                    label={`STCG (${isGold ? 'Slab rate' : '20%'})`}
                    gain={unrealized.stcg}
                    tax={isGold ? undefined : unrealized.stcgTax}
                    note={isGold ? 'Taxable at income slab rate' : undefined}
                  />
                  <Row label="LTCG (12.5%)" gain={unrealized.ltcg} tax={unrealized.ltcgTax} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <Notes assetType={assetType} />
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  gain,
  tax,
  note,
}: {
  label: string;
  gain: number;
  tax?: number;
  note?: string;
}) {
  return (
    <div className="px-3 py-2 flex items-center justify-between gap-4">
      <div>
        <span className="text-foreground">{label}</span>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
      </div>
      <div className="text-right shrink-0">
        <div className={`font-medium ${gainColor(gain)}`}>{formatCurrency(gain)}</div>
        {tax !== undefined && (
          <div className="text-xs text-muted-foreground">est. tax: {formatCurrency(tax)}</div>
        )}
      </div>
    </div>
  );
}

function Notes({ assetType }: { assetType: string }) {
  const notes: string[] = [];
  if (assetType === 'stocks' || assetType === 'mutualFunds') {
    notes.push('₹1.25L annual LTCG exemption (equity + equity MF combined) not auto-applied.');
  }
  if (assetType === 'mutualFunds') {
    notes.push('All MF treated as equity funds. Debt MF is taxed at slab rate.');
  }
  if (assetType === 'gold') {
    notes.push(
      'Gold STCG taxed at your income slab rate (not computed). LTCG threshold: 730 days.'
    );
  }
  if (assetType === 'crypto') {
    notes.push('VDA (crypto) gains are taxed at 30% flat — no STCG/LTCG distinction.');
  }
  if (!notes.length) return null;
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
      {notes.map((n, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}
