export function parseNavDate(ddmmyyyy: string): number {
  const [day, month, year] = ddmmyyyy.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

export function formatNavDate(ddmmyyyy: string): string {
  return new Date(parseNavDate(ddmmyyyy)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}
