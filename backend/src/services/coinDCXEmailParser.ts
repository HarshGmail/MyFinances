/**
 * CoinDCX Trade Executed email parser
 *
 * Email format (HTML body, no attachment):
 *   From: no-reply@coindcx.com
 *   Subject: CoinDCX Trade Executed
 *
 * Relevant content (decoded from quoted-printable):
 *   "your trade of 0.0231 ETH in the ETHINR market on DCXtrade has been successfully executed."
 *   "Limit Order"  (or "Buy Limit Order" / "Sell Limit Order" / "Market Order" etc.)
 *   "Average Price: 219133.92"
 *   "Order Value: 0.0231 ETH"
 *   "Total Fees: 29.8657619568 INR"
 *   "Date: 30 Jun 2025 01:36:43 +0000"
 */

export interface ParsedCoinDCXTrade {
  coinSymbol: string; // e.g. "ETH"
  coinName: string; // e.g. "Ethereum" (derived from symbol, fallback = symbol)
  quantity: number; // units of the coin
  coinPrice: number; // average price in INR per coin
  amount: number; // total INR value (quantity × coinPrice)
  fees: number; // INR fees
  date: Date;
  type: 'credit' | 'debit'; // credit = buy, debit = sell
}

// Best-effort mapping from CoinDCX symbols to display names
const COIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  BNB: 'BNB',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  MATIC: 'Polygon',
  POL: 'Polygon',
  DOT: 'Polkadot',
  LTC: 'Litecoin',
  SHIB: 'Shiba Inu',
  AVAX: 'Avalanche',
  LINK: 'Chainlink',
  UNI: 'Uniswap',
  ATOM: 'Cosmos',
  TRX: 'TRON',
  NEAR: 'NEAR Protocol',
  FTM: 'Fantom',
  ALGO: 'Algorand',
  VET: 'VeChain',
  SAND: 'The Sandbox',
  MANA: 'Decentraland',
  CRO: 'Cronos',
  HBAR: 'Hedera',
  ICP: 'Internet Computer',
  APE: 'ApeCoin',
  AAVE: 'Aave',
  MKR: 'Maker',
  SNX: 'Synthetix',
  COMP: 'Compound',
  ZEC: 'Zcash',
  XLM: 'Stellar',
  EOS: 'EOS',
  XTZ: 'Tezos',
  DASH: 'Dash',
  OMG: 'OMG Network',
  BAT: 'Basic Attention Token',
  ZRX: '0x Protocol',
  ENJ: 'Enjin Coin',
};

/**
 * Strip HTML tags and decode common HTML entities.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ') // remove all tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#xA0;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a CoinDCX "Trade Executed" HTML email body.
 * Returns null if the email doesn't match the expected format.
 */
export function parseCoinDCXTradeEmail(html: string): ParsedCoinDCXTrade | null {
  const text = htmlToText(html);

  // ── Coin symbol from market name ──────────────────────────────────────────
  // "your trade of 0.0231 ETH in the ETHINR market"
  // Market suffix is always INR (CoinDCX INR pairs only for our purpose)
  const marketMatch = text.match(/in the\s+([A-Z0-9]+)(?:INR|USDT|USDC|BTC)\s+market/i);
  if (!marketMatch) {
    console.log('[CoinDCX Parser] Could not find market name in email');
    return null;
  }
  const coinSymbol = marketMatch[1].toUpperCase();
  const coinName = COIN_NAMES[coinSymbol] ?? coinSymbol;

  // ── Order type / direction ────────────────────────────────────────────────
  // Look for "Buy" or "Sell" anywhere in the order type section
  // CoinDCX may say "Buy Limit Order", "Sell Market Order", "Limit Order", etc.
  let type: 'credit' | 'debit' = 'credit'; // default: buy
  const orderTypeMatch = text.match(/\b(buy|sell)\b/i);
  if (orderTypeMatch) {
    type = orderTypeMatch[1].toLowerCase() === 'sell' ? 'debit' : 'credit';
  }

  // ── Average Price ─────────────────────────────────────────────────────────
  const priceMatch = text.match(/Average\s+Price\s*[-:]?\s*([\d,]+\.?\d*)/i);
  if (!priceMatch) {
    console.log('[CoinDCX Parser] Could not find Average Price in email');
    return null;
  }
  const coinPrice = parseFloat(priceMatch[1].replace(/,/g, ''));

  // ── Quantity from "Order Value: 0.0231 ETH" ───────────────────────────────
  const qtyMatch = text.match(/Order\s+Value\s*[-:]?\s*([\d.]+)\s*[A-Z]+/i);
  if (!qtyMatch) {
    console.log('[CoinDCX Parser] Could not find Order Value in email');
    return null;
  }
  const quantity = parseFloat(qtyMatch[1]);

  // ── Fees ──────────────────────────────────────────────────────────────────
  const feesMatch = text.match(/Total\s+Fees\s*[-:]?\s*([\d.]+)\s*INR/i);
  const fees = feesMatch ? parseFloat(feesMatch[1]) : 0;

  // ── Date ─────────────────────────────────────────────────────────────────
  // "Date: 30 Jun 2025 01:36:43 +0000"
  const dateMatch = text.match(/Date\s*[-:]?\s*(\d{1,2}\s+\w+\s+\d{4}\s+[\d:]+\s*[+-]\d{4})/i);
  if (!dateMatch) {
    console.log('[CoinDCX Parser] Could not find Date in email');
    return null;
  }
  const date = new Date(dateMatch[1]);
  if (isNaN(date.getTime())) {
    console.log(`[CoinDCX Parser] Could not parse date: "${dateMatch[1]}"`);
    return null;
  }

  const amount = parseFloat((quantity * coinPrice).toFixed(2));

  console.log(
    `[CoinDCX Parser] Parsed: ${type === 'credit' ? 'BUY' : 'SELL'} ${quantity} ${coinSymbol} @ ₹${coinPrice} on ${date.toISOString().slice(0, 10)}`
  );

  return { coinSymbol, coinName, quantity, coinPrice, amount, fees, date, type };
}
