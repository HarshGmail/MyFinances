import { useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { useAppStore } from '@/store/useAppStore';

type GoldRate = { date: string; rate: string };
type GoldStats = { avgPrice: number; currentPrice: number } | null;
type Timeframe = { label: string; days: number };

export default function GoldPriceChart({
  filteredRates,
  transactionPlotLines,
  goldStats,
  timeframe,
  setTimeframe,
  TIMEFRAMES,
}: {
  filteredRates: GoldRate[];
  transactionPlotLines: Highcharts.XAxisPlotLinesOptions[];
  goldStats: GoldStats;
  timeframe: string;
  setTimeframe: (t: string) => void;
  TIMEFRAMES: Timeframe[];
}) {
  const { theme } = useAppStore();
  const [showInvestmentPlotLines, setShowInvestmentPlotLines] = useState(false);

  const chartOptions = useMemo(() => {
    if (!filteredRates.length) return {};
    const prices = filteredRates.map((d) => parseFloat(d.rate));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const yMin = Math.floor(minPrice - (maxPrice - minPrice) * 0.05);
    const yMax = Math.ceil(maxPrice + (maxPrice - minPrice) * 0.05);

    return {
      chart: { type: 'area', backgroundColor: 'transparent', height: 500 },
      title: {
        text: 'Gold Price Trend',
        style: {
          fontWeight: 600,
          fontSize: '1.1rem',
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
      xAxis: {
        type: 'datetime',
        plotLines: showInvestmentPlotLines && transactionPlotLines,
        labels: {
          format: '{value:%d %b}',
          style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
        },
        lineWidth: 1,
      },
      yAxis: {
        title: { text: 'Price (₹)', style: { color: theme === 'dark' ? '#FFF' : '#18181b' } },
        labels: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: function (this: any): string {
            return '₹' + this.value;
          },
          style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
        },
        min: yMin,
        max: yMax,
        gridLineWidth: 0.5,
        gridLineColor: theme === 'dark' ? '#888' : '#cccccc',
        plotLines: goldStats
          ? [
              {
                value: goldStats.avgPrice,
                color: '#3b82f6',
                width: 1.5,
                dashStyle: 'Dash',
                zIndex: 5,
                label: {
                  text: `Avg Price ₹${goldStats.avgPrice.toFixed(2)}`,
                  align: 'right',
                  x: -5,
                  style: {
                    color: theme === 'dark' ? '#93c5fd' : '#1e3a8a',
                    fontSize: '11px',
                    fontWeight: '500',
                  },
                },
              },
            ]
          : [],
      },
      tooltip: { xDateFormat: '%d %b %Y', pointFormat: '<b>₹{point.y:,.2f}</b>' },
      series: [
        {
          name: 'Gold Rate',
          data: filteredRates.map((d) => [Date.parse(d.date), parseFloat(d.rate)]),
          color: '#fbbf24',
          fillOpacity: 0.2,
        },
      ],
      credits: { enabled: false },
    };
  }, [filteredRates, theme, showInvestmentPlotLines, transactionPlotLines, goldStats]);

  const tabControls = (mobile: boolean) => (
    <div
      className={
        mobile
          ? 'mb-3 flex flex-wrap items-center gap-2 sm:hidden'
          : 'hidden sm:flex absolute right-6 top-6 z-10 items-center gap-2'
      }
    >
      <Toggle
        pressed={showInvestmentPlotLines}
        onPressedChange={setShowInvestmentPlotLines}
        className="h-7 px-2 rounded-md border border-yellow-400 text-yellow-400 data-[state=on]:bg-yellow-400 data-[state=on]:text-black"
      >
        Transactions
      </Toggle>
      <Tabs value={timeframe} onValueChange={setTimeframe} className="min-w-0">
        <TabsList className="bg-transparent p-0 h-auto gap-1 flex flex-wrap">
          {TIMEFRAMES.map((tf) => (
            <TabsTrigger
              key={tf.label}
              value={tf.label}
              className={`border border-yellow-400 text-yellow-400 rounded-md px-2 py-0.5 font-normal min-w-[28px] h-7 transition-colors duration-150
                data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:border-yellow-400 data-[state=active]:shadow-none
                focus:outline-none focus:ring-2 focus:ring-yellow-400 ${mobile ? 'text-[11px]' : 'text-xs'}`}
            >
              {tf.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );

  if (filteredRates.length === 0) {
    return (
      <div className="bg-card rounded-lg p-4 relative">
        <div className="flex flex-wrap items-center gap-2 justify-end mb-3">
          <Tabs value={timeframe} onValueChange={setTimeframe} className="min-w-0">
            <TabsList className="bg-transparent p-0 h-auto gap-1 flex flex-wrap">
              {TIMEFRAMES.map((tf) => (
                <TabsTrigger
                  key={tf.label}
                  value={tf.label}
                  className="border border-yellow-400 text-yellow-400 rounded-md px-2 py-0.5 text-xs font-normal min-w-[28px] h-7 transition-colors duration-150
                    data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:border-yellow-400 data-[state=active]:shadow-none
                    focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {tf.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[500px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-12 h-12 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm">No gold rate data for this timeframe</p>
          <p className="text-xs opacity-60">Try selecting a longer period or check back later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 relative">
      {tabControls(true)}
      {tabControls(false)}
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        containerProps={{ style: { height: '100%' } }}
      />
    </div>
  );
}
