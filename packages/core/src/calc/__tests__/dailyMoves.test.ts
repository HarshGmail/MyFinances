import { describe, expect, it } from 'vitest';
import {
  buildCryptoMove,
  buildGoldMove,
  buildMutualFundMove,
  buildStockMove,
  combineMoves,
  topMovers,
} from '../dailyMoves';
import { buildMfDailySummary } from '../mfDailyMoves';
import { getNseMarketStatus } from '../marketHours';
import { groupCryptoHoldings } from '../cryptoHoldings';
import {
  GoldTransaction,
  MutualFundInfo,
  MutualFundTransaction,
  StocksPortfolioItem,
  CryptoTransaction,
} from '../../types';

const stock = (overrides: Partial<StocksPortfolioItem>): StocksPortfolioItem => ({
  stockName: 'X',
  numOfShares: 1,
  avgPrice: 100,
  investedAmount: 100,
  currentPrice: 105,
  previousClose: 100,
  currentValuation: 105,
  profitLoss: 5,
  profitLossPercentage: 5,
  oneDayChange: 5,
  oneDayChangePercentage: 5,
  isDataAvailable: true,
  ...overrides,
});

describe('market hours', () => {
  it('classifies IST sessions', () => {
    expect(getNseMarketStatus(new Date('2026-09-24T03:30:00Z'))).toBe('pre-open');
    expect(getNseMarketStatus(new Date('2026-09-24T04:30:00Z'))).toBe('open');
    expect(getNseMarketStatus(new Date('2026-09-24T10:01:00Z'))).toBe('closed');
    expect(getNseMarketStatus(new Date('2026-09-26T06:00:00Z'))).toBe('weekend');
  });
});

describe('daily moves', () => {
  it('counts unpriced stocks in value but not in change', () => {
    const move = buildStockMove(
      [stock({}), stock({ stockName: 'Y', currentValuation: 50, isDataAvailable: false })],
      'Session'
    );
    expect(move.change).toBe(5);
    expect(move.changePct).toBeCloseTo(5, 6);
    expect(move.currentValue).toBe(155);
  });

  it('treats a fund with a lagging NAV as unchanged', () => {
    const txns = [
      { fundName: 'A', type: 'credit', numOfUnits: 10, amount: 1000 },
      { fundName: 'B', type: 'credit', numOfUnits: 10, amount: 1000 },
    ] as MutualFundTransaction[];
    const info = [
      { fundName: 'A', schemeNumber: 1 },
      { fundName: 'B', schemeNumber: 2 },
    ] as MutualFundInfo[];
    const move = buildMutualFundMove(txns, info, {
      1: {
        data: [
          { date: '24-09-2026', nav: '110' },
          { date: '23-09-2026', nav: '100' },
        ],
      },
      2: {
        data: [
          { date: '23-09-2026', nav: '50' },
          { date: '22-09-2026', nav: '40' },
        ],
      },
    } as never);
    expect(move.change).toBe(100);
    expect(move.advancers).toBe(1);
    expect(move.decliners).toBe(0);
  });

  it('derives previous crypto price from the 24h percent', () => {
    const holdings = groupCryptoHoldings([
      { type: 'credit', amount: 1000, quantity: 0.01, coinName: 'Bitcoin', coinSymbol: 'btc' },
    ] as CryptoTransaction[]);
    const move = buildCryptoMove(holdings, { BTC: { price: 100000, changePct24h: 2 } });
    expect(move.changePct).toBeCloseTo(2, 6);
  });

  it('values gold on live vs previous rate', () => {
    const move = buildGoldMove([{ type: 'credit', quantity: 2, amount: 10 }] as GoldTransaction[], [
      { date: 'a', rate: '10000' },
      { date: 'b', rate: '10100' },
    ]);
    expect(move.change).toBe(200);
  });

  it('combines classes and ranks movers by rupee impact', () => {
    const up = buildStockMove([stock({})], 'S');
    const down = buildStockMove([stock({ stockName: 'Z', oneDayChange: -20 })], 'S');
    expect(combineMoves([up, down]).change).toBe(-15);
    const { gainers, losers } = topMovers([up, down]);
    expect(gainers.map((h) => h.name)).toEqual(['X']);
    expect(losers.map((h) => h.name)).toEqual(['Z']);
  });
});

describe('mf daily summary', () => {
  it('computes day, week and month NAV changes and flags pending funds', () => {
    const summary = buildMfDailySummary([
      {
        fundName: 'A',
        units: 10,
        navHistory: [
          { date: '24-09-2026', nav: '110' },
          { date: '23-09-2026', nav: '100' },
          { date: '17-09-2026', nav: '90' },
          { date: '20-08-2026', nav: '80' },
        ],
      },
      { fundName: 'C', units: 2, navHistory: [{ date: '23-09-2026', nav: '20' }] },
    ]);
    const fundA = summary.funds.find((f) => f.fundName === 'A');
    expect(summary.totalChange).toBe(100);
    expect(summary.staleCount).toBe(1);
    expect(fundA?.weekChange?.changePct).toBeCloseTo(22.222, 2);
    expect(fundA?.monthChange?.changePct).toBeCloseTo(37.5, 6);
  });
});
