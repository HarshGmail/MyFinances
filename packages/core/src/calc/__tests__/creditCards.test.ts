import { describe, expect, it } from 'vitest';
import {
  groupEmiPlans,
  latestStatementByCard,
  linkGstToEmiInterest,
  normaliseEmiDescription,
  summariseCardSpend,
} from '../creditCards';
import { CreditCard, CreditCardStatement, CreditCardTransaction } from '../../types';

let nextId = 0;
function tx(partial: Partial<CreditCardTransaction>): CreditCardTransaction {
  nextId += 1;
  return {
    _id: `t${nextId}`,
    cardId: 'c1',
    statementId: 's1',
    date: '2026-08-05',
    description: 'ROW',
    amount: 100,
    direction: 'debit',
    kind: 'purchase',
    category: 'Others',
    ...partial,
  };
}

describe('credit card EMI plans', () => {
  it('strips installment markers so monthly rows land in one plan', () => {
    expect(normaliseEmiDescription('AMAZON EMI PRINCIPAL 03/12')).toBe('AMAZON');
    expect(normaliseEmiDescription('Amazon EMI Interest 4 of 12')).toBe('AMAZON');
  });

  it('links GST to the EMI interest it is 18% of, within the same statement', () => {
    const interest = tx({ kind: 'emi_interest', amount: 250 });
    const gst = tx({ kind: 'tax', amount: 45 });
    const unrelatedGst = tx({ kind: 'tax', amount: 90 });
    const otherStatementGst = tx({ kind: 'tax', amount: 45, statementId: 's2' });

    const linked = linkGstToEmiInterest([interest, unrelatedGst, otherStatementGst, gst]);

    expect(linked.get(interest._id)?._id).toBe(gst._id);
  });

  it('tracks paid vs remaining installments with interest and GST totals', () => {
    const rows = [
      tx({
        statementId: 's1',
        date: '2026-07-05',
        kind: 'emi_principal',
        amount: 900,
        description: 'AMAZON EMI PRINCIPAL 02/06',
        emiInstallment: { number: 2, of: 6 },
      }),
      tx({
        statementId: 's1',
        date: '2026-07-05',
        kind: 'emi_interest',
        amount: 100,
        description: 'AMAZON EMI INTEREST 02/06',
        emiInstallment: { number: 2, of: 6 },
      }),
      tx({ statementId: 's1', date: '2026-07-05', kind: 'tax', amount: 18 }),
      tx({
        statementId: 's2',
        date: '2026-08-05',
        kind: 'emi_principal',
        amount: 910,
        description: 'AMAZON EMI PRINCIPAL 03/06',
        emiInstallment: { number: 3, of: 6 },
      }),
      tx({
        statementId: 's2',
        date: '2026-08-05',
        kind: 'emi_interest',
        amount: 90,
        description: 'AMAZON EMI INTEREST 03/06',
        emiInstallment: { number: 3, of: 6 },
      }),
      tx({ statementId: 's2', date: '2026-08-05', kind: 'tax', amount: 16.2 }),
    ];

    const [plan] = groupEmiPlans(rows);

    expect(plan.description).toBe('AMAZON');
    expect(plan.installmentsPaid).toBe(3);
    expect(plan.installmentsRemaining).toBe(3);
    expect(plan.monthlyInstallment).toBe(1000);
    expect(plan.principalPaid).toBe(1810);
    expect(plan.interestPaid).toBe(190);
    expect(plan.gstPaid).toBeCloseTo(34.2);
    expect(plan.estimatedOutstanding).toBe(2730);
  });
});

describe('credit card spend summary', () => {
  it('counts purchases as spend (EMI principal repays an earlier purchase), interest/GST/fees as cost of credit', () => {
    const summary = summariseCardSpend([
      tx({ date: '2026-08-02', amount: 500, category: 'Food & Dining', cardId: 'c1' }),
      tx({ date: '2026-08-10', amount: 300, category: 'Shopping', cardId: 'c2' }),
      tx({ date: '2026-08-11', amount: 1000, kind: 'payment', direction: 'credit' }),
      tx({ date: '2026-08-12', amount: 50, kind: 'refund', direction: 'credit' }),
      tx({ date: '2026-08-15', amount: 200, kind: 'emi_principal', category: 'Shopping' }),
      tx({ date: '2026-08-15', amount: 40, kind: 'emi_interest' }),
      tx({ date: '2026-08-15', amount: 7.2, kind: 'tax' }),
      tx({ date: '2026-09-01', amount: 499, kind: 'fee' }),
    ]);

    expect(summary.months.map((m) => m.monthKey)).toEqual(['2026-08', '2026-09']);
    expect(summary.months[0].total).toBe(800);
    expect(summary.months[0].byCard).toEqual({ c1: 500, c2: 300 });
    expect(summary.months[0].costOfCredit).toBeCloseTo(47.2);
    expect(summary.months[1].costOfCredit).toBe(499);
    expect(summary.byCategory).toEqual({ 'Food & Dining': 500, Shopping: 300 });
    expect(summary.costOfCreditTotal).toBeCloseTo(546.2);
  });

  it('picks the latest statement per card with utilisation and days until due', () => {
    const cards = [{ _id: 'c1' }, { _id: 'c2' }] as CreditCard[];
    const statements = [
      { cardId: 'c1', periodEnd: '2026-08-20', totalDue: 100, creditLimit: 1000 },
      {
        cardId: 'c1',
        periodEnd: '2026-09-20',
        totalDue: 250,
        creditLimit: 1000,
        dueDate: '2026-10-10T00:00:00.000Z',
      },
    ] as CreditCardStatement[];

    const [first, second] = latestStatementByCard(
      cards,
      statements,
      new Date('2026-10-04T00:00:00.000Z')
    );

    expect(first.statement?.periodEnd).toBe('2026-09-20');
    expect(first.utilisation).toBe(0.25);
    expect(first.daysUntilDue).toBe(6);
    expect(second.statement).toBeNull();
  });
});
