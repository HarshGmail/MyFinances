import type { XAxisPlotLinesOptions } from 'highcharts/highstock';
import { StockTransaction } from '@/api/dataInterface';

const BUY_COLOR = '#16a34a';
const SELL_COLOR = '#dc2626';

/**
 * Build thin vertical xAxis plot lines for each user transaction in the
 * symbol that falls within the chart's time range. Buys are green, sells
 * red. Lines are intentionally hairline-thin (width 1, dashed) so they
 * don't dominate the price action.
 */
export function buildTransactionPlotLines(
  transactions: StockTransaction[],
  symbol: string,
  minT: number,
  maxT: number
): XAxisPlotLinesOptions[] {
  const bareSymbol = symbol.replace('.NS', '');
  return transactions
    .filter((tx) => tx.stockName === symbol || tx.stockName === bareSymbol)
    .map((tx) => {
      const t = new Date(tx.date).getTime();
      if (Number.isNaN(t) || t < minT || t > maxT) return null;
      const isBuy = tx.type === 'credit';
      const color = isBuy ? BUY_COLOR : SELL_COLOR;
      return {
        value: t,
        color,
        dashStyle: 'Dot',
        width: 1,
        zIndex: 2,
        label: {
          text: `${isBuy ? 'B' : 'S'} ${tx.numOfShares}`,
          align: 'left',
          rotation: 0,
          x: 2,
          y: 12,
          style: { color, fontSize: '9px', fontWeight: '600' },
        },
      } as XAxisPlotLinesOptions;
    })
    .filter((p): p is XAxisPlotLinesOptions => p != null);
}
