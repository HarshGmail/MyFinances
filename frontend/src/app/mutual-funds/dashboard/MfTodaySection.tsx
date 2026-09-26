'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MobileDataCard, MobileDataMetric } from '@/components/custom/MobileDataCard';
import { BreadthBar } from '@/components/custom/BreadthBar';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from '@myfinances/core/calc/numbers';
import { getProfitLossColor } from '@myfinances/core/calc/text';
import { formatNavDate } from '@myfinances/core/calc/navDates';
import { FundDailyMove, MfDailySummary, NavChange } from '@myfinances/core/calc/mfDailyMoves';

const ChangeBarChart = dynamic(() => import('@/components/custom/ChangeBarChart'), { ssr: false });

const NAV_DECIMALS = 4;

function formatNav(nav: number): string {
  return `₹${nav.toLocaleString('en-IN', { minimumFractionDigits: NAV_DECIMALS })}`;
}

function SignedPercent({ value }: { value: NavChange | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={getProfitLossColor(value.change)}>{formatSignedPercent(value.changePct)}</span>
  );
}

function DayChange({ fund }: { fund: FundDailyMove }) {
  if (fund.isStale) {
    return (
      <span className="text-xs text-muted-foreground">
        NAV pending · last {formatNavDate(fund.latestNavDate)}
      </span>
    );
  }
  return (
    <span className={getProfitLossColor(fund.valueChange)}>
      {formatSignedCurrency(fund.valueChange)}
    </span>
  );
}

function SummaryTiles({ summary }: { summary: MfDailySummary }) {
  const biggestGainer = summary.funds.find((fund) => fund.valueChange > 0);
  const biggestLoser = [...summary.funds].reverse().find((fund) => fund.valueChange < 0);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Day change</p>
        <p className={`text-xl font-bold ${getProfitLossColor(summary.totalChange)}`}>
          {formatSignedCurrency(summary.totalChange)}
        </p>
        <p className={`text-xs ${getProfitLossColor(summary.totalChange)}`}>
          {formatSignedPercent(summary.totalChangePct)}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Breadth</p>
        <p className="text-sm">
          <span className="text-green-600">▲ {summary.advancers}</span>
          {' · '}
          <span className="text-red-600">▼ {summary.decliners}</span>
          {summary.staleCount > 0 && (
            <span className="text-muted-foreground"> · {summary.staleCount} pending</span>
          )}
        </p>
        <BreadthBar advancers={summary.advancers} decliners={summary.decliners} />
      </div>
      <div className="min-w-0 rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Top gainer</p>
        {biggestGainer ? (
          <>
            <p className="truncate text-sm font-medium" title={biggestGainer.fundName}>
              {biggestGainer.fundName}
            </p>
            <p className="text-sm text-green-600">
              {formatSignedCurrency(biggestGainer.valueChange)} (
              <SignedPercent value={biggestGainer.navChange} />)
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No gainers</p>
        )}
      </div>
      <div className="min-w-0 rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Top loser</p>
        {biggestLoser ? (
          <>
            <p className="truncate text-sm font-medium" title={biggestLoser.fundName}>
              {biggestLoser.fundName}
            </p>
            <p className="text-sm text-red-600">
              {formatSignedCurrency(biggestLoser.valueChange)} (
              <SignedPercent value={biggestLoser.navChange} />)
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No losers</p>
        )}
      </div>
    </div>
  );
}

function FundMovesTable({ funds }: { funds: FundDailyMove[] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {funds.map((fund) => (
          <MobileDataCard
            key={fund.fundName}
            title={fund.fundName}
            headline={<DayChange fund={fund} />}
            subline={<SignedPercent value={fund.navChange} />}
          >
            <MobileDataMetric label="NAV">{formatNav(fund.latestNav)}</MobileDataMetric>
            <MobileDataMetric label="Prev NAV">
              {fund.previousNav !== null ? formatNav(fund.previousNav) : '—'}
            </MobileDataMetric>
            <MobileDataMetric label="Value">{formatCurrency(fund.currentValue)}</MobileDataMetric>
            <MobileDataMetric label="1W">
              <SignedPercent value={fund.weekChange} />
            </MobileDataMetric>
            <MobileDataMetric label="1M">
              <SignedPercent value={fund.monthChange} />
            </MobileDataMetric>
          </MobileDataCard>
        ))}
      </div>

      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Fund</TableHead>
            <TableHead className="text-right">NAV</TableHead>
            <TableHead className="text-right">Prev NAV</TableHead>
            <TableHead className="text-right">Day %</TableHead>
            <TableHead className="text-right">Day ₹</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">1W</TableHead>
            <TableHead className="text-right">1M</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funds.map((fund) => (
            <TableRow key={fund.fundName}>
              <TableCell className="max-w-[280px] truncate font-medium" title={fund.fundName}>
                {fund.fundName}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNav(fund.latestNav)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fund.previousNav !== null ? formatNav(fund.previousNav) : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <SignedPercent value={fund.navChange} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <DayChange fund={fund} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(fund.currentValue)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <SignedPercent value={fund.weekChange} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <SignedPercent value={fund.monthChange} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

export default function MfTodaySection({ summary }: { summary: MfDailySummary }) {
  const bars = useMemo(
    () =>
      summary.funds
        .filter((fund) => !fund.isStale)
        .map((fund) => ({
          label: fund.fundName,
          change: fund.valueChange,
          changePct: fund.navChange?.changePct ?? 0,
        })),
    [summary.funds]
  );

  if (!summary.funds.length) return null;

  const basis =
    summary.latestNavDate && summary.previousNavDate
      ? `NAV of ${formatNavDate(summary.latestNavDate)} vs ${formatNavDate(summary.previousNavDate)}`
      : 'Latest NAV';

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Today&apos;s move</CardTitle>
        <p className="text-sm text-muted-foreground">
          {basis}. Fund houses publish NAVs after market close, so this reflects the latest
          published day.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SummaryTiles summary={summary} />
        {bars.length > 1 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Contribution by fund</h3>
            <ChangeBarChart bars={bars} />
          </div>
        )}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Fund-wise movement</h3>
          <FundMovesTable funds={summary.funds} />
        </div>
      </CardContent>
    </Card>
  );
}
