'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, HelpCircle } from 'lucide-react';
import { StockFinancials } from '@/api/dataInterface';
import MetricEducationDrawer from './MetricEducationDrawer';
import { getMetricCalculation } from './verdicts';

interface Props {
  financialData?: StockFinancials['financialData'];
  financials?: StockFinancials;
}

export default function SnapshotVerdict({ financialData: fd, financials }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const lines = useMemo(() => {
    if (!fd) return [];
    const result: { text: string; positive: boolean }[] = [];

    if (fd.revenueGrowth !== undefined) {
      const pct = (fd.revenueGrowth * 100).toFixed(1);
      result.push({
        text: `Revenue ${fd.revenueGrowth >= 0 ? '+' : ''}${pct}% YoY`,
        positive: fd.revenueGrowth >= 0,
      });
    }
    if (fd.earningsGrowth !== undefined) {
      const pct = (fd.earningsGrowth * 100).toFixed(1);
      result.push({
        text: `Earnings ${fd.earningsGrowth >= 0 ? '+' : ''}${pct}% YoY`,
        positive: fd.earningsGrowth >= 0,
      });
    }
    if (fd.operatingMargins !== undefined) {
      const pct = (fd.operatingMargins * 100).toFixed(1);
      const quality =
        fd.operatingMargins > 0.15 ? 'strong' : fd.operatingMargins > 0.05 ? 'moderate' : 'thin';
      result.push({
        text: `Operating margin ${pct}% (${quality})`,
        positive: fd.operatingMargins > 0.05,
      });
    }

    return result;
  }, [fd]);

  if (lines.length === 0) return null;

  // Map verdict text to metric labels for drawer
  const getMetricFromVerdict = (text: string): string | null => {
    if (text.includes('Revenue')) return 'Revenue Growth';
    if (text.includes('Earnings')) return 'Earnings Growth';
    if (text.includes('Operating margin')) return 'Operating Margin';
    return null;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Snapshot Verdict
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {lines.map((line, i) => {
              const metric = getMetricFromVerdict(line.text);
              return (
                <button
                  key={i}
                  onClick={() => metric && setSelectedMetric(metric)}
                  className={`text-sm font-medium px-3 py-1 rounded-full border transition hover:shadow-md group flex items-center gap-1.5 ${
                    line.positive
                      ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 hover:border-green-400 dark:hover:border-green-600'
                      : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 hover:border-red-400 dark:hover:border-red-600'
                  }`}
                >
                  {line.text}
                  {metric && (
                    <HelpCircle className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <MetricEducationDrawer
        isOpen={!!selectedMetric}
        metricLabel={selectedMetric || ''}
        onClose={() => setSelectedMetric(null)}
        realData={
          selectedMetric && financials
            ? getMetricCalculation(selectedMetric, financials)
            : undefined
        }
      />
    </>
  );
}
