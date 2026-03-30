export interface MetricDefinition {
  title: string;
  description: string;
  howCalculated: string;
  whatItTellsUs: string;
  goodRange?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  'Trailing P/E': {
    title: 'Trailing P/E (Price-to-Earnings)',
    description:
      "The ratio of a company's current stock price to its earnings per share over the last 12 months.",
    howCalculated: 'P/E = Current Stock Price ÷ Earnings Per Share (last 12 months)',
    whatItTellsUs:
      'Shows how much investors are willing to pay for every rupee of earnings. A lower P/E suggests the stock may be undervalued, while a higher P/E suggests investors expect strong future growth. P/E varies by industry — tech companies typically have higher P/E than banks.',
    goodRange: 'Typically 15-25 for mature companies; lower for value, higher for growth',
  },
  'Forward P/E': {
    title: 'Forward P/E (Price-to-Earnings)',
    description:
      "The ratio of a company's current stock price to its expected earnings per share for the next 12 months.",
    howCalculated:
      'Forward P/E = Current Stock Price ÷ Expected Earnings Per Share (next 12 months)',
    whatItTellsUs:
      'Shows what the stock is priced at based on future expectations. Forward P/E is often lower than Trailing P/E for growing companies because earnings are expected to increase. If Forward P/E is much lower than Trailing P/E, the market expects profit growth.',
    goodRange:
      'Typically 10-20 for stable growth; lower indicates high growth expectations already priced in',
  },
  'Market Cap': {
    title: 'Market Capitalization',
    description:
      "The total market value of a company's outstanding shares. It represents what the market thinks the entire company is worth.",
    howCalculated: 'Market Cap = Stock Price × Total Number of Shares Outstanding',
    whatItTellsUs:
      "Shows the company's size and scale. Large-cap (₹2T+) companies are often more stable, mid-cap companies offer growth potential, and small-cap companies are riskier but higher-growth. Market cap helps you compare companies' relative size and valuations.",
    goodRange: 'No "good" range — use to categorize: Large (₹2T+), Mid (₹500B-₹2T), Small (<₹500B)',
  },
  'EPS (TTM)': {
    title: 'Earnings Per Share (Trailing Twelve Months)',
    description: 'The profit attributable to each share of stock over the last 12 months.',
    howCalculated: 'EPS = Net Income (last 12 months) ÷ Number of Shares Outstanding',
    whatItTellsUs:
      'Shows how much profit the company generated per share. Higher EPS is generally better — it means more profit per share. EPS growth is a key indicator of company health. You can compare EPS across quarters to see if the company is improving or declining.',
    goodRange:
      'No universal range — compare year-over-year growth. Consistent growth is what matters.',
  },
  'Forward EPS': {
    title: 'Forward Earnings Per Share',
    description:
      'The expected earnings per share for the next 12 months, based on analyst estimates.',
    howCalculated:
      'Forward EPS = Expected Net Income (next 12 months) ÷ Number of Shares Outstanding',
    whatItTellsUs:
      "Shows what analysts expect the company to earn in the future. If Forward EPS is much higher than current EPS, the market expects profit growth. Compare it to Trailing EPS — if it's growing, that's positive; if it's declining, that's a warning sign.",
    goodRange: 'Look for growth compared to Trailing EPS. 10-20% growth year-over-year is healthy.',
  },
  'Price / Book': {
    title: 'Price-to-Book Ratio (P/B)',
    description:
      "The ratio of a company's market price per share to its book value per share (assets minus liabilities).",
    howCalculated: 'P/B = Stock Price ÷ Book Value Per Share',
    whatItTellsUs:
      "Shows how much you're paying for every rupee of assets the company has. A P/B below 1 means the stock trades below its net asset value (potential value play). High P/B (>3) suggests the market expects strong growth. Banks and capital-intensive industries have lower P/B ratios naturally.",
    goodRange: '1-3 is typical; <1 can indicate undervaluation or financial distress',
  },
  'Beta (5Y)': {
    title: 'Beta (5-Year)',
    description:
      'Measures how volatile a stock is compared to the overall market. Market beta = 1.0.',
    howCalculated: 'Beta = How much the stock moves ÷ How much the market moves over 5 years',
    whatItTellsUs:
      'Beta < 1 = Stock is less volatile than market (safer, steadier). Beta = 1 = Stock moves with market. Beta > 1 = Stock is more volatile (higher risk, higher reward potential). A beta of 1.5 means if market drops 10%, this stock might drop 15%.',
    goodRange: '0.8-1.2 = stable; >1.2 = risky; <0.8 = defensive',
  },
  '52W High': {
    title: '52-Week High',
    description: 'The highest price the stock has traded at during the past 52 weeks.',
    howCalculated: 'The maximum daily closing price in the last year.',
    whatItTellsUs:
      "Shows the stock's recent peak. If current price is near 52W high, sentiment is bullish. If it's far below, either the stock has declined or it's approaching support. Compare current price to this to gauge momentum.",
    goodRange: 'No "good" range — context matters. Use with current price to assess trend.',
  },
  '52W Low': {
    title: '52-Week Low',
    description: 'The lowest price the stock has traded at during the past 52 weeks.',
    howCalculated: 'The minimum daily closing price in the last year.',
    whatItTellsUs:
      "Shows the stock's recent floor. If current price is near 52W low, sentiment is bearish or the stock is in a downtrend. Often, stocks that are near their lows offer buying opportunities if fundamentals are sound.",
    goodRange: 'No "good" range — but distance from low indicates recovery potential.',
  },
  'Dividend Yield': {
    title: 'Dividend Yield',
    description:
      'The annual dividend per share divided by the stock price, expressed as a percentage.',
    howCalculated: 'Dividend Yield = Annual Dividend Per Share ÷ Stock Price × 100',
    whatItTellsUs:
      'Shows the annual income return from dividends. A 2% yield means for every ₹100 invested, you get ₹2 in dividends annually. Higher yields can indicate value but might also mean market thinks the company is risky. Compare across companies and over time.',
    goodRange: '1-4% is typical for Indian stocks; >5% warrants investigation',
  },
  'Operating Margin': {
    title: 'Operating Margin',
    description:
      'The percentage of revenue left after paying operating expenses (but before taxes and interest).',
    howCalculated: 'Operating Margin = Operating Income ÷ Revenue × 100',
    whatItTellsUs:
      'Shows how efficiently the company runs its core business. Higher is better — it means more of each rupee of sales becomes profit. Margins reflect competitive advantage, pricing power, and cost control. Compare margins between companies in the same industry.',
    goodRange: '5-15% is typical; >15% suggests strong competitive advantage; <5% is thin',
  },
  'Gross Margin': {
    title: 'Gross Margin',
    description:
      'The percentage of revenue left after paying the cost of goods sold (before operating expenses).',
    howCalculated: 'Gross Margin = (Revenue - Cost of Goods Sold) ÷ Revenue × 100',
    whatItTellsUs:
      "Shows the company's pricing power and production efficiency at the most basic level. High gross margins mean the company makes a lot per product sold. Low gross margins (especially if they're declining) suggest the company is under pricing pressure.",
    goodRange: '20-40% for manufacturing; varies by industry. Tech/software usually >70%',
  },
  'Net Margin': {
    title: 'Net Profit Margin',
    description:
      'The percentage of revenue left as profit after all expenses, taxes, and interest.',
    howCalculated: 'Net Margin = Net Income ÷ Revenue × 100',
    whatItTellsUs:
      'The most comprehensive profitability measure — shows what percentage of sales becomes actual profit. If net margin is declining while revenue grows, something is wrong (costs rising). Compare across companies and years to see efficiency trends.',
    goodRange: '5-15% is typical; <5% is low; >20% is exceptional',
  },
  'Debt / Equity': {
    title: 'Debt-to-Equity Ratio',
    description:
      "The ratio of total debt to shareholders' equity. Measures how much the company relies on borrowing vs. ownership capital.",
    howCalculated: "Debt/Equity = Total Debt ÷ Shareholders' Equity",
    whatItTellsUs:
      'A ratio of 1.0 means debt and equity are equal. High D/E (>1.5) means the company is highly leveraged — risky if revenues decline. Low D/E (<0.5) means conservative capital structure. Financial companies naturally have higher D/E ratios.',
    goodRange: '0.5-1.5 is typical; <0.5 = very safe; >2 = risky',
  },
  'Revenue Growth': {
    title: 'Revenue Growth',
    description: "The year-over-year percentage increase in a company's total revenue.",
    howCalculated:
      'Revenue Growth = (Current Year Revenue - Previous Year Revenue) ÷ Previous Year Revenue × 100',
    whatItTellsUs:
      'Shows if the company is expanding sales or contracting. Positive growth is good; faster growth (10-20%+) suggests a growing market or market share gains. Negative growth is a red flag. Compare growth rates against industry peers.',
    goodRange: '5-15% is healthy; >20% is high growth; <0% is declining',
  },
  'Earnings Growth': {
    title: 'Earnings Growth (EPS Growth)',
    description: 'The year-over-year percentage change in earnings per share.',
    howCalculated:
      'Earnings Growth = (Current Year EPS - Previous Year EPS) ÷ Previous Year EPS × 100',
    whatItTellsUs:
      'More important than revenue growth — shows if profit is growing. Companies often grow revenue but see profits shrink if costs rise. Strong earnings growth is the key driver of stock price appreciation. A company with 20% earnings growth outperforms one with 20% revenue growth.',
    goodRange: '10-25% is healthy; >25% is excellent; negative is concerning',
  },
  'Free Cash Flow': {
    title: 'Free Cash Flow',
    description:
      'The cash a company generates after paying capital expenditures needed to maintain operations.',
    howCalculated: 'FCF = Operating Cash Flow - Capital Expenditures',
    whatItTellsUs:
      "The most important metric for long-term investors — shows real cash the company has available. A company can show profits but have negative FCF if it's investing heavily or burning cash. Positive, growing FCF is what matters for sustainability. Use FCF to judge dividend safety.",
    goodRange: 'Should be positive and growing. Negative FCF is a warning sign.',
  },
  'Total Cash': {
    title: 'Total Cash',
    description: 'The total cash and cash equivalents the company has on its balance sheet.',
    howCalculated: 'Sum of cash, bank balances, and short-term investments on the balance sheet.',
    whatItTellsUs:
      'Shows financial cushion and strength. High cash is good for weathering downturns or funding growth. Compare to debt — if cash is high relative to debt, the company can pay it off easily. Unused cash suggests optionality — potential for acquisitions, buybacks, or special dividends.',
    goodRange: 'No universal range. Compare to annual revenue and debt levels.',
  },
  'Total Debt': {
    title: 'Total Debt',
    description: 'All outstanding loans and debt obligations the company must repay.',
    howCalculated: 'Sum of short-term and long-term debt from balance sheet.',
    whatItTellsUs:
      'Shows financial obligations. High debt relative to equity or cash flow is risky. Companies with high debt struggle during downturns. Compare debt levels to industry peers — capital-intensive industries naturally carry more debt.',
    goodRange: 'Should be <2x Annual Operating Cash Flow. Higher indicates risk.',
  },
  ROE: {
    title: 'Return on Equity (ROE)',
    description:
      'Measures how much profit a company generates for every rupee of shareholder equity.',
    howCalculated: "ROE = Net Income ÷ Average Shareholders' Equity × 100",
    whatItTellsUs:
      "Shows management's efficiency at deploying shareholder capital. ROE >15% is generally strong; <10% is weak. High ROE with low debt is especially attractive. Banks typically have higher ROE naturally. Compare ROE across companies and over time.",
    goodRange: '10-20% is healthy; >20% is excellent; <10% is weak',
  },
  ROA: {
    title: 'Return on Assets (ROA)',
    description: 'Measures how efficiently a company uses its assets to generate profit.',
    howCalculated: 'ROA = Net Income ÷ Total Assets × 100',
    whatItTellsUs:
      'Shows how much profit the company generates per rupee of assets. Higher ROA means more efficient asset utilization. Compare ROA across companies — a company with 10% ROA on ₹1000Cr of assets is more efficient than one with 5% ROA on ₹2000Cr.',
    goodRange: '5-10% is typical; >10% is strong; <5% is weak',
  },
};
