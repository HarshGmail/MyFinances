import { describe, expect, it } from 'vitest';
import { alertMentionsCard, parseCardAlert } from '../creditCardAlertParser';

const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

const YES_ALERT = `<p>Dear Customer,</p><p>INR 25.00 has been spent on your YES BANK Credit Card
ending with 7221 at UPI_MRS CHITRA DHANALA on 25-09-2026 at 08:39:30 am. Avl Bal INR 180,184.36.</p>`;

const SBI_ALERT = `<p>Dear Cardholder,</p><p>Rs.287.00 spent on your SBI Credit Card ending with 6437 at
Blinkit on 02-10-26 via UPI (Ref No. 627525021314).</p>`;

const HDFC_ALERT = `<p>Thank you for using your HDFC Bank Credit Card ending in 9670.You made a
transaction of Rs. 313.00 at SWIGGY FOOD on 04-10-2026 19:16:26. Authorization code: 014606</p>`;

const HSBC_ALERT = `<p>We write to confirm that your Credit card no ending with 3420,has been used for
INR 7247.00 for payment to MAKE MY TRIP INDIA PVT LT on 26 May 2026 at 13:57.</p>`;

const AXIS_ALERT = `<table>
<tr><td>Transaction Amount:</td><td>INR 860</td></tr>
<tr><td>Merchant Name:</td><td>MEESHO</td></tr>
<tr><td>Axis Bank Credit Card No.</td><td>XX2026</td></tr>
<tr><td>Date &amp; Time:</td><td>21-08-2026, 12:53:59 IST</td></tr>
</table>`;

describe('parseCardAlert', () => {
  it('reads a YES Bank spend alert', () => {
    const alert = parseCardAlert(YES_ALERT, 'yes');
    expect(alert).not.toBeNull();
    expect(alert?.amount).toBe(25);
    expect(alert?.description).toBe('UPI_MRS CHITRA DHANALA');
    expect(alert?.date).toEqual(utc(2026, 9, 25));
    expect(alert?.lastDigits).toBe('7221');
  });

  it('reads an SBI alert with a two-digit year and classifies the merchant', () => {
    const alert = parseCardAlert(SBI_ALERT, 'sbi');
    expect(alert?.amount).toBe(287);
    expect(alert?.description).toBe('Blinkit');
    expect(alert?.date).toEqual(utc(2026, 10, 2));
    expect(alert?.category).toBe('Shopping');
    expect(alert?.lastDigits).toBe('6437');
  });

  it('reads an HDFC alert with a trailing timestamp', () => {
    const alert = parseCardAlert(HDFC_ALERT, 'hdfc');
    expect(alert?.amount).toBe(313);
    expect(alert?.description).toBe('SWIGGY FOOD');
    expect(alert?.date).toEqual(utc(2026, 10, 4));
    expect(alert?.category).toBe('Food & Dining');
    expect(alert?.lastDigits).toBe('9670');
  });

  it('reads an HSBC payment alert with a named-month date', () => {
    const alert = parseCardAlert(HSBC_ALERT, 'hsbc');
    expect(alert?.amount).toBe(7247);
    expect(alert?.description).toBe('MAKE MY TRIP INDIA PVT LT');
    expect(alert?.date).toEqual(utc(2026, 5, 26));
    expect(alert?.lastDigits).toBe('3420');
  });

  it('reads the Axis labelled layout', () => {
    const alert = parseCardAlert(AXIS_ALERT, 'axis');
    expect(alert?.amount).toBe(860);
    expect(alert?.description).toBe('MEESHO');
    expect(alert?.date).toEqual(utc(2026, 8, 21));
    expect(alert?.lastDigits).toBe('2026');
  });

  it('returns null for an unrelated email', () => {
    expect(parseCardAlert('<p>Your statement is ready to view.</p>', 'hdfc')).toBeNull();
  });
});

describe('alertMentionsCard', () => {
  it('matches the card by its last four digits', () => {
    expect(alertMentionsCard(YES_ALERT, '7221')).toBe(true);
    expect(alertMentionsCard(HDFC_ALERT, '9670')).toBe(true);
    expect(alertMentionsCard(AXIS_ALERT, '2026')).toBe(true);
  });

  it('rejects an alert for a different card', () => {
    expect(alertMentionsCard(YES_ALERT, '1234')).toBe(false);
  });
});
