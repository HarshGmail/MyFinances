'use client';

import { useState, useMemo } from 'react';
import { MutualFundNavHistoryData } from '@/api/dataInterface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calendar, Trash2 } from 'lucide-react';

interface CustomCAGRCalculatorProps {
  navData: MutualFundNavHistoryData[];
}

function parseNavDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function findNAVAtDate(navData: MutualFundNavHistoryData[], targetDate: Date): number | null {
  for (const item of navData) {
    const itemDate = parseNavDate(item.date);
    if (itemDate <= targetDate) {
      return parseFloat(item.nav);
    }
  }
  return null;
}

function calculateCAGR(startNav: number, endNav: number, years: number): number | null {
  if (startNav <= 0 || endNav <= 0 || years <= 0) return null;
  const result = Math.pow(endNav / startNav, 1 / years) - 1;
  return isNaN(result) ? null : result;
}

export default function CustomCAGRCalculator({ navData }: CustomCAGRCalculatorProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  const navDateRange = useMemo(() => {
    if (!navData || navData.length === 0) return null;
    const latestDate = parseNavDate(navData[0].date);
    const oldestDate = parseNavDate(navData[navData.length - 1].date);
    return { latestDate, oldestDate };
  }, [navData]);

  const calculation = useMemo(() => {
    if (!startDate || !endDate || !showResult) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return { error: 'Start date must be before end date' };
    }

    const startNav = findNAVAtDate(navData, start);
    const endNav = findNAVAtDate(navData, end);

    if (!startNav || !endNav) {
      return { error: 'NAV data not available for selected dates' };
    }

    const yearsDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const cagr = calculateCAGR(startNav, endNav, yearsDiff);

    if (cagr === null) {
      return { error: 'Unable to calculate CAGR' };
    }

    return {
      startNav,
      endNav,
      yearsDiff,
      cagr,
    };
  }, [startDate, endDate, showResult, navData]);

  const getVerdict = (cagr: number) => {
    if (cagr < 0.05) return { text: 'Poor', color: 'text-red-500' };
    if (cagr < 0.1) return { text: 'Moderate', color: 'text-yellow-500' };
    if (cagr < 0.2) return { text: 'Good', color: 'text-green-600' };
    return { text: 'Excellent', color: 'text-green-600' };
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setShowResult(false);
  };

  if (!navDateRange) return null;

  return (
    <Card className="p-4 space-y-4 border">
      <div>
        <h3 className="font-semibold text-sm mb-3">Custom CAGR Calculator</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Calculate returns for any custom time period
        </p>
      </div>

      {!showResult ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
            <div className="flex gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-2" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={formatDateForInput(navDateRange.latestDate)}
                min={formatDateForInput(navDateRange.oldestDate)}
                className="text-sm"
              />
            </div>
            {startDate && (
              <p className="text-xs text-muted-foreground mt-1">
                NAV: ₹{findNAVAtDate(navData, new Date(startDate))?.toFixed(2) || 'N/A'}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
            <div className="flex gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-2" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={formatDateForInput(navDateRange.latestDate)}
                min={startDate || formatDateForInput(navDateRange.oldestDate)}
                className="text-sm"
              />
            </div>
            {endDate && (
              <p className="text-xs text-muted-foreground mt-1">
                NAV: ₹{findNAVAtDate(navData, new Date(endDate))?.toFixed(2) || 'N/A'}
              </p>
            )}
          </div>

          <Button
            onClick={() => setShowResult(true)}
            disabled={!startDate || !endDate}
            className="w-full text-sm"
            size="sm"
          >
            Calculate CAGR
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {calculation && 'error' in calculation ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
              {calculation.error}
            </div>
          ) : calculation ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Start</p>
                  <p className="font-semibold">{new Date(startDate).toLocaleDateString()}</p>
                  <p className="text-muted-foreground">₹{calculation.startNav.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End</p>
                  <p className="font-semibold">{new Date(endDate).toLocaleDateString()}</p>
                  <p className="text-muted-foreground">₹{calculation.endNav.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded border">
                <div className="text-xs text-muted-foreground mb-2">
                  Period: {calculation.yearsDiff.toFixed(2)} years
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">CAGR</p>
                    <p className={`text-2xl font-bold ${getVerdict(calculation.cagr).color}`}>
                      {(calculation.cagr * 100).toFixed(2)}%
                    </p>
                  </div>
                  <p className={`text-xs font-medium ${getVerdict(calculation.cagr).color}`}>
                    {getVerdict(calculation.cagr).text}
                  </p>
                </div>
              </div>

              <div className="bg-purple-50/50 dark:bg-purple-900/20 p-2 rounded border border-purple-200 dark:border-purple-800 text-xs font-mono text-purple-800 dark:text-purple-200">
                <p>
                  ({calculation.endNav.toFixed(2)} ÷ {calculation.startNav.toFixed(2)})^(1/
                  {calculation.yearsDiff.toFixed(2)}) - 1
                </p>
              </div>

              <Button onClick={handleReset} variant="outline" className="w-full text-sm" size="sm">
                <Trash2 className="h-3 w-3 mr-1" /> Reset
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {navDateRange && (
        <p className="text-xs text-muted-foreground">
          Data available: {navDateRange.oldestDate.toLocaleDateString()} to{' '}
          {navDateRange.latestDate.toLocaleDateString()}
        </p>
      )}
    </Card>
  );
}
