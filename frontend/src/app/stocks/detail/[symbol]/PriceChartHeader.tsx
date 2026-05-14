'use client';

import { CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Info, SlidersHorizontal } from 'lucide-react';
import { INTERVALS } from './verdicts';
import { OverlayConfig, countActiveOverlays, StockIntervalLabel } from './stockDetailStore';

interface Props {
  selectedIntervalLabel: StockIntervalLabel;
  onChangeInterval: (label: StockIntervalLabel) => void;
  overlays: OverlayConfig;
  onOpenLegend: () => void;
  onOpenOverlays: () => void;
}

export default function PriceChartHeader({
  selectedIntervalLabel,
  onChangeInterval,
  overlays,
  onOpenLegend,
  onOpenOverlays,
}: Props) {
  const activeCount = countActiveOverlays(overlays);

  return (
    <CardHeader className="pb-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base">Price Chart</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onOpenLegend}
            aria-label="What do the chart elements mean?"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5"
            onClick={onOpenOverlays}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Overlays
            {activeCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {activeCount}
              </span>
            )}
          </Button>

          <Tabs
            value={selectedIntervalLabel}
            onValueChange={(v) => onChangeInterval(v as StockIntervalLabel)}
          >
            <TabsList className="bg-transparent p-0 h-auto gap-1">
              {INTERVALS.map((iv) => (
                <TabsTrigger
                  key={iv.label}
                  value={iv.label}
                  className="border border-gray-400 text-gray-400 rounded-md px-2 py-0.5 text-xs font-normal min-w-[28px] h-7 transition-colors duration-150 data-[state=active]:bg-gray-400 data-[state=active]:text-black data-[state=active]:border-gray-400 data-[state=active]:shadow-none"
                >
                  {iv.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </CardHeader>
  );
}
