import { Text, View } from 'react-native';
import type { GoalAllocation, GoalAssetType } from '@myfinances/core/types';
import type { GoalHolding, GoalStatus } from '@myfinances/core/calc/goals';

const FULL_PROGRESS = 100;
const MONTHS_PER_YEAR = 12;
const LAKH = 100000;
const CRORE = 10000000;
const THOUSAND = 1000;
const ID_KEYED_ASSET_TYPES: GoalAssetType[] = ['fd', 'rd'];

const STATUS_STYLES: Record<GoalStatus, { label: string; pill: string; text: string }> = {
  achieved: { label: 'Achieved', pill: 'bg-gain/15', text: 'text-gain' },
  'on-track': { label: 'On track', pill: 'bg-gain/15', text: 'text-gain' },
  'slightly-behind': {
    label: 'Slightly behind',
    pill: 'bg-yellow-500/15',
    text: 'text-yellow-500',
  },
  behind: { label: 'Behind', pill: 'bg-loss/15', text: 'text-loss' },
};

export const ASSET_TYPE_COLORS: Record<GoalAssetType | 'manual', string> = {
  stock: '#3b82f6',
  mutualFund: '#8b5cf6',
  crypto: '#f97316',
  gold: '#eab308',
  epf: '#10b981',
  fd: '#06b6d4',
  rd: '#ec4899',
  manual: '#a1a1aa',
};

const wholeRupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatRupees(value: number): string {
  return wholeRupees.format(Math.round(value));
}

export function formatSignedRupees(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${formatRupees(rounded)}`;
  if (rounded < 0) return `−${formatRupees(-rounded)}`;
  return formatRupees(0);
}

export function compactRupees(value: number): string {
  if (value >= CRORE) return `₹${(value / CRORE).toFixed(1)}Cr`;
  if (value >= LAKH) return `₹${(value / LAKH).toFixed(1)}L`;
  return `₹${Math.round(value / THOUSAND)}k`;
}

export function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function formatMonthYear(value: Date | string | number): string {
  return new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function formatFullDate(value: Date | string | number): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeLeftLabel(targetDate: string, monthsLeft: number): string {
  if (new Date(targetDate).getTime() <= Date.now()) return 'Target date passed';
  if (monthsLeft < 1) return 'Due this month';
  const years = Math.floor(monthsLeft / MONTHS_PER_YEAR);
  const months = monthsLeft % MONTHS_PER_YEAR;
  const parts = [years > 0 ? `${years}y` : null, months > 0 ? `${months}m` : null];
  return `${parts.filter(Boolean).join(' ')} left`;
}

export function allocationLabel(allocation: GoalAllocation, holding: GoalHolding | null): string {
  if (holding) return holding.label;
  return ID_KEYED_ASSET_TYPES.includes(allocation.assetType)
    ? 'Deleted deposit'
    : allocation.assetKey;
}

export function StatusPill({ status }: { status: GoalStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <View className={`rounded-full px-2.5 py-1 ${style.pill}`}>
      <Text className={`text-xs font-semibold ${style.text}`}>{style.label}</Text>
    </View>
  );
}

export function GoalProgressBar({ percentage }: { percentage: number }) {
  const width = `${Math.max(0, Math.min(percentage, FULL_PROGRESS))}%` as const;
  const fillClass = percentage >= FULL_PROGRESS ? 'bg-gain' : 'bg-foreground';
  return (
    <View className="h-2 overflow-hidden rounded-full bg-accent">
      <View className={`h-full rounded-full ${fillClass}`} style={{ width }} />
    </View>
  );
}
