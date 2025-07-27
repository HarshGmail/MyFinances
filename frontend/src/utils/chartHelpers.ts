const ALL_TIMEFRAMES = [
  { label: '1w', days: 7 },
  { label: '1m', days: 30 },
  { label: '3m', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
  { label: '3y', days: 1095 },
  { label: '5y', days: 1825 },
];

export function getTimeframes(uptoLabel?: string) {
  if (!uptoLabel) return ALL_TIMEFRAMES;

  const index = ALL_TIMEFRAMES.findIndex((t) => t.label === uptoLabel);
  if (index === -1) return ALL_TIMEFRAMES; // fallback if label not found

  return ALL_TIMEFRAMES.slice(0, index + 1);
}

type ReturnTypeOption = 'timestamp' | 'iso' | 'date' | 'ymd';

export function getPastDate(daysAgo: number): number;
export function getPastDate(daysAgo: number, returnType: 'timestamp'): number;
export function getPastDate(daysAgo: number, returnType: 'iso'): string;
export function getPastDate(daysAgo: number, returnType: 'date'): Date;
export function getPastDate(daysAgo: number, returnType: 'ymd'): string;

export function getPastDate(
  daysAgo: number,
  returnType: ReturnTypeOption = 'timestamp'
): number | string | Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);

  switch (returnType) {
    case 'iso':
      return d.toISOString();
    case 'date':
      return d;
    case 'ymd':
      return (
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0')
      );
    case 'timestamp':
    default:
      return d.getTime();
  }
}
