'use client';

import { useState } from 'react';
import { getMFVerdict, MFMetrics } from './mfVerdicts';
import MFMetricEducationDrawer from './MFMetricEducationDrawer';

interface MFSnapshotVerdictProps {
  metrics: MFMetrics | null;
  isLoading: boolean;
}

export default function MFSnapshotVerdict({ metrics, isLoading }: MFSnapshotVerdictProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  if (isLoading || !metrics) {
    return null;
  }

  const verdictItems = [];

  if (metrics.cagr1Y !== null) {
    const verdict = getMFVerdict('cagr1Y', metrics.cagr1Y);
    if (verdict) {
      verdictItems.push({
        label: '1Y Return',
        value: `${(metrics.cagr1Y * 100).toFixed(2)}%`,
        verdict,
      });
    }
  }

  if (metrics.cagr3Y !== null) {
    const verdict = getMFVerdict('cagr3Y', metrics.cagr3Y);
    if (verdict) {
      verdictItems.push({
        label: '3Y CAGR',
        value: `${(metrics.cagr3Y * 100).toFixed(2)}%`,
        verdict,
      });
    }
  }

  if (metrics.volatility1Y !== null) {
    const verdict = getMFVerdict('volatility', metrics.volatility1Y);
    if (verdict) {
      verdictItems.push({
        label: 'Volatility',
        value: `${(metrics.volatility1Y * 100).toFixed(2)}%`,
        verdict,
      });
    }
  }

  if (verdictItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {verdictItems.map((item) => (
          <div
            key={item.label}
            onClick={() => setSelectedMetric(item.label)}
            className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors group"
          >
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className={`text-xl font-semibold ${item.verdict.color}`}>{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.verdict.text}</p>
          </div>
        ))}
      </div>

      {selectedMetric && (
        <MFMetricEducationDrawer
          isOpen={!!selectedMetric}
          metricLabel={selectedMetric}
          onClose={() => setSelectedMetric(null)}
        />
      )}
    </>
  );
}
