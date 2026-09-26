import { describe, expect, it } from 'vitest';
import { buildMfFundRows, latestNavMap } from '../portfolioCalculations';
import { holdingXirrPercent } from '../holdingXirr';
import { MutualFundInfo, MutualFundTransaction } from '../../types';

describe('holdingXirrPercent', () => {
  it('returns a percentage for a gain', () => {
    const rate = holdingXirrPercent(
      [{ type: 'credit', amount: 1000, date: '2024-01-01' }],
      1100,
      new Date('2025-01-01')
    );
    expect(rate).toBeCloseTo(10, 0);
  });

  it('returns null without transactions or value', () => {
    expect(holdingXirrPercent([], 100)).toBeNull();
    expect(holdingXirrPercent([{ type: 'credit', amount: 1, date: '2024-01-01' }], 0)).toBeNull();
  });
});

describe('mutual fund rows', () => {
  const info = [
    { fundName: 'A', schemeNumber: 1 },
    { fundName: 'B', schemeNumber: 2 },
  ] as MutualFundInfo[];
  const txns = [
    { fundName: 'A', type: 'credit', numOfUnits: 10, amount: 1000, date: '2024-01-01' },
    { fundName: 'A', type: 'debit', numOfUnits: 4, amount: 500, date: '2024-06-01' },
    { fundName: 'B', type: 'credit', numOfUnits: 5, amount: 500, date: '2024-01-01' },
  ] as MutualFundTransaction[];

  it('uses the newest NAV per scheme and marks missing ones null', () => {
    const map = latestNavMap([1, 2, 3], {
      1: {
        data: [
          { date: '24-09-2026', nav: '120' },
          { date: '23-09-2026', nav: '118' },
        ],
      },
      2: { data: [] },
    });
    expect(map[1]).toEqual({ nav: 120, navDate: '24-09-2026' });
    expect(map[2]).toBeNull();
    expect(map[3]).toBeNull();
  });

  it('values remaining units at average cost and attaches scheme and XIRR', () => {
    const rows = buildMfFundRows(
      txns,
      info,
      { 1: { nav: 120, navDate: '' }, 2: null },
      new Date('2025-01-01')
    );
    const fundA = rows.find((r) => r.fundName === 'A')!;
    const fundB = rows.find((r) => r.fundName === 'B')!;
    expect(fundA.totalUnits).toBe(6);
    expect(fundA.totalInvested).toBe(600);
    expect(fundA.currentValue).toBe(720);
    expect(fundA.schemeNumber).toBe(1);
    expect(fundA.fundXirr).not.toBeNull();
    expect(fundB.currentValue).toBeNull();
    expect(fundB.fundXirr).toBeNull();
  });
});
