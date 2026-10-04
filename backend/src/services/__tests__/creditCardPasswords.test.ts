import { describe, expect, it } from 'vitest';
import {
  buildCardPasswordCandidates,
  extractPasswordHint,
  issuerForSender,
} from '../creditCardPasswords';

const DOB = new Date(Date.UTC(1994, 2, 7));

describe('issuerForSender', () => {
  it('maps known statement senders case-insensitively', () => {
    expect(issuerForSender('Statements@SBICard.com')).toBe('sbi');
    expect(issuerForSender('estatement@yes.bank.in')).toBe('yes');
  });

  it('returns null for unknown senders', () => {
    expect(issuerForSender('alerts@example.com')).toBeNull();
  });
});

describe('buildCardPasswordCandidates', () => {
  it('puts the SBI rules first', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'sbi',
      name: 'Mr. Harsh Kumar',
      dob: DOB,
      lastDigits: '4321',
    });
    expect(candidates.slice(0, 2)).toEqual(['HARS0703', 'HARS07031994']);
  });

  it('builds ICICI lower and upper variants', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'icici',
      name: 'Harsh Kumar',
      dob: DOB,
      lastDigits: '4321',
    });
    expect(candidates.slice(0, 2)).toEqual(['hars0703', 'HARS0703']);
  });

  it('builds Axis rules including first four letters and last four digits', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'axis',
      name: 'Harsh Kumar',
      dob: DOB,
      lastDigits: '4321',
    });
    expect(candidates.slice(0, 2)).toEqual(['HARS0703', 'HARS4321']);
  });

  it('builds HSBC surname and DOB plus card digit rules', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'hsbc',
      name: 'Dr Harsh Vardhan Kumar',
      dob: DOB,
      lastDigits: '654321',
    });
    expect(candidates.slice(0, 3)).toEqual(['KUMA0703', '070394654321', '0703944321']);
  });

  it('builds HDFC rules in order', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'hdfc',
      name: 'Harsh Kumar',
      dob: DOB,
      lastDigits: '4321',
    });
    expect(candidates.slice(0, 3)).toEqual(['HARS0703', 'HARS4321', 'hars0703']);
  });

  it('builds YES Bank DOB-first rules', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'yes',
      name: 'Harsh Kumar',
      dob: DOB,
      lastDigits: '4321',
    });
    expect(candidates.slice(0, 2)).toEqual(['07031994', 'HARS0703']);
  });

  it('includes generic variants and dedupes', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'other',
      name: 'Harsh Kumar',
      dob: DOB,
      lastDigits: '654321',
    });
    expect(candidates).toEqual(expect.arrayContaining(['HAR0703', 'har070394', 'hars07031994']));
    expect(candidates).toEqual(expect.arrayContaining(['KUMA0703', '070394', '0703']));
    expect(candidates).toEqual(
      expect.arrayContaining(['07034321', '0703654321', '4321', '654321'])
    );
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it('formats DOB in UTC so midnight-UTC dates do not shift', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'yes',
      name: 'Harsh',
      dob: new Date('1994-03-07T00:00:00.000Z'),
      lastDigits: '4321',
    });
    expect(candidates[0]).toBe('07031994');
  });

  it('skips DOB-based candidates when DOB is missing', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'sbi',
      name: 'Harsh Kumar',
      lastDigits: '4321',
    });
    expect(candidates).toEqual(['4321']);
  });

  it('keeps digit-only issuer rules when the name is too short', () => {
    const candidates = buildCardPasswordCandidates({
      issuer: 'yes',
      name: 'Al',
      dob: DOB,
      lastDigits: '4321',
    });
    expect(candidates[0]).toBe('07031994');
    expect(candidates).not.toContain('AL0703');
  });
});

describe('extractPasswordHint', () => {
  it('returns the sentence that mentions the password', () => {
    const html = `<html><head><style>p { color: red; }</style></head><body>
      <p>Dear Customer,</p>
      <p>Your YES BANK Credit Card statement for the period 21/08/2026 To 20/09/2026 is attached.</p>
      <p>Total Amount Due Rs.720.64. To open the attachment, enter the password which is your date of birth in DDMMYYYY format. Please do not share it.</p>
    </body></html>`;
    expect(extractPasswordHint(html)).toBe(
      'To open the attachment, enter the password which is your date of birth in DDMMYYYY format.'
    );
  });

  it('returns undefined when nothing mentions a password', () => {
    expect(extractPasswordHint('<p>Your statement is attached.</p>')).toBeUndefined();
  });

  it('caps very long hints', () => {
    const hint = extractPasswordHint(`<p>Password ${'x'.repeat(500)}</p>`);
    expect(hint?.length).toBeLessThanOrEqual(300);
  });
});
