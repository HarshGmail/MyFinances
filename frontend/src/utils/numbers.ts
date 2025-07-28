/**
 * Formats a number to 2 decimal places and returns it as a number
 * Handles null/undefined values by returning 0
 * @param value - The number to format (can be null/undefined)
 * @returns The formatted number with 2 decimal places, or 0 if input is null/undefined
 */

type numberInput = number | null | undefined;
type numberInputSafe = number;
export function formatToTwoDecimals(value: numberInput): number {
  if (value === null || value === undefined) return 0;
  return Number(value.toFixed(2));
}

export function formatToPercentage(numerator: numberInput, denominator?: numberInputSafe): number {
  if (numerator === null || numerator === undefined) return 0;

  if (denominator === undefined) {
    return Number(numerator.toFixed(2));
  }

  const fraction = Number(((numerator / denominator) * 100).toFixed(2));
  return fraction;
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};
