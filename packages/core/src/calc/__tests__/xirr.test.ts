import { describe, expect, it } from 'vitest';
import xirr from '../xirr';

describe('xirr', () => {
  it('finds ~10% for a one-year 10% gain', () => {
    const rate = xirr([
      { amount: -1000, when: new Date('2024-01-01') },
      { amount: 1100, when: new Date('2025-01-01') },
    ]);
    expect(rate).toBeCloseTo(0.1, 2);
  });

  it('handles multiple deposits', () => {
    const rate = xirr([
      { amount: -1000, when: new Date('2023-01-01') },
      { amount: -1000, when: new Date('2024-01-01') },
      { amount: 2310, when: new Date('2025-01-01') },
    ]);
    expect(rate).toBeCloseTo(0.1, 2);
  });

  it('rejects a single cash flow', () => {
    expect(() => xirr([{ amount: -1, when: new Date() }])).toThrow();
  });
});
