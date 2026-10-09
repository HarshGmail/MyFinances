import { describe, expect, it } from 'vitest';
import {
  classifyEmiPlans,
  currentCycleSpendByCard,
  emiChargesByCard,
  groupEmiPlans,
  latestStatementByCard,
  linkGstToEmiInterest,
  liveAlerts,
  normaliseEmiDescription,
  summariseCardSpend,
  summariseLiveAlerts,
  type EmiPlan,
} from '../creditCards';
import {
  CardTransactionAlert,
  CreditCard,
  CreditCardStatement,
  CreditCardTransaction,
} from '../../types';

let alertSeq = 0;
function alert(partial: Partial<CardTransactionAlert>): CardTransactionAlert {
  alertSeq += 1;
  return {
    _id: `a${alertSeq}`,
    cardId: 'c1',
    date: '2026-10-02',
    description: 'MERCHANT',
    amount: 100,
    direction: 'debit',
    category: 'Others',
    gmailMessageId: `g${alertSeq}`,
    supersededByStatement: false,
    ...partial,
  };
}

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

  it('ignores the per-month tax note so SBI FlexiPay installments land in one plan', () => {
    const rows = [
      { date: '2026-08-02', number: 1, amount: 2533.41, tax: '53.55' },
      { date: '2026-09-02', number: 2, amount: 2459.04, tax: '35.89' },
      { date: '2026-10-02', number: 3, amount: 2459.04, tax: '31.56' },
    ].map(({ date, number, amount, tax }) =>
      tx({
        date,
        statementId: date,
        kind: 'emi_principal',
        amount,
        description: `FP EMI 0${number}/09(EXCL TAX ${tax})`,
        emiInstallment: { number, of: 9 },
      })
    );

    const plans = groupEmiPlans(rows);

    expect(plans).toHaveLength(1);
    expect(plans[0].description).toBe('FP');
    expect(plans[0].installmentsPaid).toBe(3);
    expect(plans[0].installmentsRemaining).toBe(6);
    expect(plans[0].startedOn).toBe('2026-08-02');
    expect(plans[0].principalPaid).toBeCloseTo(7451.49);
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
    expect(plan.monthlyInterest).toBe(90);
    expect(plan.monthlyGst).toBeCloseTo(16.2);
    expect(plan.principalPaid).toBe(1810);
    expect(plan.interestPaid).toBe(190);
    expect(plan.gstPaid).toBeCloseTo(34.2);
    expect(plan.estimatedOutstanding).toBe(2730);
    expect(plan.startedOn).toBe('2026-07-05');
    expect(plan.lastBilledOn).toBe('2026-08-05');
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

describe('live transaction alerts', () => {
  it('excludes superseded alerts from the live set', () => {
    const alerts = [
      alert({ amount: 100 }),
      alert({ amount: 200, supersededByStatement: true }),
      alert({ amount: 50 }),
    ];
    expect(liveAlerts(alerts)).toHaveLength(2);
  });

  it('sums current-cycle debit spend per card', () => {
    const byCard = currentCycleSpendByCard([
      alert({ cardId: 'c1', amount: 100 }),
      alert({ cardId: 'c1', amount: 50 }),
      alert({ cardId: 'c2', amount: 300 }),
      alert({ cardId: 'c1', amount: 999, supersededByStatement: true }),
    ]);
    expect(byCard).toEqual({ c1: 150, c2: 300 });
  });

  it('summarises live alerts by category with a running total and count', () => {
    const summary = summariseLiveAlerts([
      alert({ amount: 100, category: 'Food & Dining' }),
      alert({ amount: 50, category: 'Shopping' }),
      alert({ amount: 25, category: 'Food & Dining' }),
      alert({ amount: 999, category: 'Shopping', supersededByStatement: true }),
    ]);
    expect(summary.total).toBe(175);
    expect(summary.count).toBe(3);
    expect(summary.byCategory).toEqual({ 'Food & Dining': 125, Shopping: 50 });
  });
});

function emiPlan(partial: Partial<EmiPlan>): EmiPlan {
  return {
    key: 'k',
    cardId: 'c1',
    description: 'PLAN',
    installmentsPaid: 1,
    installmentsTotal: 12,
    installmentsRemaining: 11,
    monthlyInstallment: 1000,
    monthlyInterest: 100,
    monthlyGst: 18,
    principalPaid: 900,
    interestPaid: 100,
    gstPaid: 18,
    estimatedOutstanding: 9900,
    startedOn: '2026-09-05',
    lastBilledOn: '2026-10-05',
    ...partial,
  };
}

describe('EMI plan classification', () => {
  it('splits completed, stale and active plans', () => {
    const active = emiPlan({ key: 'a', lastBilledOn: '2026-10-05', installmentsRemaining: 5 });
    const completed = emiPlan({
      key: 'b',
      installmentsTotal: 6,
      installmentsPaid: 6,
      installmentsRemaining: 0,
      lastBilledOn: '2026-09-05',
    });
    const stale = emiPlan({ key: 'c', lastBilledOn: '2026-06-05', installmentsRemaining: 3 });

    const result = classifyEmiPlans([active, completed, stale]);

    expect(result.active.map((p) => p.key)).toEqual(['a']);
    expect(result.completed.map((p) => p.key)).toEqual(['b']);
    expect(result.stale.map((p) => p.key)).toEqual(['c']);
  });

  it('treats an unknown-tenure plan as active while it keeps billing', () => {
    const plan = emiPlan({ installmentsTotal: 0, installmentsRemaining: 0 });
    const result = classifyEmiPlans([plan]);
    expect(result.active).toHaveLength(1);
    expect(result.completed).toHaveLength(0);
  });
});

describe('EMI charges by card', () => {
  it('breaks each card down by plan and sums interest plus GST', () => {
    const plans = [
      emiPlan({ key: 'big', cardId: 'c1', monthlyInterest: 200, monthlyGst: 36 }),
      emiPlan({ key: 'small', cardId: 'c1', monthlyInterest: 50, monthlyGst: 9 }),
      emiPlan({ key: 'other', cardId: 'c2', monthlyInterest: 120, monthlyGst: 21.6 }),
      emiPlan({ key: 'nocharge', cardId: 'c1', monthlyInterest: 0, monthlyGst: 0 }),
    ];

    const [first, second] = emiChargesByCard(plans);

    expect(first.cardId).toBe('c1');
    expect(first.plans.map((p) => p.plan.key)).toEqual(['big', 'small']);
    expect(first.interest).toBe(250);
    expect(first.gst).toBe(45);
    expect(first.total).toBe(295);
    expect(second.cardId).toBe('c2');
    expect(second.total).toBeCloseTo(141.6);
  });
});
