'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MF_METRIC_DEFINITIONS } from './mfMetricDefinitions';
import { Lightbulb, Calculator } from 'lucide-react';
import { MetricCalculation } from './mfVerdicts';

interface Props {
  isOpen: boolean;
  metricLabel: string;
  onClose: () => void;
  realData?: MetricCalculation | null;
}

export default function MFMetricEducationDrawer({ isOpen, metricLabel, onClose, realData }: Props) {
  const definition = MF_METRIC_DEFINITIONS[metricLabel];

  if (!definition) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="max-w-lg overflow-y-auto">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl">{definition.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-8 pb-8 pr-4 pl-4">
          {/* Overview */}
          <section>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">What is it?</h3>
            <p className="text-sm leading-relaxed text-foreground">{definition.description}</p>
          </section>

          {/* How Calculated */}
          <section>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">
              How is it calculated?
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg border mb-4">
              <p className="text-sm font-mono text-foreground whitespace-pre-wrap">
                {definition.howCalculated}
              </p>
            </div>

            {/* Live Calculation */}
            {realData && ((realData.label1 && realData.value1) || realData.result) && (
              <div className="bg-purple-50/50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex gap-2 mb-4">
                  <Calculator className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-300">
                    Live Calculation
                  </h4>
                </div>
                <div className="space-y-2 text-xs font-mono bg-black/20 p-4 rounded border border-purple-300/30">
                  {realData.label1 && realData.value1 && (
                    <div className="text-purple-800 dark:text-purple-200">
                      {realData.label1}: <span className="font-semibold">{realData.value1}</span>
                    </div>
                  )}
                  {realData.label2 && realData.value2 && (
                    <div className="text-purple-800 dark:text-purple-200">
                      {realData.label2}: <span className="font-semibold">{realData.value2}</span>
                    </div>
                  )}
                  {realData.label3 && realData.value3 && (
                    <div className="text-purple-800 dark:text-purple-200">
                      {realData.label3}: <span className="font-semibold">{realData.value3}</span>
                    </div>
                  )}
                  {(realData.label1 || realData.label2 || realData.label3) && realData.result && (
                    <>
                      <div className="border-t border-purple-300/30 my-3"></div>
                      <div className="text-purple-900 dark:text-purple-100 font-semibold">
                        {realData.formula && (
                          <div className="text-purple-700 dark:text-purple-400 mb-2">
                            {realData.formula}
                          </div>
                        )}
                        Result:{' '}
                        <span className="text-lg text-purple-600 dark:text-purple-400">
                          {realData.result}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* What It Tells Us */}
          <section>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">
              What does it tell us?
            </h3>
            <p className="text-sm leading-relaxed text-foreground">{definition.whatItTellsUs}</p>
          </section>

          {/* Good Range */}
          {definition.goodRange && (
            <section className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300 mb-2">
                    Good Range
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{definition.goodRange}</p>
                </div>
              </div>
            </section>
          )}

          {/* Quick Tips */}
          <section className="border-t pt-6">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Quick Tips</h3>
            <ul className="text-sm space-y-3 text-muted-foreground">
              <li>• Compare this metric with competitor funds in the same category</li>
              <li>• Look at trends over time — is performance improving or declining?</li>
              <li>• Don't rely on a single metric — always look at the full fund profile</li>
              <li>• Different fund categories have different benchmarks and risk profiles</li>
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
