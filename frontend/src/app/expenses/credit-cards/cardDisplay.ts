import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { CreditCard } from '@myfinances/core/types';

export const ALL_CARDS = 'all';

const DUE_SOON_DAYS = 5;
const HIGH_UTILISATION = 0.75;
const MODERATE_UTILISATION = 0.3;

const NEUTRAL_BADGE = 'border-border bg-muted text-muted-foreground';
const WARNING_BADGE = 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
const DANGER_BADGE = 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400';
const SUCCESS_BADGE =
  'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';

export const MISMATCH_BADGE_CLASS = WARNING_BADGE;

export interface BadgeStyle {
  label: string;
  className: string;
}

export function cardDisplayName(card: Pick<CreditCard, 'label' | 'lastDigits'>): string {
  return `${card.label} ••${card.lastDigits}`;
}

export function formatCardDate(isoDate: string): string {
  return format(parseISO(isoDate), 'dd MMM yyyy');
}

export function lastSyncedLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Never synced';
  return `Synced ${formatDistanceToNow(parseISO(lastSyncAt), { addSuffix: true })}`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function passwordBadge(
  card: Pick<CreditCard, 'hasPassword' | 'passwordSource'>
): BadgeStyle {
  if (!card.hasPassword) return { label: 'No password', className: NEUTRAL_BADGE };
  if (card.passwordSource === 'derived') {
    return { label: 'Password auto-found', className: SUCCESS_BADGE };
  }
  return { label: 'Password saved', className: SUCCESS_BADGE };
}

export function dueBadge(daysUntilDue: number): BadgeStyle {
  if (daysUntilDue < 0) return { label: 'Due date passed', className: NEUTRAL_BADGE };
  if (daysUntilDue === 0) return { label: 'Due today', className: DANGER_BADGE };
  return {
    label: `${pluralise(daysUntilDue, 'day')} left`,
    className: daysUntilDue <= DUE_SOON_DAYS ? DANGER_BADGE : NEUTRAL_BADGE,
  };
}

export function utilisationIndicatorClass(utilisation: number): string {
  if (utilisation >= HIGH_UTILISATION) return 'bg-red-500';
  if (utilisation >= MODERATE_UTILISATION) return 'bg-amber-500';
  return 'bg-emerald-500';
}
