import { format, parseISO } from 'date-fns';
import { COST_OF_CREDIT_KINDS } from '../schemas/creditCards';
import type {
  CardTransactionAlert,
  CardTransactionKind,
  CreditCard,
  CreditCardStatement,
  CreditCardTransaction,
} from '../types';
import { summariseSpend, type SpendTotals } from './financialMonth';

export const GST_RATE = 0.18;
const GST_MATCH_TOLERANCE_RUPEES = 1;
const MONTH_KEY_FORMAT = 'yyyy-MM';

const roundToPaise = (value: number) => Math.round(value * 100) / 100;

const EMI_KINDS: readonly CardTransactionKind[] = ['emi_principal', 'emi_interest'];
const INSTALLMENT_MARKER = /\b\d{1,2}\s*(?:\/|of)\s*\d{1,2}\b/gi;
const EMI_NOISE_WORDS = /\b(emi|principal|interest|amount|amt|inst(?:allment)?|no|loan|on)\b/gi;

export interface EmiPlan {
  key: string;
  cardId: string;
  description: string;
  installmentsPaid: number;
  installmentsTotal: number;
  installmentsRemaining: number;
  monthlyInstallment: number;
  monthlyInterest: number;
  monthlyGst: number;
  principalPaid: number;
  interestPaid: number;
  gstPaid: number;
  estimatedOutstanding: number;
  startedOn: string;
  lastBilledOn: string;
}

export type EmiPlanStatus = 'active' | 'completed' | 'stale';

export interface CardMonthSpend {
  monthKey: string;
  byCard: Record<string, number>;
  costOfCredit: number;
  total: number;
}

export interface CardSpendSummary {
  months: CardMonthSpend[];
  byCategory: Record<string, number>;
  byKind: Partial<Record<CardTransactionKind, number>>;
  spend: SpendTotals;
  costOfCreditTotal: number;
}

export interface CardDueSummary {
  card: CreditCard;
  statement: CreditCardStatement | null;
  utilisation: number | null;
  daysUntilDue: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function isSpend(tx: CreditCardTransaction): boolean {
  return tx.direction === 'debit' && tx.kind === 'purchase';
}

export function isCostOfCredit(tx: CreditCardTransaction): boolean {
  return tx.direction === 'debit' && COST_OF_CREDIT_KINDS.includes(tx.kind);
}

export function normaliseEmiDescription(description: string): string {
  return description
    .replace(INSTALLMENT_MARKER, ' ')
    .replace(EMI_NOISE_WORDS, ' ')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function isGstOnInterest(tax: CreditCardTransaction, interest: CreditCardTransaction): boolean {
  return Math.abs(tax.amount - interest.amount * GST_RATE) <= GST_MATCH_TOLERANCE_RUPEES;
}

export function linkGstToEmiInterest(
  transactions: CreditCardTransaction[]
): Map<string, CreditCardTransaction> {
  const linked = new Map<string, CreditCardTransaction>();
  const claimedTaxIds = new Set<string>();
  const interestRows = transactions.filter((tx) => tx.kind === 'emi_interest');
  const taxRows = transactions.filter((tx) => tx.kind === 'tax');

  for (const interest of interestRows) {
    const match = taxRows.find(
      (tax) =>
        !claimedTaxIds.has(tax._id) &&
        tax.statementId === interest.statementId &&
        isGstOnInterest(tax, interest)
    );
    if (match) {
      claimedTaxIds.add(match._id);
      linked.set(interest._id, match);
    }
  }
  return linked;
}

function emiPlanKey(tx: CreditCardTransaction): string {
  return [tx.cardId, normaliseEmiDescription(tx.description), tx.emiInstallment?.of ?? 0].join('|');
}

export function groupEmiPlans(transactions: CreditCardTransaction[]): EmiPlan[] {
  const gstByInterestId = linkGstToEmiInterest(transactions);
  const plans = new Map<string, EmiPlan>();

  const emiRows = transactions
    .filter((tx) => EMI_KINDS.includes(tx.kind) && tx.direction === 'debit')
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const tx of emiRows) {
    const key = emiPlanKey(tx);
    const plan =
      plans.get(key) ??
      ({
        key,
        cardId: tx.cardId,
        description: normaliseEmiDescription(tx.description) || tx.description,
        installmentsPaid: 0,
        installmentsTotal: tx.emiInstallment?.of ?? 0,
        installmentsRemaining: 0,
        monthlyInstallment: 0,
        monthlyInterest: 0,
        monthlyGst: 0,
        principalPaid: 0,
        interestPaid: 0,
        gstPaid: 0,
        estimatedOutstanding: 0,
        startedOn: tx.date,
        lastBilledOn: tx.date,
      } satisfies EmiPlan);

    if (tx.kind === 'emi_principal') plan.principalPaid += tx.amount;
    if (tx.kind === 'emi_interest') {
      plan.interestPaid += tx.amount;
      plan.gstPaid += gstByInterestId.get(tx._id)?.amount ?? 0;
    }
    plan.installmentsPaid = Math.max(plan.installmentsPaid, tx.emiInstallment?.number ?? 0);
    plan.startedOn = tx.date < plan.startedOn ? tx.date : plan.startedOn;
    plan.lastBilledOn = tx.date > plan.lastBilledOn ? tx.date : plan.lastBilledOn;
    plans.set(key, plan);
  }

  return [...plans.values()].map((plan) => finalisePlan(plan, emiRows, gstByInterestId));
}

function finalisePlan(
  plan: EmiPlan,
  emiRows: CreditCardTransaction[],
  gstByInterestId: Map<string, CreditCardTransaction>
): EmiPlan {
  const latestRows = emiRows.filter(
    (tx) => emiPlanKey(tx) === plan.key && tx.date === plan.lastBilledOn
  );
  const latestPrincipal = latestRows
    .filter((tx) => tx.kind === 'emi_principal')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyInterest = latestRows
    .filter((tx) => tx.kind === 'emi_interest')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyGst = latestRows
    .filter((tx) => tx.kind === 'emi_interest')
    .reduce((sum, tx) => sum + (gstByInterestId.get(tx._id)?.amount ?? 0), 0);
  const monthlyInstallment = roundToPaise(latestPrincipal + monthlyInterest);
  const installmentsRemaining = Math.max(plan.installmentsTotal - plan.installmentsPaid, 0);

  return {
    ...plan,
    monthlyInstallment,
    monthlyInterest: roundToPaise(monthlyInterest),
    monthlyGst: roundToPaise(monthlyGst),
    installmentsRemaining,
    estimatedOutstanding: roundToPaise(latestPrincipal * installmentsRemaining),
  };
}

const STALE_EMI_MONTHS_BEHIND = 2;

function monthsBetween(earlierIso: string, laterIso: string): number {
  const earlier = parseISO(earlierIso);
  const later = parseISO(laterIso);
  return (
    (later.getUTCFullYear() - earlier.getUTCFullYear()) * 12 +
    (later.getUTCMonth() - earlier.getUTCMonth())
  );
}

function latestBilledAcross(plans: EmiPlan[]): string | null {
  return plans.reduce<string | null>(
    (latest, plan) => (latest === null || plan.lastBilledOn > latest ? plan.lastBilledOn : latest),
    null
  );
}

export function emiPlanStatus(plan: EmiPlan, latestBilled: string | null): EmiPlanStatus {
  if (plan.installmentsTotal > 0 && plan.installmentsRemaining === 0) return 'completed';
  if (
    latestBilled !== null &&
    monthsBetween(plan.lastBilledOn, latestBilled) > STALE_EMI_MONTHS_BEHIND
  ) {
    return 'stale';
  }
  return 'active';
}

export interface ClassifiedEmiPlans {
  active: EmiPlan[];
  completed: EmiPlan[];
  stale: EmiPlan[];
}

export function classifyEmiPlans(plans: EmiPlan[]): ClassifiedEmiPlans {
  const latestBilled = latestBilledAcross(plans);
  const result: ClassifiedEmiPlans = { active: [], completed: [], stale: [] };
  for (const plan of plans) {
    result[emiPlanStatus(plan, latestBilled)].push(plan);
  }
  return result;
}

export interface CardEmiCharge {
  plan: EmiPlan;
  interest: number;
  gst: number;
  total: number;
}

export interface CardEmiChargeBreakdown {
  cardId: string;
  plans: CardEmiCharge[];
  interest: number;
  gst: number;
  total: number;
}

export function emiChargesByCard(activePlans: EmiPlan[]): CardEmiChargeBreakdown[] {
  const byCard = new Map<string, CardEmiChargeBreakdown>();
  for (const plan of activePlans) {
    const charge: CardEmiCharge = {
      plan,
      interest: plan.monthlyInterest,
      gst: plan.monthlyGst,
      total: roundToPaise(plan.monthlyInterest + plan.monthlyGst),
    };
    if (charge.total <= 0) continue;
    const card = byCard.get(plan.cardId) ?? {
      cardId: plan.cardId,
      plans: [],
      interest: 0,
      gst: 0,
      total: 0,
    };
    card.plans.push(charge);
    card.interest = roundToPaise(card.interest + charge.interest);
    card.gst = roundToPaise(card.gst + charge.gst);
    card.total = roundToPaise(card.total + charge.total);
    byCard.set(plan.cardId, card);
  }
  for (const card of byCard.values()) {
    card.plans.sort((a, b) => b.total - a.total);
  }
  return [...byCard.values()].sort((a, b) => b.total - a.total);
}

function monthKeyOf(isoDate: string): string {
  return format(parseISO(isoDate), MONTH_KEY_FORMAT);
}

export function summariseCardSpend(
  transactions: CreditCardTransaction[],
  now: Date = new Date()
): CardSpendSummary {
  const months = new Map<string, CardMonthSpend>();
  const byCategory: Record<string, number> = {};
  const byKind: Partial<Record<CardTransactionKind, number>> = {};
  let costOfCreditTotal = 0;

  const monthFor = (monthKey: string) => {
    const existing = months.get(monthKey);
    if (existing) return existing;
    const created: CardMonthSpend = { monthKey, byCard: {}, costOfCredit: 0, total: 0 };
    months.set(monthKey, created);
    return created;
  };

  for (const tx of transactions) {
    byKind[tx.kind] = (byKind[tx.kind] ?? 0) + tx.amount;

    if (isCostOfCredit(tx)) {
      monthFor(monthKeyOf(tx.date)).costOfCredit += tx.amount;
      costOfCreditTotal += tx.amount;
    }

    if (!isSpend(tx)) continue;
    const month = monthFor(monthKeyOf(tx.date));
    month.byCard[tx.cardId] = (month.byCard[tx.cardId] ?? 0) + tx.amount;
    month.total += tx.amount;
    byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amount;
  }

  return {
    months: [...months.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
    byCategory,
    byKind,
    spend: summariseSpend(transactions.filter(isSpend), now),
    costOfCreditTotal,
  };
}

export function latestStatementByCard(
  cards: CreditCard[],
  statements: CreditCardStatement[],
  now: Date = new Date()
): CardDueSummary[] {
  return cards.map((card) => {
    const statement =
      statements
        .filter((entry) => entry.cardId === card._id)
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0] ?? null;

    const utilisation =
      statement?.creditLimit && statement.creditLimit > 0
        ? Math.min(statement.totalDue / statement.creditLimit, 1)
        : null;
    const daysUntilDue = statement?.dueDate
      ? Math.ceil((parseISO(statement.dueDate).getTime() - now.getTime()) / DAY_MS)
      : null;

    return { card, statement, utilisation, daysUntilDue };
  });
}

export function liveAlerts(alerts: CardTransactionAlert[]): CardTransactionAlert[] {
  return alerts.filter((alert) => !alert.supersededByStatement);
}

export function currentCycleSpendByCard(alerts: CardTransactionAlert[]): Record<string, number> {
  const byCard: Record<string, number> = {};
  for (const alert of liveAlerts(alerts)) {
    if (alert.direction !== 'debit') continue;
    byCard[alert.cardId] = (byCard[alert.cardId] ?? 0) + alert.amount;
  }
  return byCard;
}

export interface LiveAlertSummary {
  total: number;
  count: number;
  byCategory: Record<string, number>;
  spend: SpendTotals;
}

export function summariseLiveAlerts(
  alerts: CardTransactionAlert[],
  now: Date = new Date()
): LiveAlertSummary {
  const live = liveAlerts(alerts).filter((alert) => alert.direction === 'debit');
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const alert of live) {
    byCategory[alert.category] = (byCategory[alert.category] ?? 0) + alert.amount;
    total += alert.amount;
  }
  return {
    total: roundToPaise(total),
    count: live.length,
    byCategory,
    spend: summariseSpend(live, now),
  };
}
