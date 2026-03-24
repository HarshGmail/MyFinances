/**
 * Capital gains tax calculations for Indian investors (FIFO method).
 * Rules applied: Finance Act 2024 (effective July 23, 2024).
 */

export type AssetType = 'stocks' | 'gold' | 'crypto' | 'mutualFunds';

// ── Indian Financial Year ──────────────────────────────────────────────────

/** Returns the Indian FY string for a date, e.g. "2024-25" */
export function getIndianFY(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= 4) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

/** Returns April 1 of the FY start year for a given FY string like "2024-25" */
export function fyStartDate(fy: string): Date {
  const startYear = parseInt(fy.split('-')[0], 10);
  return new Date(startYear, 3, 1); // April 1
}

/** Returns March 31 of the FY end year */
export function fyEndDate(fy: string): Date {
  const endYear = parseInt(fy.split('-')[0], 10) + 1;
  return new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31
}

// ── Budget 2024 cutoff ─────────────────────────────────────────────────────

const BUDGET_2024_DATE = new Date('2024-07-23');

interface EquityRates {
  stcgRate: number; // fraction e.g. 0.20
  ltcgRate: number; // fraction e.g. 0.125
  ltcgExemption: number; // in rupees e.g. 125000
}

export function equityRates(saleDate: Date): EquityRates {
  if (saleDate >= BUDGET_2024_DATE) {
    return { stcgRate: 0.2, ltcgRate: 0.125, ltcgExemption: 125000 };
  }
  return { stcgRate: 0.15, ltcgRate: 0.1, ltcgExemption: 100000 };
}

// ── LTCG holding period thresholds ────────────────────────────────────────

export function ltcgThresholdDays(assetType: AssetType): number {
  if (assetType === 'gold') return 730; // 24 months post Budget 2024
  return 365; // equity stocks, equity MF, crypto (not applicable but set)
}

// ── FIFO core ─────────────────────────────────────────────────────────────

interface RawTransaction {
  _id?: unknown;
  type: 'credit' | 'debit';
  date: Date | string;
  qty: number; // units/shares/grams
  costPerUnit: number; // price per unit at transaction time
  label?: string; // stockName / coinName / fundName (for grouping)
}

export interface RealizedLot {
  saleDate: Date;
  purchaseDate: Date;
  units: number;
  costPerUnit: number;
  salePrice: number;
  gain: number;
  holdingDays: number;
  isLtcg: boolean;
  label?: string;
}

export interface CurrentLot {
  purchaseDate: Date;
  units: number;
  costPerUnit: number;
  holdingDays: number;
  label?: string;
}

export interface FifoResult {
  realizedGains: RealizedLot[];
  currentLots: CurrentLot[];
}

export function runFifo(transactions: RawTransaction[], assetType: AssetType): FifoResult {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const queue: { date: Date; costPerUnit: number; units: number; label?: string }[] = [];
  const realizedGains: RealizedLot[] = [];
  const today = new Date();
  const threshold = ltcgThresholdDays(assetType);

  for (const tx of sorted) {
    const txDate = new Date(tx.date);
    if (tx.type === 'credit') {
      queue.push({ date: txDate, costPerUnit: tx.costPerUnit, units: tx.qty, label: tx.label });
    } else {
      // debit = sell
      let remaining = tx.qty;
      const salePrice = tx.costPerUnit; // costPerUnit for sells = sale price per unit

      while (remaining > 0 && queue.length > 0) {
        const lot = queue[0];
        const matched = Math.min(lot.units, remaining);
        const gain = (salePrice - lot.costPerUnit) * matched;
        const holdingDays = Math.floor((txDate.getTime() - lot.date.getTime()) / 86400000);

        realizedGains.push({
          saleDate: txDate,
          purchaseDate: lot.date,
          units: matched,
          costPerUnit: lot.costPerUnit,
          salePrice,
          gain,
          holdingDays,
          isLtcg: holdingDays > threshold,
          label: tx.label ?? lot.label,
        });

        lot.units -= matched;
        remaining -= matched;
        if (lot.units <= 0) queue.shift();
      }
    }
  }

  // Remaining lots = current (unrealized) holdings
  const currentLots: CurrentLot[] = queue.map((lot) => ({
    purchaseDate: lot.date,
    units: lot.units,
    costPerUnit: lot.costPerUnit,
    holdingDays: Math.floor((today.getTime() - lot.date.getTime()) / 86400000),
    label: lot.label,
  }));

  return { realizedGains, currentLots };
}

// ── Tax estimation ─────────────────────────────────────────────────────────

interface AssetFYGains {
  stcgGains: number;
  ltcgGains: number;
  stcgTax: number;
  ltcgTax: number;
  flatGains?: number; // crypto
  flatTax?: number; // crypto
  lots: RealizedLot[];
}

export function computeAssetFYGains(
  realizedGains: RealizedLot[],
  assetType: AssetType
): Record<string, AssetFYGains> {
  const byFY: Record<string, AssetFYGains> = {};

  for (const lot of realizedGains) {
    const fy = getIndianFY(lot.saleDate);
    if (!byFY[fy]) {
      byFY[fy] = {
        stcgGains: 0,
        ltcgGains: 0,
        stcgTax: 0,
        ltcgTax: 0,
        flatGains: 0,
        flatTax: 0,
        lots: [],
      };
    }
    const entry = byFY[fy];
    entry.lots.push(lot);

    if (assetType === 'crypto') {
      entry.flatGains = (entry.flatGains ?? 0) + lot.gain;
      entry.flatTax = (entry.flatTax ?? 0) + Math.max(0, lot.gain) * 0.3;
    } else if (assetType === 'gold') {
      // Digital gold (SafeGold) gains are tax-free — gains tracked but no tax computed
      if (lot.isLtcg) {
        entry.ltcgGains += lot.gain;
      } else {
        entry.stcgGains += lot.gain;
      }
      // stcgTax and ltcgTax remain 0 for gold
    } else {
      const rates = equityRates(lot.saleDate);
      if (lot.isLtcg) {
        entry.ltcgGains += lot.gain;
        // NOTE: ₹1.25L exemption not applied per-lot; shown as note
        entry.ltcgTax += Math.max(0, lot.gain) * rates.ltcgRate;
      } else {
        entry.stcgGains += lot.gain;
        entry.stcgTax += Math.max(0, lot.gain) * rates.stcgRate;
      }
    }
  }

  return byFY;
}

// ── Summary across all assets ──────────────────────────────────────────────

interface FYSummaryEntry {
  equityStcg: number;
  equityLtcg: number;
  goldStcg: number;
  goldLtcg: number;
  cryptoGains: number;
  equityStcgTax: number;
  equityLtcgTax: number;
  goldLtcgTax: number;
  cryptoTax: number;
  totalEstimatedTax: number;
}

export function buildSummary(
  stocksByFY: Record<string, AssetFYGains>,
  goldByFY: Record<string, AssetFYGains>,
  cryptoByFY: Record<string, AssetFYGains>,
  mfByFY: Record<string, AssetFYGains>
): Record<string, FYSummaryEntry> {
  const allFYs = new Set([
    ...Object.keys(stocksByFY),
    ...Object.keys(goldByFY),
    ...Object.keys(cryptoByFY),
    ...Object.keys(mfByFY),
  ]);

  const summary: Record<string, FYSummaryEntry> = {};

  for (const fy of allFYs) {
    const s = stocksByFY[fy] ?? { stcgGains: 0, ltcgGains: 0, stcgTax: 0, ltcgTax: 0 };
    const g = goldByFY[fy] ?? { stcgGains: 0, ltcgGains: 0, ltcgTax: 0 };
    const c = cryptoByFY[fy] ?? { flatGains: 0, flatTax: 0 };
    const m = mfByFY[fy] ?? { stcgGains: 0, ltcgGains: 0, stcgTax: 0, ltcgTax: 0 };

    const equityStcgTax = s.stcgTax + m.stcgTax;
    const equityLtcgTax = s.ltcgTax + m.ltcgTax;
    const goldLtcgTax = 0; // Digital gold gains are tax-free
    const cryptoTax = c.flatTax ?? 0;

    summary[fy] = {
      equityStcg: s.stcgGains + m.stcgGains,
      equityLtcg: s.ltcgGains + m.ltcgGains,
      goldStcg: g.stcgGains,
      goldLtcg: g.ltcgGains,
      cryptoGains: c.flatGains ?? 0,
      equityStcgTax,
      equityLtcgTax,
      goldLtcgTax,
      cryptoTax,
      totalEstimatedTax: equityStcgTax + equityLtcgTax + cryptoTax, // gold excluded
    };
  }

  return summary;
}
