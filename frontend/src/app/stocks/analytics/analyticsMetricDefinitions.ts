import { MetricDefinition } from '@/app/stocks/detail/[symbol]/metricDefinitions';

export const ANALYTICS_METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  'Trailing P/E': {
    title: 'P/E Ratio — Across Your Portfolio',
    description:
      "The P/E (Price-to-Earnings) ratio shows how much you are paying for every rupee of profit each company earns. In portfolio analytics, the distribution of P/E ratios across all your holdings reveals your portfolio's overall valuation stance — are you investing in value, growth, or a mix?",
    howCalculated:
      'P/E = Current Stock Price ÷ Earnings Per Share (last 12 months)\n\nAvg Portfolio P/E = simple mean of all holdings that report a valid P/E (negative or >200 excluded as outliers)',
    whatItTellsUs:
      'A portfolio skewed toward high-P/E stocks is growth-oriented — you are paying a premium expecting strong future earnings. A portfolio with mostly low-P/E stocks is value-oriented — you are buying businesses that are currently cheap relative to current earnings. Neither is always right: high-P/E portfolios are more sensitive to earnings disappointments and interest rate rises, while low-P/E portfolios may be cheap for a reason (stagnant growth, cyclical risk).',
    goodRange:
      'Avg portfolio P/E of 15–25 is balanced. Below 15 = value-heavy. Above 35 = heavy growth bet — watch for volatility if earnings disappoint.',
  },

  'Price / Book': {
    title: 'P/B Ratio — Across Your Portfolio',
    description:
      'Price-to-Book (P/B) compares what you pay for each stock vs. the net assets (book value) of the company. Across your holdings, the P/B distribution shows whether you lean toward asset-heavy companies at reasonable prices or high-quality businesses priced at a premium.',
    howCalculated:
      'P/B = Current Stock Price ÷ Book Value Per Share\n\nBook Value = Total Assets − Total Liabilities divided by shares outstanding',
    whatItTellsUs:
      'Many holdings below P/B 1 suggests you own undervalued or asset-heavy companies (banks, industrials, PSUs) — potential value plays but possibly low-growth. Many holdings above P/B 3 means you own businesses where value comes from intangibles, brand, or technology rather than physical assets — these are often expensive but can compound wealth faster. The distribution tells you the quality vs. price trade-off across your entire portfolio.',
    goodRange:
      'No single ideal. P/B 1–3 is common for most sectors. Below 1 can be a value opportunity or a distress signal. Above 5 means you are paying heavily for intangible value — only justified if the business has strong moats.',
  },

  'Beta (5Y)': {
    title: 'Portfolio Beta — Weighted Volatility',
    description:
      'Beta measures how much a stock moves relative to the overall market (Nifty 50). Your Portfolio Beta is weighted by how much money you have invested in each holding — so your largest positions drive the number the most.',
    howCalculated:
      "Portfolio Beta = Σ (Individual Stock Beta × Weight in Portfolio)\n\nWeight = Stock's invested amount ÷ Total portfolio value\n\nExample: If HDFC Bank (beta 0.8, 50% of portfolio) and Tata Motors (beta 1.6, 50%), Portfolio Beta = 0.8×0.5 + 1.6×0.5 = 1.2",
    whatItTellsUs:
      'A portfolio beta of 1.2 means your portfolio tends to move 20% more than the market — both up and down. Beta < 1 means you are defensively positioned; your portfolio falls less when markets crash but also gains less in rallies. High beta (>1.2) is fine in bull markets but amplifies losses during corrections. Your portfolio beta tells you your overall risk exposure relative to the index.',
    goodRange:
      '0.8–1.2 for balanced risk. Below 0.8 if you want capital protection. Above 1.2 if you are comfortable with volatility and have a long time horizon.',
  },

  ROE: {
    title: 'Return on Equity — Portfolio Quality Check',
    description:
      "ROE (Return on Equity) measures how efficiently each company generates profit from shareholders' money. Across your portfolio, the average ROE tells you the overall quality of capital deployment in the businesses you own.",
    howCalculated:
      "ROE = Net Income ÷ Average Shareholders' Equity × 100\n\nAvg Portfolio ROE = simple mean of all holdings that report ROE",
    whatItTellsUs:
      'A high average ROE portfolio means you own businesses that are good at compounding shareholder wealth — they need less capital to grow and return more per rupee invested. If many of your holdings have low ROE (<10%), they may be capital-intensive, facing margin pressure, or struggling to deploy capital efficiently. Over time, businesses with consistently high ROE tend to deliver better long-term returns.',
    goodRange:
      'Portfolio avg ROE of 15%+ is healthy. Above 20% means you hold quality compounders. Below 10% across the board is a concern — investigate whether it is structural or temporary.',
  },

  'Net Margin': {
    title: 'Net Margin — Portfolio Profitability',
    description:
      'Net margin is the percentage of revenue that each company keeps as final profit after all expenses, taxes, and interest are paid. Across your portfolio, the average net margin reflects the overall profitability quality of your holdings.',
    howCalculated:
      'Net Margin = Net Income ÷ Revenue × 100\n\nAvg Portfolio Net Margin = simple mean of all holdings that report profit margins',
    whatItTellsUs:
      "A portfolio with high average net margins owns businesses with pricing power, lean cost structures, and competitive advantages. Low net margins mean the companies you own earn very little per rupee of sales — they are vulnerable to cost increases, competition, or economic slowdowns. If your portfolio's avg margin is above 15%, you likely own high-quality businesses. Tech and pharma tend to have high margins; retail and commodities tend to be lower.",
    goodRange:
      'Portfolio avg net margin of 10%+ is good. Above 20% suggests premium businesses with strong moats. Below 5% means most holdings run on thin profits — acceptable for high-growth sectors but risky otherwise.',
  },

  'Operating Margin': {
    title: 'Operating Margin — Core Business Efficiency',
    description:
      'Operating margin shows what each company earns from its core business operations — before interest and tax. Across your portfolio, it tells you how efficiently the businesses you own run their day-to-day operations.',
    howCalculated:
      'Operating Margin = Operating Income ÷ Revenue × 100\n\nOperating Income = Revenue − Cost of Goods Sold − Operating Expenses (excludes interest and tax)',
    whatItTellsUs:
      'Holdings with strong operating margins have competitive advantages in their core business — they earn well even after paying for production, R&D, and marketing. If your portfolio has many holdings with low operating margins (<5%), those businesses are at risk of turning unprofitable if revenues dip or costs rise. Compare operating and net margins together: if operating margin is high but net margin is low, the companies may carry heavy debt (interest expense is eating profits).',
    goodRange:
      'Portfolio avg of 10–20% is solid. Above 20% signals quality businesses with pricing power. Below 5% is concerning unless the companies are in early-growth phases.',
  },

  'Revenue Growth': {
    title: 'Revenue Growth — Are Your Holdings Expanding?',
    description:
      "Revenue growth shows the year-over-year change in each company's total sales. In portfolio analytics, comparing revenue growth across your holdings shows which businesses are still expanding vs. which are stagnating or shrinking — before the decline shows up in stock prices.",
    howCalculated:
      "Revenue Growth = (This Year's Revenue − Last Year's Revenue) ÷ Last Year's Revenue × 100\n\nGreen bars = positive growth (expanding). Red bars = negative growth (revenue shrinking).",
    whatItTellsUs:
      'A portfolio where most holdings show healthy revenue growth is positioned in businesses that are still winning customers and growing their markets. Negative revenue growth is an early warning sign — companies can maintain profits short-term through cost cuts, but declining revenue eventually drags earnings down. If several of your holdings show red bars here, investigate whether it is a temporary blip (one-off quarter) or a structural decline in their business.',
    goodRange:
      'Most holdings at 5–20% revenue growth is healthy. Above 20% is high-growth mode. Negative growth in more than 30% of your portfolio warrants attention.',
  },

  'Earnings Growth': {
    title: 'Earnings Growth — Are Your Holdings Growing Profits?',
    description:
      "Earnings growth tracks the year-over-year change in each company's earnings per share (EPS). In portfolio analytics, the count of holdings with positive earnings growth tells you how much of your portfolio is on an upward profit trajectory vs. declining.",
    howCalculated:
      'Earnings Growth = (Current Year EPS − Previous Year EPS) ÷ Previous Year EPS × 100\n\nThe "Positive Earnings Growth" count = number of your holdings where this value is ≥ 0',
    whatItTellsUs:
      'More important than revenue growth — earnings growth shows whether actual profit is expanding. A company can grow revenue but see profits shrink if costs rise faster. If most of your portfolio has positive earnings growth, the businesses you own are becoming more profitable. If many holdings have declining earnings, stock prices typically follow eventually. Green bars = earnings growing, red = shrinking. High and consistent earnings growth is the key driver of long-term stock price appreciation.',
    goodRange:
      'Aim for 70%+ of holdings with positive earnings growth. Avg of 10–20% earnings growth across holdings is healthy. Negative in majority of holdings is a portfolio health warning.',
  },

  'Debt / Equity': {
    title: 'Debt/Equity — Portfolio Leverage Exposure',
    description:
      'Debt/Equity (D/E) measures how much each company relies on borrowed money vs. its own capital. In portfolio analytics, the D/E distribution shows your overall exposure to leveraged businesses — and how resilient your portfolio is during economic downturns.',
    howCalculated:
      "D/E = Total Debt ÷ Shareholders' Equity\n\nDisplayed as a ratio: 1.5 means ₹1.50 of debt for every ₹1 of equity. Note: some data providers report D/E ×100 — the chart normalises this.",
    whatItTellsUs:
      'Many highly-leveraged holdings (D/E > 2) increase portfolio risk during downturns — interest payments are mandatory even when revenues fall, which can push companies toward financial distress. Low-leverage portfolios are more resilient and have flexibility to invest during market corrections. Note: financial companies (banks, NBFCs, insurance) naturally carry much higher D/E due to their business model — compare D/E only within the same sector.',
    goodRange:
      'Most non-financial holdings under D/E 1.5 is healthy. Above 2 warrants scrutiny. A few high-leverage picks (e.g., capital-intensive infra companies) are fine if their cash flows are stable and they have a clear debt-reduction path.',
  },
};
