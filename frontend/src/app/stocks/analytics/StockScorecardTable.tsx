'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUrlNullableState, useUrlState } from '@/utils/useUrlState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from 'lucide-react';
import { StockFinancials, StocksPortfolioItem } from '@myfinances/core/types';
import { getVerdict } from '@/app/stocks/detail/[symbol]/verdicts';
import MetricEducationDrawer from '@/app/stocks/detail/[symbol]/MetricEducationDrawer';
import { ANALYTICS_METRIC_DEFINITIONS } from './analyticsMetricDefinitions';
import { MobileDataCard, MobileDataMetric } from '@/components/custom/MobileDataCard';

const COL_METRIC_MAP: Record<string, string> = {
  'P/E': 'Trailing P/E',
  'P/B': 'Price / Book',
  ROE: 'ROE',
  'Net Margin': 'Net Margin',
  'Rev Growth': 'Revenue Growth',
  'EPS Growth': 'Earnings Growth',
  Beta: 'Beta (5Y)',
  'D/E': 'Debt / Equity',
};

interface ScorecardRow {
  sym: string;
  invested: number;
  pe: number | null | undefined;
  pb: number | null | undefined;
  roe: number | null | undefined;
  netMargin: number | null | undefined;
  revGrowth: number | null | undefined;
  epsGrowth: number | null | undefined;
  beta: number | null | undefined;
  de: number | null | undefined;
}

interface ScorecardMetric {
  column: string;
  verdictKey: string;
  read: (row: ScorecardRow) => number | null | undefined;
  format: (row: ScorecardRow) => string;
}

const SCORECARD_METRICS: ScorecardMetric[] = [
  {
    column: 'P/E',
    verdictKey: 'trailingPE',
    read: (r) => r.pe,
    format: (r) => (r.pe != null ? r.pe.toFixed(1) : '—'),
  },
  {
    column: 'P/B',
    verdictKey: 'priceToBook',
    read: (r) => r.pb,
    format: (r) => (r.pb != null ? r.pb.toFixed(1) : '—'),
  },
  {
    column: 'ROE',
    verdictKey: 'returnOnEquity',
    read: (r) => r.roe,
    format: (r) => fmt(r.roe, true),
  },
  {
    column: 'Net Margin',
    verdictKey: 'profitMargins',
    read: (r) => r.netMargin,
    format: (r) => fmt(r.netMargin, true),
  },
  {
    column: 'Rev Growth',
    verdictKey: 'revenueGrowth',
    read: (r) => r.revGrowth,
    format: (r) => fmt(r.revGrowth, true),
  },
  {
    column: 'EPS Growth',
    verdictKey: 'earningsGrowth',
    read: (r) => r.epsGrowth,
    format: (r) => fmt(r.epsGrowth, true),
  },
  {
    column: 'Beta',
    verdictKey: 'beta',
    read: (r) => r.beta,
    format: (r) => (r.beta != null ? r.beta.toFixed(2) : '—'),
  },
  {
    column: 'D/E',
    verdictKey: 'debtToEquity',
    read: (r) => r.de,
    format: (r) => (r.de != null ? (r.de / 100).toFixed(2) : '—'),
  },
];

interface Props {
  analyticsData: Record<string, StockFinancials>;
  portfolio: StocksPortfolioItem[];
}

type SortKey =
  | 'investedAmount'
  | 'trailingPE'
  | 'returnOnEquity'
  | 'profitMargins'
  | 'revenueGrowth'
  | 'beta';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'investedAmount', label: 'Investment Amount' },
  { value: 'trailingPE', label: 'P/E Ratio' },
  { value: 'returnOnEquity', label: 'ROE' },
  { value: 'profitMargins', label: 'Net Margin' },
  { value: 'revenueGrowth', label: 'Revenue Growth' },
  { value: 'beta', label: 'Beta' },
];

const SORT_KEYS = SORT_OPTIONS.map((o) => o.value) as readonly SortKey[];
const SORT_DIRS = ['desc', 'asc'] as const;
type SortDir = (typeof SORT_DIRS)[number];

function verdictDot(color: string | undefined) {
  if (!color) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = color.includes('green')
    ? 'bg-green-500'
    : color.includes('red')
      ? 'bg-red-500'
      : color.includes('yellow')
        ? 'bg-yellow-400'
        : 'bg-blue-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

function fmt(v: number | null | undefined, pct = false, decimals = 1): string {
  if (v == null) return '—';
  return pct ? `${(v * 100).toFixed(decimals)}%` : v.toFixed(decimals);
}

export function StockScorecardTable({ analyticsData, portfolio }: Props) {
  const [sortKey, setSortKey] = useUrlState<SortKey>('sortKey', 'investedAmount', SORT_KEYS);
  const [sortDir, setSortDir] = useUrlState<SortDir>('sortDir', 'desc', SORT_DIRS);
  const asc = sortDir === 'asc';
  const [selectedMetric, setSelectedMetric] = useUrlNullableState('tableMetric');

  const investMap = Object.fromEntries(portfolio.map((p) => [p.stockName, p.investedAmount]));

  const rows = Object.entries(analyticsData).map(([sym, f]) => ({
    sym,
    invested: investMap[sym] ?? 0,
    pe: f.summaryDetail?.trailingPE,
    pb: f.defaultKeyStatistics?.priceToBook,
    roe: f.financialData?.returnOnEquity,
    netMargin: f.financialData?.profitMargins,
    revGrowth: f.financialData?.revenueGrowth,
    epsGrowth: f.financialData?.earningsGrowth,
    beta: f.summaryDetail?.beta,
    de: f.financialData?.debtToEquity,
  }));

  const getValue = (row: (typeof rows)[0]) => {
    if (sortKey === 'investedAmount') return row.invested;
    if (sortKey === 'trailingPE') return row.pe ?? (asc ? Infinity : -Infinity);
    if (sortKey === 'returnOnEquity') return row.roe ?? (asc ? -Infinity : Infinity);
    if (sortKey === 'profitMargins') return row.netMargin ?? (asc ? -Infinity : Infinity);
    if (sortKey === 'revenueGrowth') return row.revGrowth ?? (asc ? -Infinity : Infinity);
    if (sortKey === 'beta') return row.beta ?? (asc ? Infinity : -Infinity);
    return 0;
  };

  const sorted = [...rows].sort((a, b) => {
    const diff = getValue(a) - getValue(b);
    return asc ? diff : -diff;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Stock Scorecard</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All holdings with key fundamentals and colored verdicts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => setSortDir(asc ? 'desc' : 'asc')}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted/50 transition-colors"
              >
                {asc ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="md:overflow-x-auto">
          <div className="md:hidden space-y-3">
            {sorted.map((r) => (
              <MobileDataCard
                key={r.sym}
                title={r.sym}
                headline={`₹${r.invested.toLocaleString('en-IN')}`}
                columns={2}
              >
                {SCORECARD_METRICS.map((metric) => (
                  <MobileDataMetric key={metric.column} label={metric.column}>
                    <span className="flex items-center gap-1.5">
                      {metric.format(r)}
                      {verdictDot(getVerdict(metric.verdictKey, metric.read(r))?.color)}
                    </span>
                  </MobileDataMetric>
                ))}
              </MobileDataCard>
            ))}
          </div>

          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                {SCORECARD_METRICS.map(({ column }) => (
                  <TableHead key={column} className="text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {column}
                      <button
                        onClick={() => setSelectedMetric(COL_METRIC_MAP[column])}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.sym}>
                  <TableCell className="font-medium">{r.sym}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ₹{r.invested.toLocaleString('en-IN')}
                  </TableCell>
                  {SCORECARD_METRICS.map((metric) => (
                    <TableCell key={metric.column} className="text-right">
                      <span className="flex items-center justify-end gap-1.5">
                        {metric.format(r)}
                        {verdictDot(getVerdict(metric.verdictKey, metric.read(r))?.color)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MetricEducationDrawer
        isOpen={selectedMetric !== null}
        metricLabel={selectedMetric ?? ''}
        onClose={() => setSelectedMetric(null)}
        realData={null}
        definitions={ANALYTICS_METRIC_DEFINITIONS}
      />
    </>
  );
}
