import {
  GOAL_ASSET_TYPES,
  type GoalLine,
  type GoalStatus,
  type ReturnBasis,
} from '@myfinances/core/calc/goals';
import type { GoalAssetType } from '@myfinances/core/types';

export type GoalMixKey = GoalAssetType | 'manual';

export const GOAL_MIX_KEYS: GoalMixKey[] = [...GOAL_ASSET_TYPES, 'manual'];

export const ASSET_COLORS: Record<GoalMixKey, string> = {
  stock: '#3B82F6',
  mutualFund: '#8B5CF6',
  crypto: '#F97316',
  gold: '#EAB308',
  epf: '#14B8A6',
  fd: '#22C55E',
  rd: '#06B6D4',
  manual: '#94A3B8',
};

interface StatusStyle {
  label: string;
  badgeClassName: string;
  indicatorClassName: string;
  textClassName: string;
}

export const STATUS_META: Record<GoalStatus, StatusStyle> = {
  achieved: {
    label: 'Achieved',
    badgeClassName:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    indicatorClassName: 'bg-emerald-500',
    textClassName: 'text-emerald-600 dark:text-emerald-400',
  },
  'on-track': {
    label: 'On track',
    badgeClassName: 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400',
    indicatorClassName: 'bg-green-500',
    textClassName: 'text-green-600 dark:text-green-400',
  },
  'slightly-behind': {
    label: 'Slightly behind',
    badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    indicatorClassName: 'bg-amber-500',
    textClassName: 'text-amber-600 dark:text-amber-400',
  },
  behind: {
    label: 'Behind',
    badgeClassName: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    indicatorClassName: 'bg-red-500',
    textClassName: 'text-red-600 dark:text-red-400',
  },
};

export const RETURN_BASIS_LABELS: Record<ReturnBasis, string> = {
  history: 'own history (XIRR)',
  rate: 'interest rate',
  default: 'asset-class default',
  override: 'your override',
};

export const MONTHLY_BASIS_LABELS: Record<'planned' | 'trailing', string> = {
  planned: 'planned',
  trailing: 'avg of last 12 mo',
};

const MONTHS_PER_YEAR = 12;
const THOUSAND = 1e3;
const LAKH = 1e5;
const CRORE = 1e7;
const MAX_PROGRESS = 100;

export function timeLeftLabel(targetDate: Date, monthsLeft: number, now: Date = new Date()) {
  if (targetDate <= now) return 'Target date passed';
  if (monthsLeft < 1) return 'Under a month left';
  const years = Math.floor(monthsLeft / MONTHS_PER_YEAR);
  const months = monthsLeft % MONTHS_PER_YEAR;
  const parts = [years > 0 ? `${years} yr` : '', months > 0 ? `${months} mo` : ''].filter(Boolean);
  return `${parts.join(' ')} left`;
}

function significantDigits(value: number): string {
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return Number(value.toFixed(decimals)).toString();
}

export function formatCompactRupees(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (abs >= CRORE) return `${sign}₹${significantDigits(abs / CRORE)}Cr`;
  if (abs >= LAKH) return `${sign}₹${significantDigits(abs / LAKH)}L`;
  if (abs >= THOUSAND) return `${sign}₹${significantDigits(abs / THOUSAND)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export function formatPercentNumber(pct: number): string {
  return Number(pct.toFixed(2)).toString();
}

export function clampProgress(progressPct: number): number {
  return Math.min(MAX_PROGRESS, Math.max(0, progressPct));
}

export function linkedHoldingsLabel(lines: GoalLine[], manualAmount?: number): string {
  const holdings = `${lines.length} ${lines.length === 1 ? 'holding' : 'holdings'}`;
  return manualAmount ? `${holdings} + other savings` : holdings;
}

export function mutationErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown };
    if (typeof message === 'string' && message) return message;
  }
  return 'Something went wrong. Please try again.';
}
