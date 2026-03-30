'use client';

import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StockFinancials } from '@/api/dataInterface';
import { buildMetricCards, getMetricCalculation } from './verdicts';
import MetricEducationDrawer from './MetricEducationDrawer';
import { HelpCircle } from 'lucide-react';

interface Props {
  financials?: StockFinancials;
  isLoading: boolean;
}

export default function FundamentalsGrid({ financials, isLoading }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const cards = useMemo(() => (financials ? buildMetricCards(financials) : []), [financials]);

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
        ) : (
          <p className="text-sm text-muted-foreground">
            Financial data unavailable — Yahoo Finance may be temporarily rate-limiting this symbol.
          </p>
        )}
      </div>

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
