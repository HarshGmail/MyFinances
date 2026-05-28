'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TrendingUp, Wallet, Landmark, Coins, PieChart, Receipt } from 'lucide-react';

interface MetricRow {
  label: string;
  description: string;
  formula?: string;
  meaningful?: string;
}

interface Section {
  title: string;
  icon: React.ReactNode;
  blurb: string;
  metrics: MetricRow[];
}

const SECTIONS: Section[] = [
  {
    title: 'Top Summary Cards',
    icon: <Wallet className="h-5 w-5" />,
    blurb: 'The four cards at the top of the dashboard summarize your entire portfolio.',
    metrics: [
      {
        label: 'Total Invested',
        description:
          'Net cost basis of every asset class you currently hold — money still deployed in the market. Sells, redemptions, and gold/crypto debits are subtracted from the invested figure for that asset class.',
        formula: 'Σ (cost basis of currently held units) across all asset classes',
      },
      {
        label: 'Total Current Value',
        description:
          'Live market value of all your holdings summed across stocks, mutual funds, gold, crypto, EPF, FD, and RD. Refreshed against NSE / MFAPI / SafeGold / CoinDCX prices.',
        formula: 'Σ (units × live price) for each holding',
      },
      {
        label: 'Total P&L %',
        description:
          'Simple unrealized gain or loss on your current portfolio expressed as a percentage. It treats every rupee invested as if it had been deployed at the same time — useful as a quick read but not time-aware.',
        formula: '(Current Value − Invested) ÷ Invested × 100',
      },
      {
        label: 'Overall XIRR %',
        description:
          'The money-weighted annualized return on your full portfolio. Every buy is a dated negative cash flow, every sell is a dated positive cash flow, and today\'s current value is the terminal positive cash flow. The Newton-Raphson solver finds the annual rate that makes the net present value of these flows zero. This is the honest "how am I really doing" number — it correctly weighs both the size and the timing of every contribution.',
        formula: 'Solve for r where Σ Cᵢ × (1 + r)^((Tₑₙd − Tᵢ) ÷ 365.25) = 0',
        meaningful:
          'Use XIRR to compare your actual returns against benchmarks (Nifty, gold, FD rate). It is the correct measure when contributions are spread over time.',
      },
      {
        label: 'Overall CAGR %',
        description:
          'A naive single-bucket reference: pretend you invested your entire net principal on the date of your first transaction and left it untouched until today. Ignores the timing of subsequent buys and sells, so it usually understates returns when you keep adding money — but it is intuitive and easy to compare with quoted "X% CAGR" numbers in the press.',
        formula: '(Current Value ÷ Net Invested) ^ (1 ÷ years) − 1',
        meaningful:
          'CAGR is meant as a sanity check next to XIRR — if XIRR ≫ CAGR you have been adding capital recently at attractive prices; if XIRR ≪ CAGR your recent additions have dragged returns.',
      },
    ],
  },
  {
    title: 'Allocation Donut',
    icon: <PieChart className="h-5 w-5" />,
    blurb:
      'The donut compares invested principal vs. current market value across the seven asset classes. Use it to spot concentration — if any single slice dominates, your portfolio risk is tied to that asset class.',
    metrics: [],
  },
  {
    title: 'Asset Cards (Stocks · Gold · MF · Crypto)',
    icon: <TrendingUp className="h-5 w-5" />,
    blurb:
      'Each card narrows the same metrics to one asset class so you can see which pocket is pulling its weight.',
    metrics: [
      {
        label: 'Invested',
        description: 'Cost basis of currently held units in this asset class. Sells subtract out.',
      },
      {
        label: 'Current Value',
        description: 'Live market value of holdings in this asset class.',
      },
      {
        label: 'P&L (₹ and %)',
        description: 'Unrealized gain or loss on current holdings of this asset class.',
      },
      {
        label: 'XIRR',
        description:
          "Money-weighted annualized return computed only from this asset class's dated transactions plus its current value as the terminal cash flow.",
        meaningful:
          'A high XIRR with a low CAGR usually means you bought aggressively after a dip; a low XIRR with a high CAGR means you built the position before the run-up.',
      },
      {
        label: 'CAGR',
        description:
          'Naive flat annual return scoped to this asset class — current value vs. net invested over years since first buy.',
      },
    ],
  },
  {
    title: 'EPF · FD · RD Cards',
    icon: <Landmark className="h-5 w-5" />,
    blurb:
      'Fixed-income and retirement balances. XIRR / CAGR are not shown here because the contract interest rate is itself the annualized return.',
    metrics: [
      {
        label: 'EPF Total Balance',
        description:
          'Current EPF balance summed from your latest passbook entries (employee + employer share). Pension fund balance is excluded because it is not withdrawable.',
      },
      {
        label: 'Monthly / Annual Contribution',
        description: 'The current monthly EPF credit times 12 — a forward-looking inflow estimate.',
      },
      {
        label: 'FD Invested vs Current Value',
        description:
          'Principal committed and accrued value (principal + simple interest pro-rated by days elapsed against the maturity term).',
        formula: 'Current Value = Principal + (Principal × rate × daysElapsed ÷ 365)',
      },
      {
        label: 'RD Invested vs Current Value',
        description:
          'Principal and accrued value computed with quarterly compounding (Indian RD convention).',
      },
    ],
  },
  {
    title: 'Capital Gains Block',
    icon: <Receipt className="h-5 w-5" />,
    blurb:
      'Realized gains grouped by Indian Financial Year using FIFO cost-basis matching across stocks, gold, crypto, and mutual funds. Estimated tax follows Finance Act 2024 (effective 23-Jul-2024): equity STCG 20%, LTCG 12.5% above 365-day holding; gold LTCG 12.5% above 730 days; crypto a flat 30%.',
    metrics: [
      {
        label: 'STCG / LTCG split',
        description:
          'Holding-period bucket per FIFO lot. The ₹1.25L annual LTCG exemption across equity and equity MF is NOT auto-applied — subtract it yourself when filing.',
      },
      {
        label: 'Estimated Tax',
        description:
          'A best-effort number using the rates above. It does not include surcharge, cess, or set-off against losses elsewhere.',
      },
    ],
  },
  {
    title: 'AI Prompt Copy Button',
    icon: <Coins className="h-5 w-5" />,
    blurb:
      'The icon next to the title copies a structured prompt summarizing your full portfolio (totals, XIRR, CAGR, top holdings) into your clipboard, ready to paste into Claude / ChatGPT for personalized analysis.',
    metrics: [],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HomeInfoSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">About this dashboard</SheetTitle>
          <p className="text-sm text-muted-foreground mt-2">
            How every number on the home page is computed and when it is meaningful.
          </p>
        </SheetHeader>

        <div className="space-y-8 pb-8 px-4">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-primary">{section.icon}</div>
                <h3 className="font-semibold text-base">{section.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{section.blurb}</p>
              {section.metrics.length > 0 && (
                <ul className="space-y-4">
                  {section.metrics.map((m) => (
                    <li
                      key={m.label}
                      className="bg-muted/40 rounded-lg p-4 border border-border/50"
                    >
                      <div className="font-semibold text-sm mb-2">{m.label}</div>
                      <p className="text-sm text-foreground/90 leading-relaxed">{m.description}</p>
                      {m.formula && (
                        <div className="mt-3 text-xs font-mono bg-black/20 dark:bg-black/40 p-3 rounded border border-border/40 text-purple-700 dark:text-purple-300">
                          {m.formula}
                        </div>
                      )}
                      {m.meaningful && (
                        <p className="mt-3 text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                          <span className="font-semibold">When meaningful: </span>
                          {m.meaningful}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
