/* eslint-disable @typescript-eslint/no-explicit-any */
export function buildAIInsightPrompt(input: {
  userName: string;
  asOf: Date;
  total: {
    invested: number;
    currentValue: number;
    pnl: number;
    pnlPct: number;
    xirr: number | null;
  };
  stocks: {
    invested: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercentage: number;
    xirr: number | null;
    holdings: Array<{
      name: string;
      shares: number;
      avgCost: number;
      currentPrice: number;
      currentValue: number;
      invested: number;
      pnl: number;
      pnlPct: number;
      dataOk: boolean;
    }>;
  };
  mutualFunds: {
    invested: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercentage: number;
    xirr: number | null;
    holdings: Array<{
      name: string;
      units: number;
      invested: number;
      currentNav: number | null;
      currentValue: number | null;
      pnl: number | null;
      pnlPct: number | null;
    }>;
  };
  gold: {
    invested: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercentage: number;
    xirr: number | null;
    currentRatePerGram: number | null;
  };
  crypto: {
    invested: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercentage: number;
    xirr: number | null;
    coins: Array<{
      name: string;
      symbol: string;
      units: number;
      invested: number;
      currentPrice: number;
      currentValue: number;
      pnl: number;
      pnlPct: number;
    }>;
  };
  epf: {
    invested: number;
    currentValue: number;
    monthlyContribution: number;
    annualContribution: number;
  };
  fd: {
    invested: number;
    currentValue: number;
    pnl: number;
    pnlPct: number;
    list: any[];
  };
  rd: {
    invested: number;
    currentValue: number;
    pnl: number;
    pnlPct: number;
    list: any[];
  };
}) {
  const fmt = (n: number | null | undefined) =>
    typeof n === 'number' && isFinite(n)
      ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
      : 'N/A';
  const pct = (n: number | null | undefined) =>
    typeof n === 'number' && isFinite(n) ? `${n.toFixed(2)}%` : 'N/A';
  const rupee = (n: number | null | undefined) =>
    typeof n === 'number' && isFinite(n)
      ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'N/A';

  const allocation = [
    { name: 'Stocks', invested: input.stocks.invested, current: input.stocks.currentValue },
    {
      name: 'Mutual Funds',
      invested: input.mutualFunds.invested,
      current: input.mutualFunds.currentValue,
    },
    { name: 'Gold', invested: input.gold.invested, current: input.gold.currentValue },
    { name: 'Crypto', invested: input.crypto.invested, current: input.crypto.currentValue },
    { name: 'EPF', invested: input.epf.invested, current: input.epf.currentValue },
    { name: 'FD', invested: input.fd.invested, current: input.fd.currentValue },
    { name: 'RD', invested: input.rd.invested, current: input.rd.currentValue },
  ];
  const totalInv = allocation.reduce((s, a) => s + (a.invested || 0), 0) || 0;
  const totalCur = allocation.reduce((s, a) => s + (a.current || 0), 0) || 0;

  const allocationLines = allocation
    .map((a) => {
      const invPct = totalInv ? (a.invested / totalInv) * 100 : 0;
      const curPct = totalCur ? (a.current / totalCur) * 100 : 0;
      return `- ${a.name.padEnd(13)} | Invested: ${rupee(a.invested)} (${invPct.toFixed(1)}%) | Current: ${rupee(a.current)} (${curPct.toFixed(1)}%)`;
    })
    .join('\n');

  const stocksHoldings = input.stocks.holdings.map((h) => ({
    name: h.name,
    shares: h.shares,
    avgCost: h.avgCost,
    currentPrice: h.currentPrice,
    invested: h.invested,
    currentValue: h.currentValue,
    pnl: h.pnl,
    pnlPct: h.pnlPct,
  }));

  const mfHoldings = input.mutualFunds.holdings.map((h) => ({
    name: h.name,
    units: h.units,
    invested: h.invested,
    currentNav: h.currentNav,
    currentValue: h.currentValue,
    pnl: h.pnl,
    pnlPct: h.pnlPct,
  }));

  const cryptoCoins = input.crypto.coins.map((c) => ({
    name: c.name,
    symbol: c.symbol,
    units: c.units,
    invested: c.invested,
    currentPrice: c.currentPrice,
    currentValue: c.currentValue,
    pnl: c.pnl,
    pnlPct: c.pnlPct,
  }));

  const fdListShort = (input.fd.list || []).map((fd) => ({
    amountInvested: fd.amountInvested,
    rateOfInterest: fd.rateOfInterest,
    dateOfCreation: fd.dateOfCreation,
    dateOfMaturity: fd.dateOfMaturity,
  }));

  const rdListShort = (input.rd.list || []).map((rd) => ({
    amountInvested: rd.amountInvested,
    rateOfInterest: rd.rateOfInterest,
    dateOfCreation: rd.dateOfCreation,
    dateOfMaturity: rd.dateOfMaturity,
  }));

  const asOf = input.asOf.toISOString();

  return [
    `You are a fiduciary financial analyst. Analyze the portfolio snapshot below and provide:
  1) High-level assessment (strengths, risks, blind spots).
  2) Diversification analysis (by asset class and within each class).
  3) Performance review (absolute and % P&L; XIRR) with context.
  4) Actionable recommendations: rebalancing, tax-efficiency, risk mgmt, SIP/goal planning.
  5) Short- and medium-term to-do list (clear, prioritized).
  6) Any data-quality caveats you notice (e.g., missing prices or stale NAV).
  
  Please use clear headings, bullet points, and keep numbers in INR where applicable. If data is missing, state reasonable checks I should do next.
  
  ---------------------------
  # INVESTOR
  - Name: ${input.userName}
  - As of: ${asOf}
  
  # SNAPSHOT (TOTALS)
  - Total Invested: ${rupee(input.total.invested)}
  - Total Current Value: ${rupee(input.total.currentValue)}
  - Total P&L: ${rupee(input.total.pnl)} (${pct(input.total.pnlPct)})
  - Overall XIRR: ${pct(input.total.xirr)}
  
  # ASSET ALLOCATION
  ${allocationLines}
  
  # STOCKS (Aggregates)
  - Invested: ${rupee(input.stocks.invested)}
  - Current Value: ${rupee(input.stocks.currentValue)}
  - P&L: ${rupee(input.stocks.profitLoss)} (${pct(input.stocks.profitLossPercentage)})
  - XIRR: ${pct(input.stocks.xirr)}
  - Holdings (JSON):
  \`\`\`json
  ${JSON.stringify(stocksHoldings, null, 2)}
  \`\`\`
  
  # MUTUAL FUNDS (Aggregates)
  - Invested: ${rupee(input.mutualFunds.invested)}
  - Current Value: ${rupee(input.mutualFunds.currentValue)}
  - P&L: ${rupee(input.mutualFunds.profitLoss)} (${pct(input.mutualFunds.profitLossPercentage)})
  - XIRR: ${pct(input.mutualFunds.xirr)}
  - Schemes (JSON):
  \`\`\`json
  ${JSON.stringify(mfHoldings, null, 2)}
  \`\`\`
  
  # GOLD (Aggregates)
  - Invested: ${rupee(input.gold.invested)}
  - Current Value: ${rupee(input.gold.currentValue)}
  - P&L: ${rupee(input.gold.profitLoss)} (${pct(input.gold.profitLossPercentage)})
  - XIRR: ${pct(input.gold.xirr)}
  - Current Rate (₹/gm): ${fmt(input.gold.currentRatePerGram)}
  
  # CRYPTO (Aggregates)
  - Invested: ${rupee(input.crypto.invested)}
  - Current Value: ${rupee(input.crypto.currentValue)}
  - P&L: ${rupee(input.crypto.profitLoss)} (${pct(input.crypto.profitLossPercentage)})
  - XIRR: ${pct(input.crypto.xirr)}
  - Coins (JSON):
  \`\`\`json
  ${JSON.stringify(cryptoCoins, null, 2)}
  \`\`\`
  
  # EPF
  - Current Balance: ${rupee(input.epf.currentValue)}
  - Monthly Contribution: ${rupee(input.epf.monthlyContribution)}
  - Annual Contribution: ${rupee(input.epf.annualContribution)}
  
  # FIXED DEPOSITS
  - Invested: ${rupee(input.fd.invested)}
  - Current Value: ${rupee(input.fd.currentValue)}
  - Interest/P&L: ${rupee(input.fd.pnl)} (${pct(input.fd.pnlPct)})
  - FDs (summary JSON):
  \`\`\`json
  ${JSON.stringify(fdListShort, null, 2)}
  \`\`\`
  
  # RECURRING DEPOSITS
  - Invested: ${rupee(input.rd.invested)}
  - Current Value: ${rupee(input.rd.currentValue)}
  - Interest/P&L: ${rupee(input.rd.pnl)} (${pct(input.rd.pnlPct)})
  - RDs (summary JSON):
  \`\`\`json
  ${JSON.stringify(rdListShort, null, 2)}
  \`\`\`
  
  # OUTPUT STYLE
  - Start with a short executive summary (2–4 bullets).
  - Then deep-dive by asset class with concrete action items.
  - Highlight rebalancing suggestions with specific target weights.
  - List top 3 risks and corresponding mitigations.
  - Mention potential tax optimizations (e.g., harvesting, LTCG/STCG mix).
  - End with a 30/90/180-day checklist.
  ---------------------------`,
  ].join('\n');
}
