'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { StockFinancials, StocksPortfolioItem } from '@/api/dataInterface';
import { getVerdict } from '@/app/stocks/detail/[symbol]/verdicts';
import MetricEducationDrawer from '@/app/stocks/detail/[symbol]/MetricEducationDrawer';
import { ANALYTICS_METRIC_DEFINITIONS } from './analyticsMetricDefinitions';

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
  const [sortKey, setSortKey] = useState<SortKey>('investedAmount');
  const [asc, setAsc] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

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
                onClick={() => setAsc((p) => !p)}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted/50 transition-colors"
              >
                {asc ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                {Object.keys(COL_METRIC_MAP).map((col) => (
                  <TableHead key={col} className="text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      {col}
                      <button
                        onClick={() => setSelectedMetric(COL_METRIC_MAP[col])}
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
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      {r.pe != null ? r.pe.toFixed(1) : '—'}
                      {verdictDot(getVerdict('trailingPE', r.pe)?.color)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      {r.pb != null ? r.pb.toFixed(1) : '—'}
                      {verdictDot(getVerdict('priceToBook', r.pb)?.color)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      {fmt(r.roe, true)}
                      {verdictDot(getVerdict('returnOnEquity', r.roe)?.color)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      {fmt(r.netMargin, true)}
                      {verdictDot(getVerdict('profitMargins', r.netMargin)?.color)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      {fmt(r.revGrowth, true)}
                      {verdictDot(getVerdict('revenueGrowth', r.revGrowth)?.color)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      {fmt(r.epsGrowth, true)}
                      {verdictDot(getVerdict('earningsGrowth', r.epsGrowth)?.color)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      {r.beta != null ? r.beta.toFixed(2) : '—'}
                      {verdictDot(getVerdict('beta', r.beta)?.color)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      {r.de != null ? (r.de / 100).toFixed(2) : '—'}
                      {verdictDot(getVerdict('debtToEquity', r.de)?.color)}
                    </span>
                  </TableCell>
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
