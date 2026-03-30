import { StockFinancials } from '@/api/dataInterface';

export type Verdict = { text: string; color: string };

export const INTERVALS = [
  { label: '1D', range: '1d', interval: '5m' },
  { label: '1W', range: '1w', interval: '1h' },
  { label: '1M', range: '1m', interval: '1d' },
  { label: '3M', range: '3m', interval: '1d' },
  { label: '1Y', range: '1y', interval: '1d' },
] as const;

export type Interval = (typeof INTERVALS)[number];

export function formatLargeNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}₹${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}₹${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`;
  return `${sign}₹${abs.toFixed(2)}`;
}

export function getVerdict(metric: string, val: number | undefined | null): Verdict | null {
  if (val === undefined || val === null || isNaN(val)) return null;
  switch (metric) {
    case 'trailingPE':
      if (val < 0) return { text: 'Negative — company unprofitable', color: 'text-red-500' };
      if (val < 15) return { text: 'Value territory', color: 'text-green-600' };
      if (val < 25) return { text: 'Fairly valued', color: 'text-blue-500' };
      if (val < 40) return { text: 'Richly valued', color: 'text-yellow-500' };
      return { text: 'Expensive — demands strong growth', color: 'text-red-500' };
    case 'forwardPE':
      if (val < 15) return { text: 'Attractive forward valuation', color: 'text-green-600' };
      if (val < 25) return { text: 'Reasonable', color: 'text-blue-500' };
      return { text: 'Market prices in high growth', color: 'text-yellow-500' };
    case 'debtToEquity':
      if (val < 50) return { text: 'Low debt, financially strong', color: 'text-green-600' };
      if (val < 150) return { text: 'Moderate leverage', color: 'text-blue-500' };
      return { text: 'High debt — monitor closely', color: 'text-red-500' };
    case 'returnOnEquity':
      if (val < 0.1) return { text: 'Below average', color: 'text-yellow-500' };
      if (val < 0.2) return { text: 'Healthy returns', color: 'text-blue-500' };
      return { text: 'Strong returns on equity', color: 'text-green-600' };
    case 'returnOnAssets':
      if (val < 0.05) return { text: 'Low asset efficiency', color: 'text-yellow-500' };
      if (val < 0.1) return { text: 'Decent asset utilisation', color: 'text-blue-500' };
      return { text: 'Efficient use of assets', color: 'text-green-600' };
    case 'operatingMargins':
      if (val < 0.05) return { text: 'Thin margins — risk of compression', color: 'text-red-500' };
      if (val < 0.15) return { text: 'Moderate margins', color: 'text-blue-500' };
      return { text: 'Strong operating margins', color: 'text-green-600' };
    case 'grossMargins':
      if (val < 0.2) return { text: 'Low gross margin', color: 'text-yellow-500' };
      if (val < 0.4) return { text: 'Decent', color: 'text-blue-500' };
      return { text: 'High gross margin', color: 'text-green-600' };
    case 'profitMargins':
      if (val < 0) return { text: 'Operating at a net loss', color: 'text-red-500' };
      if (val < 0.05) return { text: 'Thin net margins', color: 'text-yellow-500' };
      if (val < 0.15) return { text: 'Healthy net margins', color: 'text-blue-500' };
      return { text: 'Excellent profitability', color: 'text-green-600' };
    case 'currentRatio':
      if (val < 1)
        return { text: 'Liquidity risk — liabilities exceed assets', color: 'text-red-500' };
      if (val < 2) return { text: 'Adequate liquidity', color: 'text-blue-500' };
      return { text: 'Strong short-term liquidity', color: 'text-green-600' };
    case 'pegRatio':
      if (val <= 0) return null;
      if (val < 1) return { text: 'Undervalued relative to growth', color: 'text-green-600' };
      if (val < 2) return { text: 'Fair value for growth', color: 'text-blue-500' };
      return { text: 'Pricey for the growth rate', color: 'text-red-500' };
    case 'priceToBook':
      if (val < 1) return { text: 'Trading below book value', color: 'text-green-600' };
      if (val < 3) return { text: 'Reasonable P/B', color: 'text-blue-500' };
      return { text: 'Premium to book value', color: 'text-yellow-500' };
    case 'beta':
      if (val < 0.8) return { text: 'Low volatility relative to market', color: 'text-blue-500' };
      if (val < 1.2) return { text: 'Market-like volatility', color: 'text-blue-500' };
      return { text: 'High volatility', color: 'text-yellow-500' };
    case 'revenueGrowth':
      if (val < 0) return { text: 'Revenue declining YoY', color: 'text-red-500' };
      if (val < 0.1) return { text: 'Slow growth', color: 'text-yellow-500' };
      if (val < 0.25) return { text: 'Healthy growth', color: 'text-green-600' };
      return { text: 'High growth company', color: 'text-green-600' };
    case 'earningsGrowth':
      if (val < 0) return { text: 'Earnings declining YoY', color: 'text-red-500' };
      if (val < 0.1) return { text: 'Modest earnings growth', color: 'text-yellow-500' };
      return { text: 'Earnings growing strongly', color: 'text-green-600' };
    default:
      return null;
  }
}

export type MetricCard = { label: string; value: string; verdict: Verdict | null };

export interface MetricCalculation {
  label1?: string;
  value1?: number | string;
  label2?: string;
  value2?: number | string;
  result?: string;
  formula?: string;
}

export function getMetricCalculation(
  metricLabel: string,
  financials: StockFinancials
): MetricCalculation | null {
  const { summaryDetail: sd, defaultKeyStatistics: dks, financialData: fd, price: p } = financials;

  // Helper formatters
  const fmt = (v: number | undefined) => (v !== undefined ? v.toFixed(2) : null);
  const fmtPct = (v: number | undefined) => (v !== undefined ? (v * 100).toFixed(1) : null);

  switch (metricLabel) {
    case 'Trailing P/E':
      if (p?.regularMarketPrice !== undefined && dks?.trailingEps !== undefined) {
        const pe = p.regularMarketPrice / dks.trailingEps;
        return {
          label1: 'Current Stock Price',
          value1: `₹${fmt(p.regularMarketPrice)}`,
          label2: 'EPS (TTM)',
          value2: `₹${fmt(dks.trailingEps)}`,
          result: `${pe.toFixed(1)}`,
          formula: 'P/E = Stock Price ÷ EPS',
        };
      }
      return null;

    case 'Forward P/E':
      if (p?.regularMarketPrice !== undefined && dks?.forwardEps !== undefined) {
        const fpe = p.regularMarketPrice / dks.forwardEps;
        return {
          label1: 'Current Stock Price',
          value1: `₹${fmt(p.regularMarketPrice)}`,
          label2: 'Forward EPS',
          value2: `₹${fmt(dks.forwardEps)}`,
          result: `${fpe.toFixed(1)}`,
          formula: 'Forward P/E = Stock Price ÷ Forward EPS',
        };
      }
      return null;

    case 'Price / Book':
      if (dks?.priceToBook !== undefined) {
        return {
          result: dks.priceToBook.toFixed(2),
          formula: 'P/B = Stock Price ÷ Book Value Per Share',
        };
      }
      return null;

    case 'Operating Margin':
      if (fd?.operatingMargins !== undefined) {
        const pct = fmtPct(fd.operatingMargins);
        return {
          result: `${pct}%`,
          formula: 'Operating Margin = Operating Income ÷ Revenue × 100',
        };
      }
      return null;

    case 'Gross Margin':
      if (fd?.grossMargins !== undefined) {
        const pct = fmtPct(fd.grossMargins);
        return {
          result: `${pct}%`,
          formula: 'Gross Margin = (Revenue - COGS) ÷ Revenue × 100',
        };
      }
      return null;

    case 'Net Margin':
      if (fd?.profitMargins !== undefined) {
        const pct = fmtPct(fd.profitMargins);
        return {
          result: `${pct}%`,
          formula: 'Net Margin = Net Income ÷ Revenue × 100',
        };
      }
      return null;

    case 'Revenue Growth':
      if (fd?.revenueGrowth !== undefined) {
        const pct = fmtPct(fd.revenueGrowth);
        return {
          result: `${pct}%`,
          formula: 'Revenue Growth = (Current Year Revenue - Previous Year) ÷ Previous Year × 100',
        };
      }
      return null;

    case 'Earnings Growth':
      if (fd?.earningsGrowth !== undefined) {
        const pct = fmtPct(fd.earningsGrowth);
        return {
          result: `${pct}%`,
          formula: 'Earnings Growth = (Current Year EPS - Previous Year EPS) ÷ Previous Year × 100',
        };
      }
      return null;

    case 'Debt / Equity':
      if (fd?.debtToEquity !== undefined) {
        return {
          result: fd.debtToEquity.toFixed(2),
          formula: "Debt/Equity = Total Debt ÷ Shareholders' Equity",
        };
      }
      return null;

    case 'Current Ratio':
      if (fd?.currentRatio !== undefined) {
        return {
          result: fd.currentRatio.toFixed(2),
          formula: 'Current Ratio = Current Assets ÷ Current Liabilities',
        };
      }
      return null;

    case 'ROE':
      if (fd?.returnOnEquity !== undefined) {
        const pct = fmtPct(fd.returnOnEquity);
        return {
          result: `${pct}%`,
          formula: "ROE = Net Income ÷ Average Shareholders' Equity × 100",
        };
      }
      return null;

    case 'ROA':
      if (fd?.returnOnAssets !== undefined) {
        const pct = fmtPct(fd.returnOnAssets);
        return {
          result: `${pct}%`,
          formula: 'ROA = Net Income ÷ Total Assets × 100',
        };
      }
      return null;

    case 'PEG Ratio':
      if (dks?.pegRatio !== undefined) {
        return {
          result: dks.pegRatio.toFixed(2),
          formula: 'PEG Ratio = P/E Ratio ÷ Earnings Growth Rate',
        };
      }
      return null;

    default:
      return null;
  }
}

export function buildMetricCards(financials: StockFinancials): MetricCard[] {
  const { summaryDetail: sd, defaultKeyStatistics: dks, financialData: fd, price: p } = financials;

  const pct = (v: number | undefined) => (v !== undefined ? `${(v * 100).toFixed(1)}%` : '—');
  const num = (v: number | undefined, d = 2) => (v !== undefined ? v.toFixed(d) : '—');

  const cards: MetricCard[] = [
    {
      label: 'Trailing P/E',
      value: sd?.trailingPE !== undefined ? num(sd.trailingPE, 1) : '—',
      verdict: getVerdict('trailingPE', sd?.trailingPE),
    },
    {
      label: 'Forward P/E',
      value: sd?.forwardPE !== undefined ? num(sd.forwardPE, 1) : '—',
      verdict: getVerdict('forwardPE', sd?.forwardPE),
    },
    {
      label: 'Market Cap',
      value: p?.marketCap !== undefined ? formatLargeNum(p.marketCap) : '—',
      verdict: null,
    },
    {
      label: 'EPS (TTM)',
      value: dks?.trailingEps !== undefined ? `₹${num(dks.trailingEps)}` : '—',
      verdict: null,
    },
    {
      label: 'Forward EPS',
      value: dks?.forwardEps !== undefined ? `₹${num(dks.forwardEps)}` : '—',
      verdict: null,
    },
    {
      label: 'PEG Ratio',
      value: dks?.pegRatio !== undefined ? num(dks.pegRatio) : '—',
      verdict: getVerdict('pegRatio', dks?.pegRatio),
    },
    {
      label: 'Price / Book',
      value: dks?.priceToBook !== undefined ? num(dks.priceToBook) : '—',
      verdict: getVerdict('priceToBook', dks?.priceToBook),
    },
    {
      label: 'Beta (5Y)',
      value: sd?.beta !== undefined ? num(sd.beta) : '—',
      verdict: getVerdict('beta', sd?.beta),
    },
    {
      label: '52W High',
      value: sd?.fiftyTwoWeekHigh !== undefined ? `₹${num(sd.fiftyTwoWeekHigh)}` : '—',
      verdict: null,
    },
    {
      label: '52W Low',
      value: sd?.fiftyTwoWeekLow !== undefined ? `₹${num(sd.fiftyTwoWeekLow)}` : '—',
      verdict: null,
    },
    {
      label: 'Dividend Yield',
      value: sd?.dividendYield !== undefined ? pct(sd.dividendYield) : '—',
      verdict: null,
    },
    {
      label: 'ROE',
      value: fd?.returnOnEquity !== undefined ? pct(fd.returnOnEquity) : '—',
      verdict: getVerdict('returnOnEquity', fd?.returnOnEquity),
    },
    {
      label: 'ROA',
      value: fd?.returnOnAssets !== undefined ? pct(fd.returnOnAssets) : '—',
      verdict: getVerdict('returnOnAssets', fd?.returnOnAssets),
    },
    {
      label: 'Operating Margin',
      value: fd?.operatingMargins !== undefined ? pct(fd.operatingMargins) : '—',
      verdict: getVerdict('operatingMargins', fd?.operatingMargins),
    },
    {
      label: 'Gross Margin',
      value: fd?.grossMargins !== undefined ? pct(fd.grossMargins) : '—',
      verdict: getVerdict('grossMargins', fd?.grossMargins),
    },
    {
      label: 'Net Margin',
      value: fd?.profitMargins !== undefined ? pct(fd.profitMargins) : '—',
      verdict: getVerdict('profitMargins', fd?.profitMargins),
    },
    {
      label: 'Debt / Equity',
      value: fd?.debtToEquity !== undefined ? num(fd.debtToEquity, 1) : '—',
      verdict: getVerdict('debtToEquity', fd?.debtToEquity),
    },
    {
      label: 'Current Ratio',
      value: fd?.currentRatio !== undefined ? num(fd.currentRatio) : '—',
      verdict: getVerdict('currentRatio', fd?.currentRatio),
    },
    {
      label: 'Revenue Growth',
      value: fd?.revenueGrowth !== undefined ? pct(fd.revenueGrowth) : '—',
      verdict: getVerdict('revenueGrowth', fd?.revenueGrowth),
    },
    {
      label: 'Earnings Growth',
      value: fd?.earningsGrowth !== undefined ? pct(fd.earningsGrowth) : '—',
      verdict: getVerdict('earningsGrowth', fd?.earningsGrowth),
    },
    {
      label: 'Free Cash Flow',
      value: fd?.freeCashflow !== undefined ? formatLargeNum(fd.freeCashflow) : '—',
      verdict: null,
    },
    {
      label: 'Total Cash',
      value: fd?.totalCash !== undefined ? formatLargeNum(fd.totalCash) : '—',
      verdict: null,
    },
    {
      label: 'Total Debt',
      value: fd?.totalDebt !== undefined ? formatLargeNum(fd.totalDebt) : '—',
      verdict: null,
    },
  ];

  return cards.filter((c) => c.value !== '—');
}
