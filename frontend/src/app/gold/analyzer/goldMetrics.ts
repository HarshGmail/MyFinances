export interface GoldMetrics {
  totalGold: number;
  totalInvested: number;
  currentValue: number;
  currentPrice: number;
  avgPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  xirrPercentage: number | null;
  cagr1Y: number | null;
  cagr3Y: number | null;
  cagr5Y: number | null;
  cagrInception: number | null;
  volatility1Y: number | null;
  maxDrawdown: number | null;
  priceChange1D: number | null;
  priceChangePct1D: number | null;
  priceChange1M: number | null;
  priceChange1Y: number | null;
  priceChange5Y: number | null;
  ytdReturn: number | null;
  inceptionDate: string | null;
  high52W?: number;
  low52W?: number;
}

export type Verdict = { text: string; color: string };
export type MetricCard = { label: string; value: string; verdict: Verdict | null };

interface PriceData {
  date: string;
  price: number;
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

function cagr(startValue: number, endValue: number, years: number): number | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return null;
  const result = Math.pow(endValue / startValue, 1 / years) - 1;
  return isNaN(result) ? null : result;
}

function getVolatility(prices: number[]): number | null {
  if (prices.length < 2) return null;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i - 1] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
  }

  if (returns.length < 2) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  const annualized = stdDev * Math.sqrt(252);

  return isNaN(annualized) ? null : annualized;
}

function getMaxDrawdown(prices: number[]): number | null {
  if (prices.length < 2) return null;

  let maxPrice = prices[0];
  let maxDD = 0;

  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > maxPrice) {
      maxPrice = prices[i];
    }
    const dd = (prices[i] - maxPrice) / maxPrice;
    if (dd < maxDD) {
      maxDD = dd;
    }
  }

  return maxDD;
}

function parseGoldDate(dateStr: string): Date {
  return new Date(dateStr);
}

function getPriceAtDate(priceData: PriceData[], targetDate: Date): number | null {
  for (const item of priceData) {
    const itemDate = parseGoldDate(item.date);
    if (itemDate <= targetDate) {
      return item.price;
    }
  }
  return null;
}

export function computeGoldMetrics(
  priceData: PriceData[],
  currentPrice: number,
  totalGold: number,
  totalInvested: number,
  xirrPercentage: number | null,
  inceptionDate: string | null
): GoldMetrics {
  if (priceData.length === 0 || totalGold <= 0) {
    return {
      totalGold,
      totalInvested,
      currentValue: totalGold * currentPrice,
      currentPrice,
      avgPrice: totalInvested / totalGold,
      profitLoss: totalGold * currentPrice - totalInvested,
      profitLossPercentage: ((totalGold * currentPrice - totalInvested) / totalInvested) * 100,
      xirrPercentage,
      cagr1Y: null,
      cagr3Y: null,
      cagr5Y: null,
      cagrInception: null,
      volatility1Y: null,
      maxDrawdown: null,
      priceChange1D: null,
      priceChangePct1D: null,
      priceChange1M: null,
      priceChange1Y: null,
      priceChange5Y: null,
      ytdReturn: null,
      inceptionDate,
      high52W: 0,
      low52W: 0,
    };
  }

  const currentDate = parseGoldDate(priceData[0].date);
  const sortedPrices = priceData.sort(
    (a, b) => parseGoldDate(b.date).getTime() - parseGoldDate(a.date).getTime()
  );

  const currentPriceData = sortedPrices[0];
  const prevDayPrice = sortedPrices[1]?.price || currentPrice;
  const priceChange1D = currentPrice - prevDayPrice;
  const priceChangePct1D = prevDayPrice > 0 ? priceChange1D / prevDayPrice : 0;

  // Get prices for different periods
  const price1YAgo = getPriceAtDate(sortedPrices, getDateNYearsAgo(currentDate, 1));
  const price3YAgo = getPriceAtDate(sortedPrices, getDateNYearsAgo(currentDate, 3));
  const price5YAgo = getPriceAtDate(sortedPrices, getDateNYearsAgo(currentDate, 5));
  const priceInception = sortedPrices[sortedPrices.length - 1]?.price || currentPrice;

  // Get YTD price
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);
  let priceAtYearStart: number | null = null;
  for (const item of sortedPrices) {
    const itemDate = parseGoldDate(item.date);
    if (itemDate <= yearStart) {
      priceAtYearStart = item.price;
      break;
    }
  }

  // Calculate CAGRs
  const cagr1Y = price1YAgo ? cagr(price1YAgo, currentPrice, 1) : null;
  const cagr3Y = price3YAgo ? cagr(price3YAgo, currentPrice, 3) : null;
  const cagr5Y = price5YAgo ? cagr(price5YAgo, currentPrice, 5) : null;
  const inceptionYears = inceptionDate
    ? (currentDate.getTime() - parseGoldDate(inceptionDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
    : null;
  const cagrInception =
    inceptionYears && inceptionYears > 0
      ? cagr(priceInception, currentPrice, inceptionYears)
      : null;

  const ytdReturn = priceAtYearStart ? (currentPrice - priceAtYearStart) / priceAtYearStart : null;

  // Volatility (last 1 year prices)
  const prices1Y: number[] = [];
  const cutoffDate1Y = getDateNYearsAgo(currentDate, 1);
  for (const item of sortedPrices) {
    if (parseGoldDate(item.date) >= cutoffDate1Y) {
      prices1Y.push(item.price);
    }
  }
  prices1Y.reverse(); // Make chronological

  const volatility1Y = getVolatility(prices1Y);
  const allPrices = sortedPrices.map((p) => p.price).reverse();
  const maxDrawdown = getMaxDrawdown(allPrices);

  return {
    totalGold,
    totalInvested,
    currentValue: totalGold * currentPrice,
    currentPrice,
    avgPrice: totalInvested / totalGold,
    profitLoss: totalGold * currentPrice - totalInvested,
    profitLossPercentage: ((totalGold * currentPrice - totalInvested) / totalInvested) * 100,
    xirrPercentage,
    cagr1Y,
    cagr3Y,
    cagr5Y,
    cagrInception,
    volatility1Y,
    maxDrawdown,
    priceChange1D,
    priceChangePct1D,
    priceChange1M: null,
    priceChange1Y: null,
    priceChange5Y: null,
    ytdReturn,
    inceptionDate,
    high52W: 0,
    low52W: 0,
  };
}

export function getGoldVerdict(metric: string, val: number | undefined | null): Verdict | null {
  if (val === undefined || val === null || isNaN(val)) return null;

  switch (metric) {
    case 'cagr1Y':
      if (val < 0) return { text: 'Negative', color: 'text-red-500' };
      if (val < 0.05) return { text: 'Modest growth', color: 'text-yellow-500' };
      if (val < 0.1) return { text: 'Good returns', color: 'text-green-600' };
      return { text: 'Strong returns', color: 'text-green-600' };

    case 'cagr3Y':
    case 'cagr5Y':
      if (val < 0) return { text: 'Negative', color: 'text-red-500' };
      if (val < 0.05) return { text: 'Modest growth', color: 'text-yellow-500' };
      if (val < 0.1) return { text: 'Good growth', color: 'text-green-600' };
      return { text: 'Strong growth', color: 'text-green-600' };

    case 'volatility':
      if (val < 0.05) return { text: 'Very stable', color: 'text-green-600' };
      if (val < 0.12) return { text: 'Moderate volatility', color: 'text-blue-500' };
      if (val < 0.2) return { text: 'Elevated volatility', color: 'text-yellow-500' };
      return { text: 'High volatility', color: 'text-red-500' };

    case 'maxDrawdown':
      if (val > -0.15) return { text: 'Resilient', color: 'text-green-600' };
      if (val > -0.25) return { text: 'Moderate drawdown', color: 'text-yellow-500' };
      return { text: 'Significant drawdown', color: 'text-red-500' };

    default:
      return null;
  }
}

export function buildGoldMetricCards(metrics: GoldMetrics): MetricCard[] {
  const cards: MetricCard[] = [];

  const formatCurrency = (v: number) => `₹${v.toFixed(2)}`;
  const formatGrams = (v: number) => `${v.toFixed(4)}g`;
  const formatPct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(2)}%`);

  cards.push({
    label: 'Current Price (per gram)',
    value: formatCurrency(metrics.currentPrice),
    verdict: null,
  });

  cards.push({
    label: 'Total Gold Owned',
    value: formatGrams(metrics.totalGold),
    verdict: null,
  });

  cards.push({
    label: 'Average Cost (per gram)',
    value: formatCurrency(metrics.avgPrice),
    verdict: null,
  });

  cards.push({
    label: 'Total Invested',
    value: formatCurrency(metrics.totalInvested),
    verdict: null,
  });

  cards.push({
    label: 'Current Value',
    value: formatCurrency(metrics.currentValue),
    verdict: null,
  });

  cards.push({
    label: 'Profit/Loss',
    value: formatCurrency(metrics.profitLoss),
    verdict:
      metrics.profitLoss >= 0
        ? { text: 'Profit', color: 'text-green-600' }
        : { text: 'Loss', color: 'text-red-500' },
  });

  cards.push({
    label: 'P&L %',
    value: `${metrics.profitLossPercentage.toFixed(2)}%`,
    verdict:
      metrics.profitLossPercentage >= 0
        ? { text: 'Positive', color: 'text-green-600' }
        : { text: 'Negative', color: 'text-red-500' },
  });

  if (metrics.xirrPercentage !== null) {
    cards.push({
      label: 'XIRR',
      value: `${metrics.xirrPercentage.toFixed(2)}%`,
      verdict:
        metrics.xirrPercentage >= 0
          ? { text: 'Positive', color: 'text-green-600' }
          : { text: 'Negative', color: 'text-red-500' },
    });
  }

  if (metrics.cagr1Y !== null) {
    cards.push({
      label: '1Y CAGR',
      value: formatPct(metrics.cagr1Y),
      verdict: getGoldVerdict('cagr1Y', metrics.cagr1Y),
    });
  }

  if (metrics.cagr3Y !== null) {
    cards.push({
      label: '3Y CAGR',
      value: formatPct(metrics.cagr3Y),
      verdict: getGoldVerdict('cagr3Y', metrics.cagr3Y),
    });
  }

  if (metrics.cagr5Y !== null) {
    cards.push({
      label: '5Y CAGR',
      value: formatPct(metrics.cagr5Y),
      verdict: getGoldVerdict('cagr5Y', metrics.cagr5Y),
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
      verdict:
        metrics.ytdReturn >= 0
          ? { text: 'Positive', color: 'text-green-600' }
          : { text: 'Negative', color: 'text-red-500' },
    });
  }

  if (metrics.volatility1Y !== null) {
    cards.push({
      label: 'Volatility (1Y)',
      value: `${(metrics.volatility1Y * 100).toFixed(2)}%`,
      verdict: getGoldVerdict('volatility', metrics.volatility1Y),
    });
  }

  if (metrics.maxDrawdown !== null) {
    cards.push({
      label: 'Max Drawdown',
      value: `${(metrics.maxDrawdown * 100).toFixed(2)}%`,
      verdict: getGoldVerdict('maxDrawdown', metrics.maxDrawdown),
    });
  }

  return cards;
}

export function computeGoldMarketMetrics(
  priceData: PriceData[],
  inceptionDate: string | null
): GoldMetrics {
  if (priceData.length === 0) {
    return {
      totalGold: 0,
      totalInvested: 0,
      currentValue: 0,
      currentPrice: 0,
      avgPrice: 0,
      profitLoss: 0,
      profitLossPercentage: 0,
      xirrPercentage: null,
      cagr1Y: null,
      cagr3Y: null,
      cagr5Y: null,
      cagrInception: null,
      volatility1Y: null,
      maxDrawdown: null,
      priceChange1D: null,
      priceChangePct1D: null,
      priceChange1M: null,
      priceChange1Y: null,
      priceChange5Y: null,
      ytdReturn: null,
      inceptionDate,
      high52W: 0,
      low52W: 0,
    };
  }

  const sortedPrices = priceData.sort(
    (a, b) => parseGoldDate(b.date).getTime() - parseGoldDate(a.date).getTime()
  );

  const currentPrice = sortedPrices[0].price;
  const prevDayPrice = sortedPrices[1]?.price || currentPrice;
  const priceChange1D = currentPrice - prevDayPrice;
  const priceChangePct1D = prevDayPrice > 0 ? priceChange1D / prevDayPrice : 0;

  const currentDate = parseGoldDate(sortedPrices[0].date);

  // Get prices for different periods
  const price1MAgo = getPriceAtDate(sortedPrices, getDateNDaysAgo(currentDate, 30));
  const price1YAgo = getPriceAtDate(sortedPrices, getDateNYearsAgo(currentDate, 1));
  const price3YAgo = getPriceAtDate(sortedPrices, getDateNYearsAgo(currentDate, 3));
  const price5YAgo = getPriceAtDate(sortedPrices, getDateNYearsAgo(currentDate, 5));
  const priceInception = sortedPrices[sortedPrices.length - 1]?.price || currentPrice;

  // Calculate period changes
  const priceChange1M = price1MAgo ? (currentPrice - price1MAgo) / price1MAgo : null;
  const priceChange1Y = price1YAgo ? (currentPrice - price1YAgo) / price1YAgo : null;
  const priceChange5Y = price5YAgo ? (currentPrice - price5YAgo) / price5YAgo : null;

  // Get 52W high/low
  const prices52W: number[] = [];
  const cutoff52W = getDateNYearsAgo(currentDate, 1);
  for (const item of sortedPrices) {
    if (parseGoldDate(item.date) >= cutoff52W) {
      prices52W.push(item.price);
    }
  }
  const high52W = prices52W.length > 0 ? Math.max(...prices52W) : currentPrice;
  const low52W = prices52W.length > 0 ? Math.min(...prices52W) : currentPrice;

  // Get YTD price
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);
  let priceAtYearStart: number | null = null;
  for (const item of sortedPrices) {
    const itemDate = parseGoldDate(item.date);
    if (itemDate <= yearStart) {
      priceAtYearStart = item.price;
      break;
    }
  }

  // Calculate CAGRs
  const cagr1Y = price1YAgo ? cagr(price1YAgo, currentPrice, 1) : null;
  const cagr3Y = price3YAgo ? cagr(price3YAgo, currentPrice, 3) : null;
  const cagr5Y = price5YAgo ? cagr(price5YAgo, currentPrice, 5) : null;
  const inceptionYears = inceptionDate
    ? (currentDate.getTime() - parseGoldDate(inceptionDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
    : null;
  const cagrInception =
    inceptionYears && inceptionYears > 0
      ? cagr(priceInception, currentPrice, inceptionYears)
      : null;

  const ytdReturn = priceAtYearStart ? (currentPrice - priceAtYearStart) / priceAtYearStart : null;

  // Volatility (last 1 year prices)
  const prices1Y: number[] = [];
  const cutoffDate1Y = getDateNYearsAgo(currentDate, 1);
  for (const item of sortedPrices) {
    if (parseGoldDate(item.date) >= cutoffDate1Y) {
      prices1Y.push(item.price);
    }
  }
  prices1Y.reverse(); // Make chronological

  const volatility1Y = getVolatility(prices1Y);
  const allPrices = sortedPrices.map((p) => p.price).reverse();
  const maxDrawdown = getMaxDrawdown(allPrices);

  return {
    totalGold: 0,
    totalInvested: 0,
    currentValue: 0,
    currentPrice,
    avgPrice: 0,
    profitLoss: 0,
    profitLossPercentage: 0,
    xirrPercentage: null,
    cagr1Y,
    cagr3Y,
    cagr5Y,
    cagrInception,
    volatility1Y,
    maxDrawdown,
    priceChange1D,
    priceChangePct1D,
    priceChange1M,
    priceChange1Y,
    priceChange5Y,
    ytdReturn,
    inceptionDate,
    high52W,
    low52W,
  };
}

export function buildGoldMarketCards(metrics: GoldMetrics): MetricCard[] {
  const cards: MetricCard[] = [];

  const formatCurrency = (v: number) => `₹${v.toFixed(2)}`;
  const formatPct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(2)}%`);

  cards.push({
    label: 'Current Price (per gram)',
    value: formatCurrency(metrics.currentPrice),
    verdict: null,
  });

  if (metrics.cagr1Y !== null) {
    cards.push({
      label: '1Y CAGR',
      value: formatPct(metrics.cagr1Y),
      verdict: getGoldVerdict('cagr1Y', metrics.cagr1Y),
    });
  }

  if (metrics.cagr3Y !== null) {
    cards.push({
      label: '3Y CAGR',
      value: formatPct(metrics.cagr3Y),
      verdict: getGoldVerdict('cagr3Y', metrics.cagr3Y),
    });
  }

  if (metrics.cagr5Y !== null) {
    cards.push({
      label: '5Y CAGR',
      value: formatPct(metrics.cagr5Y),
      verdict: getGoldVerdict('cagr5Y', metrics.cagr5Y),
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
      verdict:
        metrics.ytdReturn >= 0
          ? { text: 'Positive', color: 'text-green-600' }
          : { text: 'Negative', color: 'text-red-500' },
    });
  }

  if (metrics.volatility1Y !== null) {
    cards.push({
      label: 'Volatility (1Y)',
      value: `${(metrics.volatility1Y * 100).toFixed(2)}%`,
      verdict: getGoldVerdict('volatility', metrics.volatility1Y),
    });
  }

  if (metrics.maxDrawdown !== null) {
    cards.push({
      label: 'Max Drawdown',
      value: `${(metrics.maxDrawdown * 100).toFixed(2)}%`,
      verdict: getGoldVerdict('maxDrawdown', metrics.maxDrawdown),
    });
  }

  return cards;
}
