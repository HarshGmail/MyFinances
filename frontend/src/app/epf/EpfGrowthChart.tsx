import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EpfYearlyDataPoint } from './useEpfCalculations';

const BLUE = '#3B82F6';
const ORANGE = '#F97316';

interface EpfGrowthChartProps {
  yearlyData: EpfYearlyDataPoint[];
  inflationAnnualPct: number;
  theme: 'light' | 'dark';
}

export function EpfGrowthChart({ yearlyData, inflationAnnualPct, theme }: EpfGrowthChartProps) {
  const textColor = theme === 'dark' ? '#fff' : '#18181b';
  const axisColor = theme === 'dark' ? '#FFF' : '#18181b';

  const chartOptions: Highcharts.Options = {
    chart: {
      type: 'area',
      height: 500,
      backgroundColor: 'transparent',
    },
    title: {
      text: 'EPF Investment Growth Projection',
      style: { fontSize: '18px', fontWeight: 'bold', color: textColor },
    },
    subtitle: {
      text: `8.25% nominal, deflated by ${inflationAnnualPct.toFixed(2)}% inflation`,
      style: { fontSize: '14px', color: '#666' },
    },
    xAxis: {
      categories: yearlyData.map((d) => d.year.toString()),
      title: { text: 'Year', style: { color: axisColor } },
      labels: { style: { color: axisColor } },
    },
    yAxis: {
      title: { text: 'Amount (₹)', style: { color: axisColor } },
      labels: {
        formatter(this: Highcharts.AxisLabelsFormatterContextObject) {
          return '₹' + ((this.value as number) / 100000).toFixed(1) + 'L';
        },
        style: { color: axisColor },
      },
    },
    tooltip: {
      formatter(this: any) {
        const point = yearlyData[this.point?.index ?? 0];
        return `<b>Year ${this.x}</b><br/>
                Total Balance (Nominal): ₹${point.balance.toLocaleString('en-IN')}<br/>
                Total Balance (Real): ₹${point.realBalance.toLocaleString('en-IN')}<br/>
                Annual Contribution: ₹${point.contribution.toLocaleString('en-IN')}<br/>
                Monthly Contribution: ₹${point.monthlyContribution.toLocaleString('en-IN')}<br/>
                Interest Earned (Nominal): ₹${point.interestEarned.toLocaleString('en-IN')}<br/>
                Interest Earned (Real): ₹${point.interestEarnedReal.toLocaleString('en-IN')}`;
      },
    },
    plotOptions: {
      area: {
        lineWidth: 2,
        marker: {
          enabled: false,
          states: { hover: { enabled: true, radius: 5 } },
        },
      },
    },
    series: [
      {
        type: 'area',
        name: 'EPF Balance (Nominal)',
        data: yearlyData.map((d) => d.balance),
        color: BLUE,
        lineColor: BLUE,
        zIndex: 1,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(BLUE).setOpacity(0.35).get('rgba') as string],
            [1, Highcharts.color(BLUE).setOpacity(0.1).get('rgba') as string],
          ],
        },
      },
      {
        type: 'area',
        name: 'EPF Balance (Real, ₹ today)',
        data: yearlyData.map((d) => d.realBalance),
        color: ORANGE,
        lineColor: ORANGE,
        zIndex: 2,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(ORANGE).setOpacity(0.35).get('rgba') as string],
            [1, Highcharts.color(ORANGE).setOpacity(0.1).get('rgba') as string],
          ],
        },
      },
    ],
    legend: { enabled: true },
    credits: { enabled: false },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>EPF Growth Projection (Nominal vs Real)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Investment timeline based on your monthly EPF contributions and job changes
        </p>
      </CardHeader>
      <CardContent>
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      </CardContent>
    </Card>
  );
}
