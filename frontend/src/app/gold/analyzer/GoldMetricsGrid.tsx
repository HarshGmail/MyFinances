'use client';

import React, { useState } from 'react';
import { MetricCard } from './goldMetrics';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

interface GoldMetricsGridProps {
  cards: MetricCard[];
  isLoading: boolean;
}

const metricDefinitions: Record<string, { title: string; description: string; formula: string }> = {
  'Current Price (per gram)': {
    title: 'Current Price (per gram)',
    description: 'The latest price of gold per gram in Indian Rupees.',
    formula: 'Latest market quote',
  },
  '1Y CAGR': {
    title: '1 Year CAGR',
    description:
      'The Compound Annual Growth Rate of gold price over the last 12 months. Shows the annualized percentage return.',
    formula: '(End Price / Start Price)^(1/1) - 1',
  },
  '3Y CAGR': {
    title: '3 Year CAGR',
    description:
      'The Compound Annual Growth Rate of gold price over the last 3 years. Useful for medium-term trend analysis.',
    formula: '(End Price / Start Price)^(1/3) - 1',
  },
  '5Y CAGR': {
    title: '5 Year CAGR',
    description:
      'The Compound Annual Growth Rate of gold price over the last 5 years. Shows long-term price appreciation.',
    formula: '(End Price / Start Price)^(1/5) - 1',
  },
  'Since Inception CAGR': {
    title: 'Since Inception CAGR',
    description: 'The Compound Annual Growth Rate since the start of available price data.',
    formula: '(End Price / Start Price)^(1/years) - 1',
  },
  'YTD Return': {
    title: 'Year-to-Date Return',
    description: 'The percentage gain or loss in gold price since January 1st of the current year.',
    formula: '(Current Price - YTD Start Price) / YTD Start Price',
  },
  'Volatility (1Y)': {
    title: 'Volatility (1 Year)',
    description:
      'The annualized standard deviation of daily price returns. Higher volatility indicates more price swings.',
    formula: 'Std Dev of daily returns × √252',
  },
  'Max Drawdown': {
    title: 'Maximum Drawdown',
    description:
      'The largest peak-to-trough decline in gold price over the period. Shows downside risk.',
    formula: 'Min((Current Price - Peak Price) / Peak Price)',
  },
};

export default function GoldMetricsGrid({ cards, isLoading }: GoldMetricsGridProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="p-4 border rounded-lg hover:bg-muted/50 transition cursor-pointer"
            onClick={() => setSelectedMetric(card.label)}
          >
            <div className="text-sm text-muted-foreground mb-1">{card.label}</div>
            <div className="text-2xl font-bold mb-2">{card.value}</div>
            {card.verdict && (
              <div className={`text-sm font-medium ${card.verdict.color}`}>{card.verdict.text}</div>
            )}
          </div>
        ))}
      </div>

      <MetricEducationDrawer metric={selectedMetric} onClose={() => setSelectedMetric(null)} />
    </>
  );
}

function MetricEducationDrawer({
  metric,
  onClose,
}: {
  metric: string | null;
  onClose: () => void;
}) {
  if (!metric) return null;

  const definition = metricDefinitions[metric];
  if (!definition) return null;

  return (
    <Sheet open={!!metric} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full md:w-[500px]">
        <SheetHeader>
          <SheetTitle>{definition.title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          <div>
            <h3 className="font-semibold mb-2">What is it?</h3>
            <p className="text-sm text-muted-foreground">{definition.description}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How is it calculated?</h3>
            <div className="bg-muted p-3 rounded font-mono text-sm mb-2">{definition.formula}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
