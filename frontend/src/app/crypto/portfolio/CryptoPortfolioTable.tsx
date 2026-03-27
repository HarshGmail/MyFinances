import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { CryptoTransaction } from '@/api/dataInterface';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { formatCurrency, formatToPercentage } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';
import { PortfolioItem } from './useCryptoPortfolioData';

export default function CryptoPortfolioTable({
  portfolioData,
  coinColorMap,
  cryptoUnrealizedByCoin,
  getCoinTransactions,
  selectedCoin,
  setSelectedCoin,
  onScrollToChart,
}: {
  portfolioData: PortfolioItem[];
  coinColorMap: Record<string, string>;
  cryptoUnrealizedByCoin: Record<string, number>;
  getCoinTransactions: (coin: string) => CryptoTransaction[];
  selectedCoin: string;
  setSelectedCoin: (c: string) => void;
  onScrollToChart: () => void;
}) {
  const { theme } = useAppStore();

  const pieData = useMemo(
    () =>
      portfolioData.map((item) => ({
        name: item.currency,
        y: item.investedAmount,
        coinName: item.coinName,
        color: coinColorMap[item.currency],
      })),
    [portfolioData, coinColorMap]
  );

  const pieOptions = useMemo(
    () => ({
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: 200,
        spacing: [0, 0, 0, 0],
        plotBackgroundColor: 'transparent',
        plotBorderWidth: 0,
        plotShadow: false,
      },
      title: {
        text: 'Investment Distribution',
        style: { color: theme === 'dark' ? '#fff' : '#18181b', fontWeight: 600, fontSize: '1rem' },
      },
      tooltip: {
        useHTML: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (this: any) {
          const isDark = document.documentElement.classList.contains('dark');
          const tc = isDark ? '#fff' : '#18181b',
            sc = isDark ? '#a3a3a3' : '#52525b';
          return `<div style="font-family:inherit;"><div style="font-weight:600;font-size:1.1em;color:${tc};margin-bottom:2px;">${this.point.coinName || this.point.name}</div><div style="font-weight:700;font-size:1.2em;color:${tc};">${Highcharts.numberFormat(this.point.percentage, 1)}%<span style="font-weight:400;font-size:0.95em;color:${sc};margin-left:4px;">(${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(this.point.y)})</span></div></div>`;
        },
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              color: theme === 'dark' ? '#fff' : '#18181b',
              fontWeight: 500,
              textOutline: 'none',
            },
          },
          point: {
            events: {
              click: function (this: Highcharts.Point) {
                if (this.name === selectedCoin) setSelectedCoin('All');
                else {
                  setSelectedCoin(this.name);
                  onScrollToChart();
                }
              },
            },
          },
        },
      },
      series: [{ name: 'Invested', colorByPoint: true, data: pieData }],
      credits: { enabled: false },
      legend: { backgroundColor: 'transparent', itemStyle: { fontWeight: 400 } },
    }),
    [theme, pieData, selectedCoin, setSelectedCoin, onScrollToChart]
  );

  return (
    <div className="max-w-full mx-auto flex flex-row gap-4">
      <div className="w-3/4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Coin Name</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Avg Price (₹)</TableHead>
              <TableHead>Current Price (₹)</TableHead>
              <TableHead>Invested Amount (₹)</TableHead>
              <TableHead>Current Value (₹)</TableHead>
              <TableHead>P&L (₹)</TableHead>
              <TableHead>P&L %</TableHead>
              <TableHead>XIRR %</TableHead>
              <TableHead>Unrealized Gains</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolioData.map((item, idx) => {
              const coinTxs = getCoinTransactions(item.currency.toUpperCase());
              let coinXirr: number | null = null;
              if (coinTxs.length > 0) {
                const flows: XirrCashFlow[] = coinTxs.map((tx) => ({
                  amount: tx.type === 'credit' ? -tx.amount : tx.amount,
                  when: new Date(tx.date),
                }));
                flows.push({ amount: item.currentValue, when: new Date() });
                try {
                  coinXirr = xirr(flows) * 100;
                } catch {
                  coinXirr = null;
                }
              }
              return (
                <TableRow
                  key={item.currency || idx}
                  className={`cursor-pointer hover:bg-muted transition ${selectedCoin === item.currency ? 'bg-muted' : ''}`}
                  onClick={() => {
                    setSelectedCoin(item.currency || 'All');
                    onScrollToChart();
                  }}
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium underline">{item.coinName}</TableCell>
                  <TableCell>{item.balance.toFixed(6)}</TableCell>
                  <TableCell>
                    {item.balance > 0
                      ? formatCurrency(Number((item.investedAmount / item.balance).toFixed(2)))
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {item.currentPrice ? formatCurrency(item.currentPrice) : 'N/A'}
                  </TableCell>
                  <TableCell>{formatCurrency(item.investedAmount)}</TableCell>
                  <TableCell>{formatCurrency(item.currentValue)}</TableCell>
                  <TableCell className={getProfitLossColor(item.profitLoss)}>
                    {formatCurrency(item.profitLoss)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.profitLoss >= 0 ? 'default' : 'destructive'}>
                      {formatToPercentage(item.profitLossPercentage)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {coinXirr !== null ? (
                      <Badge variant={coinXirr >= 0 ? 'default' : 'destructive'}>
                        {coinXirr.toFixed(2)}%
                      </Badge>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {cryptoUnrealizedByCoin[item.coinName] !== undefined ? (
                      <span className={getProfitLossColor(cryptoUnrealizedByCoin[item.coinName])}>
                        {formatCurrency(cryptoUnrealizedByCoin[item.coinName])}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="w-1/4">
        <div className="w-full min-w-[180px] flex flex-col items-center justify-center min-h-[180px]">
          <div
            className="w-full flex flex-col items-center"
            style={{ height: 220, minHeight: 180 }}
          >
            <HighchartsReact
              highcharts={Highcharts}
              options={pieOptions}
              containerProps={{ style: { width: '100%', height: '100%' } }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
