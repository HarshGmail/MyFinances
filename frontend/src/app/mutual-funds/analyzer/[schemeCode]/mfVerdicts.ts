import { MutualFundMeta, MutualFundNavHistoryData } from '@/api/dataInterface';

export type Verdict = { text: string; color: string };
export type MetricCard = { label: string; value: string; verdict: Verdict | null };

export interface MetricCalculation {
  label1?: string;
  value1?: string | number;
  label2?: string;
  value2?: string | number;
  label3?: string;
  value3?: string | number;
  formula?: string;
  result?: string;
}

export interface MFMetrics {
  currentNAV: number;
  change1D: number;
  changePct1D: number;
  cagr1Y: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
  cagrInception: number | null;
  ytdReturn: number | null;
  volatility1Y: number | null;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  inceptionDate: string | null;
  fundHouse: string | null;
  category: string | null;
  schemeType: string | null;
  isin: string | null;
}

const RISK_FREE_RATE = 0.065; // 6.5% for India

function parseNAV(navStr: string | number): number {
  const nav = typeof navStr === 'string' ? parseFloat(navStr) : navStr;
  return isNaN(nav) ? 0 : nav;
}

function cagr(startValue: number, endValue: number, years: number): number | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return null;
  const result = Math.pow(endValue / startValue, 1 / years) - 1;
  return isNaN(result) ? null : result;
}

function getDateNYearsAgo(refDate: Date, years: number): Date {
  const d = new Date(refDate);
  d.setFullYear(d.getFullYear() - Math.floor(years));
  return d;
}

function getDateNDaysAgo(refDate: Date, days: number): Date {
  const d = new Date(refDate);
  d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000);
  return d;
}

function parseNavDate(dateStr: string): Date {
  // Format: "15-04-2026"
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function findNAVAtDate(navData: MutualFundNavHistoryData[], targetDate: Date): number | null {
  // Find NAV on or closest to targetDate (going backward)
  for (const item of navData) {
    const itemDate = parseNavDate(item.date);
    if (itemDate <= targetDate) {
      return parseNAV(item.nav);
    }
  }
  return null;
}

function getYTDReturn(navData: MutualFundNavHistoryData[]): number | null {
  if (navData.length < 2) return null;
  const currentDate = parseNavDate(navData[0].date);
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);

  let startNAV: number | null = null;
  for (const item of navData) {
    const itemDate = parseNavDate(item.date);
    if (itemDate <= yearStart) {
      startNAV = parseNAV(item.nav);
      break;
    }
  }

  if (!startNAV) {
    // If no data before year start, use earliest available
    startNAV = parseNAV(navData[navData.length - 1].nav);
  }

  const endNAV = parseNAV(navData[0].nav);
  return endNAV > 0 && startNAV > 0 ? (endNAV - startNAV) / startNAV : null;
}

function getAnnualizedVolatility(
  navData: MutualFundNavHistoryData[],
  periodDays: number
): number | null {
  if (navData.length < 2) return null;

  const cutoffDate = getDateNYearsAgo(parseNavDate(navData[0].date), periodDays / 365);
  const relevantData = navData.filter((item) => parseNavDate(item.date) >= cutoffDate);

  if (relevantData.length < 2) return null;

  const navs = relevantData.map((item) => parseNAV(item.nav)).reverse();
  const returns: number[] = [];

  for (let i = 1; i < navs.length; i++) {
    if (navs[i] > 0) {
      returns.push(Math.log(navs[i] / navs[i - 1]));
    }
  }

  if (returns.length < 2) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  const annualized = stdDev * Math.sqrt(252); // 252 trading days

  return isNaN(annualized) ? null : annualized;
}

function getMaxDrawdown(navData: MutualFundNavHistoryData[]): number | null {
  if (navData.length < 2) return null;

  const navs = navData.map((item) => parseNAV(item.nav)).reverse(); // Oldest first
  let maxPrice = navs[0];
  let maxDD = 0;

  for (let i = 1; i < navs.length; i++) {
    if (navs[i] > maxPrice) {
      maxPrice = navs[i];
    }
    const dd = (navs[i] - maxPrice) / maxPrice;
    if (dd < maxDD) {
      maxDD = dd;
    }
  }

  return maxDD;
}

export function computeMFMetrics(
  navData: MutualFundNavHistoryData[],
  meta: MutualFundMeta | null
): MFMetrics {
  const current = parseNAV(navData[0]?.nav);
  const prev = navData.length > 1 ? parseNAV(navData[1]?.nav) : current;
  const change1D = current - prev;
  const changePct1D = prev > 0 ? change1D / prev : 0;

  const currentDate = parseNavDate(navData[0]?.date);
  const inception = navData[navData.length - 1];
  const inceptionDate = inception?.date || null;
  const inceptionNAV = inception ? parseNAV(inception.nav) : current;
  const inceptionYears =
    (currentDate.getTime() - parseNavDate(inceptionDate || navData[0].date).getTime()) /
    (1000 * 60 * 60 * 24 * 365.25);

  const cagr1Y = cagr(
    findNAVAtDate(navData, getDateNYearsAgo(currentDate, 1)) || current,
    current,
    1
  );
  const cagr3Y = cagr(
    findNAVAtDate(navData, getDateNYearsAgo(currentDate, 3)) || current,
    current,
    3
  );
  const cagr5Y = cagr(
    findNAVAtDate(navData, getDateNYearsAgo(currentDate, 5)) || current,
    current,
    5
  );
  const cagrInception = cagr(inceptionNAV, current, inceptionYears);

  const vol1Y = getAnnualizedVolatility(navData, 365);
  const sharpe = vol1Y && cagr1Y ? (cagr1Y - RISK_FREE_RATE) / vol1Y : null;

  return {
    currentNAV: current,
    change1D,
    changePct1D,
    cagr1Y,
    cagr3Y,
    cagr5Y,
    cagrInception,
    ytdReturn: getYTDReturn(navData),
    volatility1Y: vol1Y,
    maxDrawdown: getMaxDrawdown(navData),
    sharpeRatio: sharpe,
    inceptionDate,
    fundHouse: meta?.fund_house || null,
    category: meta?.scheme_category || null,
    schemeType: meta?.scheme_type || null,
    isin: meta?.isin_growth || null,
  };
}

export function getMFVerdict(metric: string, val: number | undefined | null): Verdict | null {
  if (val === undefined || val === null || isNaN(val)) return null;

  switch (metric) {
    case 'cagr1Y':
      if (val < 0.05) return { text: 'Poor performance', color: 'text-red-500' };
      if (val < 0.1) return { text: 'Moderate growth', color: 'text-yellow-500' };
      if (val < 0.2) return { text: 'Good growth', color: 'text-green-600' };
      return { text: 'Excellent returns', color: 'text-green-600' };

    case 'cagr3Y':
      if (val < 0.08) return { text: 'Below average 3Y return', color: 'text-yellow-500' };
      if (val < 0.12) return { text: 'Steady 3Y growth', color: 'text-blue-500' };
      if (val < 0.2) return { text: 'Strong 3Y performance', color: 'text-green-600' };
      return { text: 'Exceptional 3Y growth', color: 'text-green-600' };

    case 'cagr5Y':
      if (val < 0.08) return { text: 'Below average 5Y return', color: 'text-yellow-500' };
      if (val < 0.12) return { text: 'Steady 5Y growth', color: 'text-blue-500' };
      if (val < 0.2) return { text: 'Strong 5Y performance', color: 'text-green-600' };
      return { text: 'Exceptional 5Y growth', color: 'text-green-600' };

    case 'volatility':
      if (val < 0.05) return { text: 'Low volatility — stable', color: 'text-green-600' };
      if (val < 0.15) return { text: 'Moderate volatility', color: 'text-blue-500' };
      if (val < 0.25) return { text: 'High volatility', color: 'text-yellow-500' };
      return { text: 'Very high volatility — risky', color: 'text-red-500' };

    case 'sharpe':
      if (val < 0.5) return { text: 'Poor risk-adjusted returns', color: 'text-red-500' };
      if (val < 1) return { text: 'Decent risk-adjusted returns', color: 'text-blue-500' };
      return { text: 'Strong risk-adjusted returns', color: 'text-green-600' };

    case 'maxDrawdown':
      if (val > -0.15) return { text: 'Resilient to downturns', color: 'text-green-600' };
      if (val > -0.3) return { text: 'Moderate drawdown risk', color: 'text-yellow-500' };
      return { text: 'High drawdown risk — volatile', color: 'text-red-500' };

    case 'ytdReturn':
      if (val < 0) return { text: 'Negative YTD', color: 'text-red-500' };
      if (val < 0.05) return { text: 'Slow YTD progress', color: 'text-yellow-500' };
      if (val < 0.15) return { text: 'Good YTD progress', color: 'text-green-600' };
      return { text: 'Excellent YTD returns', color: 'text-green-600' };

    default:
      return null;
  }
}

export function buildMFMetricCards(metrics: MFMetrics): MetricCard[] {
  const cards: MetricCard[] = [];

  const formatPct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(2)}%`);
  const formatNav = (v: number) => `₹${v.toFixed(2)}`;
  const formatVol = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(2)}%`);

  cards.push({
    label: 'Current NAV',
    value: formatNav(metrics.currentNAV),
    verdict: null,
  });

  if (metrics.cagr1Y !== null) {
    cards.push({
      label: '1Y CAGR',
      value: formatPct(metrics.cagr1Y),
      verdict: getMFVerdict('cagr1Y', metrics.cagr1Y),
    });
  }

  if (metrics.cagr3Y !== null) {
    cards.push({
      label: '3Y CAGR',
      value: formatPct(metrics.cagr3Y),
      verdict: getMFVerdict('cagr3Y', metrics.cagr3Y),
    });
  }

  if (metrics.cagr5Y !== null) {
    cards.push({
      label: '5Y CAGR',
      value: formatPct(metrics.cagr5Y),
      verdict: getMFVerdict('cagr5Y', metrics.cagr5Y),
    });
  }

  if (metrics.cagrInception !== null) {
    cards.push({
      label: 'Since Inception CAGR',
      value: formatPct(metrics.cagrInception),
      verdict: null,
    });
  }

  if (metrics.ytdReturn !== null) {
    cards.push({
      label: 'YTD Return',
      value: formatPct(metrics.ytdReturn),
      verdict: getMFVerdict('ytdReturn', metrics.ytdReturn),
    });
  }

  if (metrics.volatility1Y !== null) {
    cards.push({
      label: 'Volatility (1Y)',
      value: formatVol(metrics.volatility1Y),
      verdict: getMFVerdict('volatility', metrics.volatility1Y),
    });
  }

  if (metrics.sharpeRatio !== null) {
    cards.push({
      label: 'Sharpe Ratio (1Y)',
      value: metrics.sharpeRatio.toFixed(2),
      verdict: getMFVerdict('sharpe', metrics.sharpeRatio),
    });
  }

  if (metrics.maxDrawdown !== null) {
    cards.push({
      label: 'Max Drawdown',
      value: `${(metrics.maxDrawdown * 100).toFixed(2)}%`,
      verdict: getMFVerdict('maxDrawdown', metrics.maxDrawdown),
    });
  }

  if (metrics.fundHouse) {
    cards.push({
      label: 'Fund House',
      value: metrics.fundHouse,
      verdict: null,
    });
  }

  if (metrics.category) {
    cards.push({
      label: 'Category',
      value: metrics.category,
      verdict: null,
    });
  }

  if (metrics.schemeType) {
    cards.push({
      label: 'Scheme Type',
      value: metrics.schemeType,
      verdict: null,
    });
  }

  if (metrics.isin) {
    cards.push({
      label: 'ISIN (Growth)',
      value: metrics.isin,
      verdict: null,
    });
  }

  return cards;
}

export function getMFMetricCalculation(
  metricLabel: string,
  metrics: MFMetrics,
  navData: MutualFundNavHistoryData[]
): MetricCalculation | null {
  if (!navData || navData.length < 2) return null;

  const currentNav = parseNAV(navData[0].nav);
  const currentDate = parseNavDate(navData[0].date);

  switch (metricLabel) {
    case '1Y CAGR': {
      if (metrics.cagr1Y === null) return null;
      const startNav1Y = findNAVAtDate(navData, getDateNYearsAgo(currentDate, 1));
      if (!startNav1Y) return null;
      return {
        label1: 'End NAV',
        value1: `₹${currentNav.toFixed(2)}`,
        label2: 'Start NAV (1Y ago)',
        value2: `₹${startNav1Y.toFixed(2)}`,
        formula: `(${currentNav.toFixed(2)} ÷ ${startNav1Y.toFixed(2)})^(1/1) - 1`,
        result: `${(metrics.cagr1Y * 100).toFixed(2)}%`,
      };
    }

    case '3Y CAGR': {
      if (metrics.cagr3Y === null) return null;
      const startNav3Y = findNAVAtDate(navData, getDateNYearsAgo(currentDate, 3));
      if (!startNav3Y) return null;
      return {
        label1: 'End NAV',
        value1: `₹${currentNav.toFixed(2)}`,
        label2: 'Start NAV (3Y ago)',
        value2: `₹${startNav3Y.toFixed(2)}`,
        formula: `(${currentNav.toFixed(2)} ÷ ${startNav3Y.toFixed(2)})^(1/3) - 1`,
        result: `${(metrics.cagr3Y * 100).toFixed(2)}%`,
      };
    }

    case '5Y CAGR': {
      if (metrics.cagr5Y === null) return null;
      const startNav5Y = findNAVAtDate(navData, getDateNYearsAgo(currentDate, 5));
      if (!startNav5Y) return null;
      return {
        label1: 'End NAV',
        value1: `₹${currentNav.toFixed(2)}`,
        label2: 'Start NAV (5Y ago)',
        value2: `₹${startNav5Y.toFixed(2)}`,
        formula: `(${currentNav.toFixed(2)} ÷ ${startNav5Y.toFixed(2)})^(1/5) - 1`,
        result: `${(metrics.cagr5Y * 100).toFixed(2)}%`,
      };
    }

    case 'Volatility (1Y)':
      if (metrics.volatility1Y === null) return null;
      return {
        label1: 'Annualized Std Dev',
        value1: `${(metrics.volatility1Y * 100).toFixed(2)}%`,
        formula: 'Daily log returns → Std Dev → × √252',
        result: `${(metrics.volatility1Y * 100).toFixed(2)}%`,
      };

    case 'Sharpe Ratio (1Y)':
      if (metrics.sharpeRatio === null || metrics.cagr1Y === null || metrics.volatility1Y === null)
        return null;
      return {
        label1: '1Y Return',
        value1: `${(metrics.cagr1Y * 100).toFixed(2)}%`,
        label2: 'Risk-Free Rate',
        value2: '6.50%',
        formula: `(${(metrics.cagr1Y * 100).toFixed(2)}% - 6.50%) ÷ ${(metrics.volatility1Y * 100).toFixed(2)}%`,
        result: metrics.sharpeRatio.toFixed(3),
      };

    case 'Max Drawdown':
      if (metrics.maxDrawdown === null) return null;
      return {
        label1: 'Max Drawdown',
        value1: `${(metrics.maxDrawdown * 100).toFixed(2)}%`,
        formula: 'Rolling Peak to Trough (worst % decline from peak)',
        result: `${(metrics.maxDrawdown * 100).toFixed(2)}%`,
      };

    default:
      return null;
  }
}

export const MF_INTERVALS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 3 * 365 },
  { label: '5Y', days: 5 * 365 },
  { label: 'All', days: Infinity },
] as const;

export type MFInterval = (typeof MF_INTERVALS)[number];

export function filterNavDataByInterval(
  navData: MutualFundNavHistoryData[],
  days: number
): MutualFundNavHistoryData[] {
  if (!isFinite(days)) return navData;
  const cutoffDate = getDateNDaysAgo(parseNavDate(navData[0].date), days);
  return navData.filter((item) => parseNavDate(item.date) >= cutoffDate);
}
