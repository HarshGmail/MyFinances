'use client';

import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { MobileDataCard, MobileDataMetric } from '@/components/custom/MobileDataCard';
import { useGoldLeasesQuery } from '@myfinances/core/api';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import type { GoldAccountSummary, GoldLease, GoldTransaction } from '@myfinances/core/types';
import { LeaseMonth, useGoldLeaseData } from '@myfinances/core/hooks/useGoldLeaseData';

const GRAMS_PRECISION = 4;

function formatGrams(grams: number): string {
  return `${grams.toFixed(GRAMS_PRECISION)} g`;
}

function formatShortDate(date: string): string {
  return format(new Date(date), 'dd MMM yy');
}

function LeaseInterestChart({
  months,
  currentRate,
}: {
  months: LeaseMonth[];
  currentRate: number;
}) {
  const { theme } = useAppStore();

  const options = useMemo<Highcharts.Options>(() => {
    const textColor = theme === 'dark' ? '#e5e7eb' : '#18181b';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    return {
      chart: { type: 'column', backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
      title: {
        text: 'Monthly Lease Interest',
        style: {
          fontWeight: '600',
          fontSize: '1.1rem',
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
      xAxis: {
        categories: months.map((m) => m.label),
        labels: { style: { color: textColor, fontSize: '11px' } },
        lineColor: gridColor,
        tickColor: gridColor,
      },
      yAxis: {
        title: { text: 'Gold (g)', style: { color: textColor } },
        labels: { style: { color: textColor } },
        gridLineWidth: 0.5,
        gridLineColor: gridColor,
        min: 0,
      },
      plotOptions: { column: { stacking: 'normal', borderWidth: 0, borderRadius: 3 } },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function (this: Highcharts.Point): string {
          const month = months[this.index];
          const valueToday =
            currentRate > 0 ? ` · ${formatCurrency(month.netGrams * currentRate)} today` : '';
          return `<div style="font-size:12px;padding:4px">
            <b>${month.label}</b><br/>
            Earned: ${formatGrams(month.grossGrams)}<br/>
            TDS: −${formatGrams(month.tdsGrams)}<br/>
            <b>Net: ${formatGrams(month.netGrams)}</b>${valueToday}
          </div>`;
        },
      },
      series: [
        {
          type: 'column',
          name: 'Net interest',
          data: months.map((m) => m.netGrams),
          color: '#eab308',
        },
        { type: 'column', name: 'TDS', data: months.map((m) => m.tdsGrams), color: '#94a3b8' },
      ],
      legend: { itemStyle: { color: textColor, fontWeight: 'normal', fontSize: '12px' } },
      credits: { enabled: false },
    };
  }, [months, currentRate, theme]);

  return (
    <div className="bg-card rounded-lg p-4">
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        containerProps={{ style: { height: 320 } }}
      />
    </div>
  );
}

function LeasedVsAvailable({ summary }: { summary: GoldAccountSummary }) {
  const leasedShare = summary.totalGold > 0 ? (summary.leasedGold / summary.totalGold) * 100 : 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          SafeGold balance · as of {formatShortDate(summary.asOf)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={leasedShare} indicatorClassName="bg-yellow-500" className="h-3 bg-muted" />
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">On lease</div>
            <div className="font-semibold">{formatGrams(summary.leasedGold)}</div>
            <div className="text-xs text-muted-foreground">{leasedShare.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Available to sell</div>
            <div className="font-semibold">{formatGrams(summary.availableGold)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Total</div>
            <div className="font-semibold">{formatGrams(summary.totalGold)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveLeasesTable({ leases }: { leases: GoldLease[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Active leases ({leases.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="md:hidden space-y-3">
          {leases.map((lease) => (
            <MobileDataCard
              key={lease.commitId}
              title={lease.borrower}
              headline={formatGrams(lease.leasedGrams)}
              subline={`${lease.yieldPercent}% p.a.`}
            >
              <MobileDataMetric label="Earned">{formatGrams(lease.earnedGrams)}</MobileDataMetric>
              <MobileDataMetric label="Ends">{formatShortDate(lease.endDate)}</MobileDataMetric>
              <MobileDataMetric label="Payouts left">{lease.remainingPayouts}</MobileDataMetric>
            </MobileDataCard>
          ))}
        </div>
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Borrower</TableHead>
              <TableHead className="text-right">Leased</TableHead>
              <TableHead className="text-right">Yield</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="text-right">Earned so far</TableHead>
              <TableHead className="text-right">Payouts left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leases.map((lease) => (
              <TableRow key={lease.commitId}>
                <TableCell>{lease.borrower}</TableCell>
                <TableCell className="text-right">{formatGrams(lease.leasedGrams)}</TableCell>
                <TableCell className="text-right">{lease.yieldPercent}%</TableCell>
                <TableCell>{formatShortDate(lease.startDate)}</TableCell>
                <TableCell>{formatShortDate(lease.endDate)}</TableCell>
                <TableCell className="text-right">{formatGrams(lease.earnedGrams)}</TableCell>
                <TableCell className="text-right">{lease.remainingPayouts}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function GoldLeaseSection({
  transactions,
  currentRate,
}: {
  transactions: GoldTransaction[] | undefined;
  currentRate: number;
}) {
  const { data } = useGoldLeasesQuery();
  const { months, totals, latestMonth, activeLeases, activeLeaseStats } = useGoldLeaseData(
    transactions,
    data?.leases ?? []
  );
  const accountSummary = data?.accountSummary ?? null;

  if (months.length === 0 && activeLeases.length === 0 && !accountSummary) return null;

  const valueOf = (grams: number) => (currentRate > 0 ? formatCurrency(grams * currentRate) : '—');

  return (
    <section className="mt-6 space-y-4">
      <h3 className="text-xl font-semibold">Gold Leasing</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatCard
          label={latestMonth ? `Interest for ${latestMonth.label} (net)` : 'Last month interest'}
          value={latestMonth ? formatGrams(latestMonth.netGrams) : '—'}
          valueClassName="text-xl"
        >
          <div className="text-xs text-muted-foreground mt-1">
            {latestMonth ? `${valueOf(latestMonth.netGrams)} today` : 'No payouts yet'}
          </div>
        </SummaryStatCard>
        <SummaryStatCard
          label="Expected monthly interest"
          value={formatGrams(activeLeaseStats.expectedMonthlyGrams)}
          valueClassName="text-xl"
        >
          <div className="text-xs text-muted-foreground mt-1">
            Before TDS · {activeLeaseStats.averageYield.toFixed(2)}% avg yield
          </div>
        </SummaryStatCard>
        <SummaryStatCard
          label="Total interest earned (net)"
          value={formatGrams(totals.netGrams)}
          valueClassName="text-xl"
        >
          <div className="text-xs text-muted-foreground mt-1">{valueOf(totals.netGrams)} today</div>
        </SummaryStatCard>
        <SummaryStatCard
          label="Total TDS deducted"
          value={formatGrams(totals.tdsGrams)}
          valueClassName="text-xl"
        >
          <div className="text-xs text-muted-foreground mt-1">
            {valueOf(totals.tdsGrams)} today · of {formatGrams(totals.grossGrams)} earned
          </div>
        </SummaryStatCard>
      </div>

      {accountSummary && <LeasedVsAvailable summary={accountSummary} />}
      {months.length > 0 && <LeaseInterestChart months={months} currentRate={currentRate} />}
      {activeLeases.length > 0 && <ActiveLeasesTable leases={activeLeases} />}
    </section>
  );
}
