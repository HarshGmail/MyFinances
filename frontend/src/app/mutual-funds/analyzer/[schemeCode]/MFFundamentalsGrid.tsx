'use client';

import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MFMetrics, buildMFMetricCards, getMFMetricCalculation } from './mfVerdicts';
import MFMetricEducationDrawer from './MFMetricEducationDrawer';
import CustomCAGRCalculator from './CustomCAGRCalculator';
import { MutualFundNavHistoryData } from '@/api/dataInterface';
import { HelpCircle } from 'lucide-react';

interface Props {
  metrics: MFMetrics | null;
  navData?: MutualFundNavHistoryData[];
  isLoading: boolean;
}

export default function MFFundamentalsGrid({ metrics, navData, isLoading }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const cards = useMemo(() => (metrics ? buildMFMetricCards(metrics) : []), [metrics]);

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold mb-3">Fundamentals</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : cards.length > 0 ? (
          <>
            {!isLoading && navData && (
              <div className="mb-4">
                <CustomCAGRCalculator navData={navData} />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="border rounded-lg p-3 space-y-1 hover:bg-muted/50 transition cursor-pointer group"
                  onClick={() => setSelectedMetric(card.label)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{card.label}</div>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="text-xl font-semibold">{card.value}</div>
                  {card.verdict && (
                    <div className={`text-xs ${card.verdict.color}`}>{card.verdict.text}</div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Fund data unavailable — please try searching for another fund.
          </p>
        )}
      </div>

      <MFMetricEducationDrawer
        isOpen={!!selectedMetric}
        metricLabel={selectedMetric || ''}
        onClose={() => setSelectedMetric(null)}
        realData={
          selectedMetric && metrics && navData
            ? getMFMetricCalculation(selectedMetric, metrics, navData)
            : undefined
        }
      />
    </>
  );
}
