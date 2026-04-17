import { TrendingUp, DollarSign, Target, Clock, PiggyBank, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EpfSummary } from './useEpfCalculations';

interface EpfSummaryCardsProps {
  summary: EpfSummary;
  currentBalance: number;
}

export function EpfSummaryCards({ summary, currentBalance }: EpfSummaryCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <PiggyBank className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{currentBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total invested till date</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <Target className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maturity Value (Nominal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{summary.finalBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Future rupee value at 58</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maturity Value (Real)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{summary.finalBalanceReal.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Today&apos;s purchasing power</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <DollarSign className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investment (Nominal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₹{summary.totalContributed.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Future rupee contributions</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <Calculator className="h-4 w-4 text-cyan-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investment (Real)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              ₹{summary.totalContributedReal.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Present value of contributions</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Years to Retirement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {summary.yearsToRetirement} years
            </div>
            <div className="text-xs text-muted-foreground mt-1">Until age 58</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Interest (Nominal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">
              ₹{summary.totalInterest.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Future rupee interest earnings</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Interest (Real)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-teal-600">
              ₹{summary.totalInterestReal.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Today&apos;s purchasing power</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              EPF Interest Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-indigo-600">8.25%</div>
            <div className="text-xs text-muted-foreground mt-1">Current annual rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inflation Assumption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">
              {summary.inflationAnnualPct.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">Annual inflation rate</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
