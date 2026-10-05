import { describe, expect, it } from 'vitest';
import { commitIdFromFilename, parseBailmentPdf } from '../safegoldBailmentParser';

const BAILMENT_TEXT = `Name of Customer : Harsh Vardhan Maddala
Customer PAN : GGCPM3400C
Lessee Name : D.P. Jewellers
Yield : 4 %
Bailment Tenure : 302 days
Bailed Precious Metal
Amount
: 2.0269 gms
TERMS OF USE APPLICABLE TO BAILOR OF THE PRECIOUS METAL`;

const APPLIED_ON = new Date(Date.UTC(2026, 9, 5));

describe('commitIdFromFilename', () => {
  it('pulls the digits out of the bailment filename', () => {
    expect(commitIdFromFilename('Bailment_Terms_1815745994.pdf')).toBe('1815745994');
  });

  it('returns null when there are no digits', () => {
    expect(commitIdFromFilename('Bailment_Terms.pdf')).toBeNull();
  });
});

describe('parseBailmentPdf', () => {
  it('reads the lease header from a metal-lease-applied PDF', () => {
    const lease = parseBailmentPdf(BAILMENT_TEXT, {
      commitId: '1815745994',
      appliedOn: APPLIED_ON,
    });
    expect(lease).not.toBeNull();
    expect(lease?.commitId).toBe('1815745994');
    expect(lease?.borrower).toBe('D.P. Jewellers');
    expect(lease?.leasedGrams).toBe(2.0269);
    expect(lease?.yieldPercent).toBe(4);
    expect(lease?.tenureDays).toBe(302);
    expect(lease?.startDate).toEqual(APPLIED_ON);
    expect(lease?.endDate).toEqual(new Date(Date.UTC(2026, 9, 5) + 302 * 24 * 60 * 60 * 1000));
    expect(lease?.earnedGrams).toBe(0);
    expect(lease?.payouts).toEqual([]);
    expect(lease?.statementMonth).toBeNull();
  });

  it('returns null for an unrelated PDF', () => {
    expect(
      parseBailmentPdf('Tax Invoice for your gold purchase', {
        commitId: '1',
        appliedOn: APPLIED_ON,
      })
    ).toBeNull();
  });
});
