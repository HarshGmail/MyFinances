export const getProfitLossColor = (profitLoss: number | null) => {
  if (profitLoss === null) return '';
  return profitLoss >= 0 ? 'text-green-600' : 'text-red-600';
};
