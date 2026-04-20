'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockFinancials } from '@/api/dataInterface';

interface Props {
  analyticsData: Record<string, StockFinancials>;
  theme: 'light' | 'dark';
}

function buildDonut(
  title: string,
  data: { name: string; y: number; color: string }[],
  textColor: string
): Highcharts.Options {
  return {
    chart: { type: 'pie', backgroundColor: 'transparent', height: 260 },
    title: { text: title, style: { color: textColor, fontSize: '13px', fontWeight: '600' } },
    tooltip: { pointFormat: '<b>{point.y} stock(s)</b> ({point.percentage:.0f}%)' },
    plotOptions: {
      pie: {
        innerSize: '55%',
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}',
          style: { color: textColor, fontSize: '11px' },
        },
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    series: [{ type: 'pie', name: 'Stocks', data }],
  };
}

export function RiskSection({ analyticsData, theme }: Props) {
  const textColor = theme === 'dark' ? '#fff' : '#18181b';
  const entries = Object.entries(analyticsData);

  const betaCounts = {
    'Defensive (<0.8)': 0,
    'Market (0.8–1.2)': 0,
    'Aggressive (>1.2)': 0,
    'N/A': 0,
  };
  const deCounts = { 'Low (<0.5)': 0, 'Moderate (0.5–1.5)': 0, 'High (>1.5)': 0, 'N/A': 0 };
  const riskFlags: { symbol: string; reason: string }[] = [];

  for (const [sym, f] of entries) {
    const beta = f.summaryDetail?.beta;
    const de = f.financialData?.debtToEquity;

    if (beta == null) betaCounts['N/A']++;
    else if (beta < 0.8) betaCounts['Defensive (<0.8)']++;
    else if (beta < 1.2) betaCounts['Market (0.8–1.2)']++;
    else betaCounts['Aggressive (>1.2)']++;

    if (de == null) deCounts['N/A']++;
    else if (de < 50) deCounts['Low (<0.5)']++;
    else if (de < 150) deCounts['Moderate (0.5–1.5)']++;
    else deCounts['High (>1.5)']++;

    if (beta != null && beta > 1.5)
      riskFlags.push({ symbol: sym, reason: `High beta (${beta.toFixed(2)})` });
    if (de != null && de > 200)
      riskFlags.push({ symbol: sym, reason: `Very high D/E (${de.toFixed(0)})` });
  }

  const betaColors = ['#3b82f6', '#22c55e', '#f59e0b', '#6b7280'];
  const deColors = ['#22c55e', '#f59e0b', '#ef4444', '#6b7280'];

  const betaData = Object.entries(betaCounts).map(([name, y], i) => ({
    name,
    y,
    color: betaColors[i],
  }));
  const deData = Object.entries(deCounts).map(([name, y], i) => ({ name, y, color: deColors[i] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Profile</CardTitle>
        <p className="text-sm text-muted-foreground">
          Volatility (Beta) and leverage (Debt/Equity) distribution across your portfolio
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HighchartsReact
            highcharts={Highcharts}
            options={buildDonut('Beta Distribution', betaData, textColor)}
          />
          <HighchartsReact
            highcharts={Highcharts}
            options={buildDonut('Debt/Equity Distribution', deData, textColor)}
          />
        </div>
        {riskFlags.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm font-semibold text-red-500 mb-2">Risk Flags</p>
            <ul className="space-y-1">
              {riskFlags.map((f, i) => (
                <li key={i} className="text-sm text-red-400">
                  <span className="font-medium">{f.symbol}</span> — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
