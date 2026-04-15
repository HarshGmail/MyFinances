export interface MetricDefinition {
  title: string;
  description: string;
  howCalculated: string;
  whatItTellsUs: string;
  goodRange?: string;
}

export const MF_METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  'Current NAV': {
    title: 'Current Net Asset Value (NAV)',
    description: 'The current price of one unit of the mutual fund.',
    howCalculated: 'NAV = (Total Assets - Total Liabilities) ÷ Total Units Outstanding',
    whatItTellsUs:
      "NAV is what you pay to buy one fund unit and what you receive when you sell. It's updated once daily (usually at market close). NAV itself isn't a performance measure — only returns matter for investing decisions. A fund with ₹50 NAV isn't cheaper than one with ₹100 NAV; you're buying different fractions of different portfolios.",
    goodRange:
      'No "good" range — NAV just reflects the fund size and structure. A low NAV might indicate a newer fund; a high NAV might indicate an older fund with lots of appreciation.',
  },
  '1Y CAGR': {
    title: '1-Year Compound Annual Growth Rate',
    description: 'The annualized return over the past 12 months.',
    howCalculated: '1Y CAGR = (Ending NAV ÷ Starting NAV)^(1/1) - 1',
    whatItTellsUs:
      'Shows how much your investment would have grown if you held it for exactly one year. 1Y CAGR is volatile and can be skewed by market swings. Use it as a recent performance snapshot but compare against 3Y and 5Y CAGR for a fuller picture. A fund with 20% 1Y but 8% 3Y CAGR may be riding a market rally, not necessarily a strong manager.',
    goodRange:
      '8-15% is solid for equity funds; <5% warrants investigation; >20% is strong but may not be sustainable',
  },
  '3Y CAGR': {
    title: '3-Year Compound Annual Growth Rate',
    description: 'The annualized return over the past 3 years.',
    howCalculated: '3Y CAGR = (Ending NAV ÷ Starting NAV)^(1/3) - 1',
    whatItTellsUs:
      'More reliable than 1Y CAGR because it spans a full market cycle. This is often cited for fund comparisons because it smooths out short-term volatility and shows true manager skill. Compare this against the category average and peer funds. If 3Y CAGR is much higher than 5Y CAGR, the fund recently outperformed; if lower, recent underperformance is happening.',
    goodRange:
      '8-12% is typical for balanced equity funds; 12-20%+ for aggressive/growth funds; <8% suggests underperformance',
  },
  '5Y CAGR': {
    title: '5-Year Compound Annual Growth Rate',
    description: 'The annualized return over the past 5 years.',
    howCalculated: '5Y CAGR = (Ending NAV ÷ Starting NAV)^(1/5) - 1',
    whatItTellsUs:
      "The gold standard for fund evaluation. 5-year returns include multiple market cycles and real-world conditions. This shows genuine long-term performance and manager consistency. If 5Y CAGR > 3Y CAGR, the fund is improving (good). If 5Y CAGR > 1Y CAGR, the fund underperformed recently (monitor). Use 5Y CAGR for strategic fund selection; don't chase recent 1Y stars.",
    goodRange:
      '8-12% is healthy for large-cap equity; 12-18%+ for mid-cap/small-cap; <8% indicates lagging performance',
  },
  'Since Inception CAGR': {
    title: 'Since Inception Compound Annual Growth Rate',
    description: 'The annualized return from the fund launch date to today.',
    howCalculated: 'Inception CAGR = (Ending NAV ÷ Launch NAV)^(1/Years Since Launch) - 1',
    whatItTellsUs:
      'Gives the longest-term view of fund performance. A fund launched during a bull market might have high inception CAGR; one launched before a crash might have lower inception CAGR despite good recent performance. Use this to understand whether a fund has performed well across all environments since its creation. Newer funds (< 2 years) have unreliable inception CAGR.',
    goodRange:
      'Varies by fund age and category. Use as reference only; newer funds cannot be fairly evaluated this way.',
  },
  'YTD Return': {
    title: 'Year-to-Date Return',
    description: 'The percentage gain/loss from January 1st to today in the current calendar year.',
    howCalculated:
      'YTD Return = (Current NAV ÷ NAV on Jan 1st) - 1 (if data exists, else from earliest data in year)',
    whatItTellsUs:
      "Quick snapshot of 'so far this year' performance. YTD Return is useful for short-term tracking but NOT for long-term investing decisions. Don't overreact to negative YTD returns early in the year; market rallies often happen later in the calendar.",
    goodRange:
      'Context-dependent; use to gauge current-year performance relative to your expectations, not as a decision metric',
  },
  'Volatility (1Y)': {
    title: 'Volatility (1-Year Annualized Standard Deviation)',
    description:
      'Measures how much the fund NAV fluctuates day-to-day, expressed as an annual percentage.',
    howCalculated:
      'Calculate daily log returns over 1Y → Compute standard deviation → Annualize by × √252 (trading days)',
    whatItTellsUs:
      "Higher volatility = more ups and downs = higher risk and potential returns. Lower volatility = smoother ride. Equity funds are typically 12-25% volatile. Debt funds are <8% volatile. Bond funds can spike during rate changes. Volatility ALONE doesn't tell you if the fund is good — a high-volatility fund with 25% CAGR is better than a low-volatility fund with 3% CAGR.",
    goodRange:
      'Debt: <8%, Balanced: 8-12%, Equity: 12-25%+. Compare within category, not across categories.',
  },
  'Sharpe Ratio (1Y)': {
    title: 'Sharpe Ratio',
    description:
      "Measures return-per-unit-of-risk. It's the risk-adjusted return: how much extra return you get for taking extra risk.",
    howCalculated:
      'Sharpe Ratio = (Fund Return - Risk-Free Rate) ÷ Volatility\n(Using 1Y CAGR, volatility, and 6.5% risk-free rate)',
    whatItTellsUs:
      'A Sharpe Ratio >1 is good; <0.5 is poor. This helps compare two funds: Fund A (20% return, 25% volatility) has Sharpe ≈ 0.54, but Fund B (15% return, 10% volatility) has Sharpe ≈ 0.85 — Fund B is more efficient. Use Sharpe Ratio to compare funds in similar categories. Higher is better.',
    goodRange: '>1.0 is strong, 0.5-1.0 is okay, <0.5 is weak',
  },
  'Max Drawdown': {
    title: 'Maximum Drawdown',
    description:
      'The worst peak-to-trough decline the fund has experienced. Shows the deepest underwater period.',
    howCalculated:
      'For each date, find the rolling peak NAV before it. Drawdown = (Current NAV - Peak NAV) ÷ Peak NAV. Max Drawdown = the worst (most negative) drawdown.',
    whatItTellsUs:
      'If a fund has -35% max drawdown, at its worst point, ₹100 invested would have been worth ₹65. This shows resilience to market crashes. Equity funds often have 30-50% drawdowns in severe bear markets. Debt funds rarely exceed 10%. Use this to gauge emotional tolerance: can you watch your investment drop by this much without panic-selling?',
    goodRange:
      'Equity: -30% to -50% typical, -20% is resilient. Debt: -5% to -10%. Understand your tolerance before investing.',
  },
  'Fund House': {
    title: 'Mutual Fund House / Asset Management Company (AMC)',
    description: 'The company that manages the mutual fund.',
    howCalculated: 'Listed from fund registry (AMFI data).',
    whatItTellsUs:
      'Fund house reputation, track record, and size matter. Large, established fund houses (HDFC, ICICI, SBI, Kotak) have more resources and research. Smaller AMCs may have specialist funds but less diversification. A fund with great recent returns from a small AMC might be risky (fund manager departure, merger risk). Consider fund house stability, not just fund performance.',
    goodRange:
      'Prefer established fund houses with track records; can explore emerging AMCs but with caution',
  },
  Category: {
    title: 'Scheme Category',
    description:
      'The regulatory classification of the fund (Large Cap, Mid Cap, Multi-cap, Hybrid, etc.).',
    howCalculated: 'Set by AMFI based on portfolio mandate and holdings.',
    whatItTellsUs:
      'Category defines the fund\'s investment rules and risk profile. A "Large Cap" fund must invest 80%+ in large-cap stocks (defined by market cap). A "Balanced Advantage" fund can flexibly allocate between stocks and bonds. Category determines where the fund belongs in your asset allocation. Don\'t compare a Large Cap vs Smallcap fund 1Y return directly — they have different risk/return profiles.',
    goodRange: 'Choose category based on your risk appetite and time horizon, not performance',
  },
  'Scheme Type': {
    title: 'Scheme Type',
    description:
      'Whether the fund is "Open Ended" (buy/sell anytime) or "Closed Ended" (traded like stocks) or "Interval" (periodic).',
    howCalculated: 'Set by fund house.',
    whatItTellsUs:
      'Most Indian funds are Open Ended — you can invest/withdraw anytime. Closed-ended funds trade on exchanges (BSE, NSE) and liquidity depends on market volumes. Open-ended funds are standard for most investors. "Growth Option" means dividends are reinvested (compounding); "Dividend Option" means dividends are paid out (no compounding in the fund).',
    goodRange: 'Open-ended with Growth option for long-term wealth building',
  },
  'ISIN (Growth)': {
    title: 'ISIN Code (International Securities Identification Number)',
    description: 'Unique identifier for the Growth Option variant of this fund.',
    howCalculated: 'Assigned by ISIN issuing body (India: NSDL).',
    whatItTellsUs:
      'Used for tax reporting, dividend reinvestment tracking, and official records. If you switch from Dividend to Growth option or vice versa, both have different ISINs. Keep your ISIN for tax records (Form 16A, capital gains statements).',
    goodRange: 'Just informational; not a decision metric',
  },
};
