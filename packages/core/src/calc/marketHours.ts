export type NseMarketStatus = 'pre-open' | 'open' | 'closed' | 'weekend';

const IST_TIME_ZONE = 'Asia/Kolkata';
const NSE_OPEN_MINUTE = 9 * 60 + 15;
const NSE_CLOSE_MINUTE = 15 * 60 + 30;
const WEEKEND_DAYS = new Set(['Sat', 'Sun']);

export const STOCK_REFRESH_MS_OPEN = 60 * 1000;
export const STOCK_REFRESH_MS_CLOSED = 15 * 60 * 1000;

const istPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function getIstParts(now: Date) {
  const parts = istPartsFormatter.formatToParts(now);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    weekday: valueOf('weekday'),
    minuteOfDay: Number(valueOf('hour')) * 60 + Number(valueOf('minute')),
  };
}

export function getNseMarketStatus(now: Date = new Date()): NseMarketStatus {
  const { weekday, minuteOfDay } = getIstParts(now);
  if (WEEKEND_DAYS.has(weekday)) return 'weekend';
  if (minuteOfDay < NSE_OPEN_MINUTE) return 'pre-open';
  if (minuteOfDay < NSE_CLOSE_MINUTE) return 'open';
  return 'closed';
}

export function formatIstSessionDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoTimestamp));
}
