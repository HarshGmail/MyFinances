'use client';

import { useCallback, useMemo, useState } from 'react';
import { useUserGoalsQuery } from '@/api/query/userGoals';
import {
  useStockTransactionsQuery,
  useMutualFundInfoFetchQuery,
  useCryptoTransactionsQuery,
  useMutualFundTransactionsQuery,
  useMfapiNavHistoryBatchQuery,
  useNseQuoteQuery,
  useGoldTransactionsQuery,
  useCryptoCoinPricesQuery,
  useUserProfileQuery,
} from '@/api/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import _ from 'lodash';
import {
  Pencil,
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  PieChart,
  BarChart3,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Activity,
  Award,
  Coins,
  Building,
  Gem,
} from 'lucide-react';
import GoalEditDrawer from './GoalEditDrawer';
import type { AssetOption } from './GoalAssetSelector';
import { formatCurrency } from '@/utils/numbers';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAppStore } from '@/store/useAppStore';

const getProgressColor = (percentage: number) => {
  if (percentage >= 100) return 'bg-green-500';
  if (percentage >= 75) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getStatusIcon = (percentage: number) => {
  if (percentage >= 100) return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (percentage >= 75) return <TrendingUp className="h-4 w-4 text-blue-500" />;
  if (percentage >= 25) return <Clock className="h-4 w-4 text-yellow-500" />;
  return <AlertCircle className="h-4 w-4 text-red-500" />;
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'High':
      return 'destructive';
    case 'Medium':
      return 'default';
    case 'Low':
      return 'secondary';
    default:
      return 'secondary';
  }
};

interface GoalWithProgress {
  _id?: string;
  goalName: string;
  description?: string;
  targetAmount?: number;
  goldAlloted?: number;
  stockSymbols?: string[];
  mutualFundIds?: string[];
  cryptoCurrency?: string[];
  currentValue: number;
  progressPercentage: number;
  monthlyRequired: number;
  projectedCompletion: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  performance: 'Excellent' | 'Good' | 'Average' | 'Poor';
  momentum: 'Accelerating' | 'Steady' | 'Slowing' | 'Stalled';
  remainingAmount: number;
  assetBreakdown: {
    stocks: { value: number; count: number; percentage: number };
    mutualFunds: { value: number; count: number; percentage: number };
    gold: { value: number; grams: number; percentage: number };
    crypto: { value: number; count: number; percentage: number };
  };
  insights: string[];
  priority: 'High' | 'Medium' | 'Low';
}

export default function Goals() {
  const { theme } = useAppStore();
  const [editGoal, setEditGoal] = useState<GoalWithProgress | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'detailed' | 'analytics'>('grid');
  const [sortBy, setSortBy] = useState<'progress' | 'value' | 'completion' | 'priority'>(
    'progress'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'completed' | 'in-progress' | 'high-priority'>(
    'all'
  );

  // Fetch goals and user data
  const { data: goals, isLoading: goalsLoading } = useUserGoalsQuery();
  const { data: user } = useUserProfileQuery();

  // Fetch transaction data for calculations
  const { data: stockTransactions } = useStockTransactionsQuery();
  const { data: mfInfoData } = useMutualFundInfoFetchQuery();
  const { data: mutualFundsTransactionsData } = useMutualFundTransactionsQuery();
  const { data: cryptoTransactions } = useCryptoTransactionsQuery();
  const { data: goldTransactions } = useGoldTransactionsQuery();

  // Fetch asset options
  const { data: stockData } = useStockTransactionsQuery();
  const { data: mfData } = useMutualFundInfoFetchQuery();
  const { data: cryptoTxData } = useCryptoTransactionsQuery();

  const stockOptions: AssetOption[] = useMemo(
    () =>
      Array.from(new Set((stockData || []).map((s) => s.stockName)))
        .filter((name): name is string => Boolean(name))
        .sort()
        .map((name) => ({ type: 'stock' as const, value: String(name), label: String(name) })),
    [stockData]
  );
  const mutualFundOptions: AssetOption[] = useMemo(
    () =>
      (mfData || [])
        .filter((mf) => mf.fundName && mf._id)
        .map((mf) => ({
          type: 'mutualFund' as const,
          value: String(mf._id),
          label: String(mf.fundName),
        })),
    [mfData]
  );
  const cryptoOptions: AssetOption[] = useMemo(() => {
    if (!cryptoTxData) return [];
    return Array.from(
      new Set(
        cryptoTxData.map(
          (tx: { coinName?: string; coinSymbol?: string }) => tx.coinName || tx.coinSymbol
        )
      )
    )
      .filter((name): name is string => Boolean(name))
      .sort()
      .map((name) => ({ type: 'crypto' as const, value: String(name), label: String(name) }));
  }, [cryptoTxData]);

  // Fetch current prices
  const stockNames = useMemo(() => {
    if (!stockTransactions) return [];
    return Array.from(new Set(stockTransactions.map((s) => s.stockName))).filter(Boolean);
  }, [stockTransactions]);
  const { data: nseQuoteData } = useNseQuoteQuery(stockNames);

  // Get scheme numbers for mutual funds
  const schemeNumbers = useMemo(() => {
    if (!mfInfoData) return [];
    return Array.from(new Set(mfInfoData.map((info) => info.schemeNumber)));
  }, [mfInfoData]);
  const { data: navHistoryBatch } = useMfapiNavHistoryBatchQuery(schemeNumbers);

  // Build NAV data map for mutual funds
  const navDataMap = useMemo(() => {
    const map: Record<string, { nav: number; navDate: string } | null> = {};
    schemeNumbers.forEach((schemeNumber) => {
      const navData = navHistoryBatch?.[schemeNumber];
      if (navData && navData.data && navData.data.length > 0) {
        map[schemeNumber] = {
          nav: parseFloat(navData.data[0].nav),
          navDate: navData.data[0].date,
        };
      } else {
        map[schemeNumber] = null;
      }
    });
    return map;
  }, [schemeNumbers, navHistoryBatch]);

  // Calculate stock portfolio values
  const stockPortfolioMap = useMemo(() => {
    if (!stockTransactions) return {};
    const grouped = _.groupBy(stockTransactions, 'stockName');
    const map: Record<string, number> = {};

    Object.entries(grouped).forEach(([stockName, txs]) => {
      const totalShares = txs.reduce((sum, tx) => sum + (tx.numOfShares ?? 0), 0);
      const stockData = nseQuoteData?.[stockName];
      const currentPrice = stockData?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (currentPrice && totalShares > 0) {
        map[stockName] = currentPrice * totalShares;
      }
    });
    return map;
  }, [stockTransactions, nseQuoteData]);

  // Calculate mutual fund portfolio values
  const mfPortfolioMap = useMemo(() => {
    if (!mutualFundsTransactionsData || !mfInfoData) return {};
    const grouped = _.groupBy(mutualFundsTransactionsData, 'fundName');
    const map: Record<string, number> = {};

    Object.entries(grouped).forEach(([fundName, txs]) => {
      const totalUnits = txs.reduce((sum, tx) => sum + tx.numOfUnits, 0);
      const info = mfInfoData.find((info) => info.fundName === fundName);
      const schemeNumber = info?.schemeNumber;
      const navInfo = schemeNumber ? navDataMap[schemeNumber] : null;
      const currentNav = navInfo ? navInfo.nav : null;
      if (currentNav && totalUnits > 0) {
        map[fundName] = totalUnits * currentNav;
      }
    });
    return map;
  }, [mutualFundsTransactionsData, mfInfoData, navDataMap]);

  // Calculate crypto portfolio values
  const cryptoInvestedMap = useMemo(() => {
    if (!cryptoTransactions) return {};
    const grouped = _.groupBy(
      cryptoTransactions,
      (tx) => tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()
    );
    const map: Record<string, { invested: number; units: number; coinName: string }> = {};

    Object.entries(grouped).forEach(([symbol, txs]) => {
      let invested = 0;
      let units = 0;
      let coinName = '';
      txs.forEach((tx) => {
        if (tx.type === 'credit') {
          invested += tx.amount;
          units += tx.quantity ?? 0;
        } else if (tx.type === 'debit') {
          invested -= tx.amount;
          units -= tx.quantity ?? 0;
        }
        coinName = tx.coinName;
      });
      map[symbol] = { invested, units, coinName };
    });
    return map;
  }, [cryptoTransactions]);

  const validCoins = useMemo(() => {
    return Object.entries(cryptoInvestedMap)
      .filter(([, v]) => v.units > 0)
      .map(([symbol]) => symbol);
  }, [cryptoInvestedMap]);

  const { data: coinPrices } = useCryptoCoinPricesQuery(validCoins);

  const cryptoPortfolioMap = useMemo(() => {
    if (!coinPrices?.data) return {};
    const map: Record<string, number> = {};

    validCoins.forEach((coinSymbol) => {
      const currentPrice = coinPrices.data[coinSymbol] || 0;
      const units = cryptoInvestedMap[coinSymbol]?.units || 0;
      if (units > 0 && currentPrice > 0) {
        map[coinSymbol] = units * currentPrice;
      }
    });
    return map;
  }, [coinPrices, cryptoInvestedMap, validCoins]);

  // Build a map from coin name to symbol
  const coinNameToSymbol = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(cryptoInvestedMap).forEach(([symbol, { coinName }]) => {
      if (coinName) map[coinName] = symbol;
    });
    return map;
  }, [cryptoInvestedMap]);

  // Enhanced analytics calculations
  interface Goal {
    targetAmount?: number;
    stockSymbols?: string[];
    cryptoCurrency?: string[];
    mutualFundIds?: string[];
    goldAlloted?: boolean;
    // Add other properties as needed
  }

  const calculateEnhancedMetrics = useCallback(
    (goal: Goal, currentValue: number) => {
      const monthlySalary = user?.monthlySalary ?? 0;
      const targetAmount = goal.targetAmount ?? 0;
      const remainingAmount = Math.max(0, targetAmount - currentValue);
      const progressPercentage = targetAmount > 0 ? (currentValue / targetAmount) * 100 : 0;

      // Calculate monthly required based on target timeline (assume 5 years if not specified)
      const monthsToTarget = 60; // 5 years default
      const monthlyRequired = remainingAmount / monthsToTarget;

      // Projected completion based on current investment rate
      let projectedCompletion = 'Never';
      const estimatedMonthlyInvestment = monthlySalary * 0.15; // Assume 15% of salary
      if (estimatedMonthlyInvestment > 0 && remainingAmount > 0) {
        const monthsToComplete = Math.ceil(remainingAmount / estimatedMonthlyInvestment);
        if (monthsToComplete <= 12) {
          projectedCompletion = `${monthsToComplete} months`;
        } else if (monthsToComplete <= 60) {
          projectedCompletion = `${Math.ceil(monthsToComplete / 12)} years`;
        } else {
          projectedCompletion = '5+ years';
        }
      } else if (remainingAmount <= 0) {
        projectedCompletion = 'Completed';
      }

      // Risk assessment
      const stockCount = goal.stockSymbols?.length || 0;
      const cryptoCount = goal.cryptoCurrency?.length || 0;
      const totalAssets =
        stockCount + (goal.mutualFundIds?.length || 0) + cryptoCount + (goal.goldAlloted ? 1 : 0);

      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      if (totalAssets > 0) {
        const highRiskRatio = (stockCount + cryptoCount) / totalAssets;
        if (highRiskRatio > 0.6) riskLevel = 'High';
        else if (highRiskRatio > 0.3) riskLevel = 'Medium';
      }

      // Performance assessment
      let performance: 'Excellent' | 'Good' | 'Average' | 'Poor' = 'Poor';
      if (progressPercentage >= 90) performance = 'Excellent';
      else if (progressPercentage >= 70) performance = 'Good';
      else if (progressPercentage >= 40) performance = 'Average';

      // Momentum calculation (simplified)
      let momentum: 'Accelerating' | 'Steady' | 'Slowing' | 'Stalled' = 'Steady';
      if (progressPercentage >= 80) momentum = 'Accelerating';
      else if (progressPercentage >= 50) momentum = 'Steady';
      else if (progressPercentage >= 20) momentum = 'Slowing';
      else momentum = 'Stalled';

      // Priority calculation
      let priority: 'High' | 'Medium' | 'Low' = 'Medium';
      if (progressPercentage >= 80 || targetAmount > monthlySalary * 12) priority = 'High';
      else if (progressPercentage < 20) priority = 'Low';

      // Generate insights
      const insights = [];
      if (progressPercentage >= 100) {
        insights.push('Goal completed! Consider setting a new target.');
      } else if (progressPercentage >= 80) {
        insights.push("Excellent progress! You're on track to complete this goal soon.");
      } else if (progressPercentage < 20) {
        insights.push('Consider increasing monthly contributions to accelerate progress.');
      }

      if (riskLevel === 'High') {
        insights.push('High-risk portfolio. Consider diversifying for stability.');
      }

      if (monthlyRequired > monthlySalary * 0.3) {
        insights.push('Target may be ambitious. Consider extending timeline or reducing target.');
      }

      return {
        monthlyRequired,
        projectedCompletion,
        riskLevel,
        performance,
        momentum,
        remainingAmount,
        insights,
        priority,
      };
    },
    [user?.monthlySalary]
  );

  // Process goals with enhanced analytics
  const goalsWithProgress = useMemo((): GoalWithProgress[] => {
    if (!goals) return [];

    return goals.map((goal) => {
      let currentValue = 0;
      const assetBreakdown = {
        stocks: { value: 0, count: 0, percentage: 0 },
        mutualFunds: { value: 0, count: 0, percentage: 0 },
        gold: { value: 0, grams: 0, percentage: 0 },
        crypto: { value: 0, count: 0, percentage: 0 },
      };

      // Calculate stock values
      if (goal.stockSymbols && goal.stockSymbols.length > 0) {
        goal.stockSymbols.forEach((stockName) => {
          const value = stockPortfolioMap[stockName] || 0;
          currentValue += value;
          assetBreakdown.stocks.value += value;
          if (value > 0) assetBreakdown.stocks.count++;
        });
      }

      // Calculate mutual fund values
      if (goal.mutualFundIds && goal.mutualFundIds.length > 0) {
        goal.mutualFundIds.forEach((fundId) => {
          const fundInfo = mfInfoData?.find((info) => info._id === fundId);
          if (fundInfo?.fundName) {
            const value = mfPortfolioMap[fundInfo.fundName] || 0;
            currentValue += value;
            assetBreakdown.mutualFunds.value += value;
            if (value > 0) assetBreakdown.mutualFunds.count++;
          }
        });
      }

      // Calculate gold progress
      if (goal.goldAlloted && goal.goldAlloted > 0) {
        const totalGoldGrams =
          goldTransactions?.reduce(
            (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
            0
          ) || 0;

        assetBreakdown.gold.grams = goal.goldAlloted;
        assetBreakdown.gold.value = totalGoldGrams;
      }

      // Calculate crypto values
      if (goal.cryptoCurrency && goal.cryptoCurrency.length > 0) {
        goal.cryptoCurrency.forEach((coinName) => {
          const symbol = coinNameToSymbol[coinName];
          const value = symbol ? cryptoPortfolioMap[symbol] || 0 : 0;
          currentValue += value;
          assetBreakdown.crypto.value += value;
          if (value > 0) assetBreakdown.crypto.count++;
        });
      }

      // Calculate asset percentages
      if (currentValue > 0) {
        assetBreakdown.stocks.percentage = (assetBreakdown.stocks.value / currentValue) * 100;
        assetBreakdown.mutualFunds.percentage =
          (assetBreakdown.mutualFunds.value / currentValue) * 100;
        assetBreakdown.crypto.percentage = (assetBreakdown.crypto.value / currentValue) * 100;
        assetBreakdown.gold.percentage = (assetBreakdown.gold.value / currentValue) * 100;
      }

      // Calculate progress percentage
      let progressPercentage = 0;
      if (goal.targetAmount && goal.targetAmount > 0) {
        progressPercentage = (currentValue / goal.targetAmount) * 100;
      } else if (goal.goldAlloted && goal.goldAlloted > 0) {
        const totalGoldGrams =
          goldTransactions?.reduce(
            (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
            0
          ) || 0;
        progressPercentage = totalGoldGrams > 0 ? (totalGoldGrams / goal.goldAlloted) * 100 : 0;
      }

      // @ts-expect-error Calculate enhanced metrics
      const enhancedMetrics = calculateEnhancedMetrics(goal, currentValue);

      return {
        ...goal,
        currentValue,
        progressPercentage,
        assetBreakdown,
        ...enhancedMetrics,
      };
    });
  }, [
    goals,
    calculateEnhancedMetrics,
    stockPortfolioMap,
    mfInfoData,
    mfPortfolioMap,
    goldTransactions,
    coinNameToSymbol,
    cryptoPortfolioMap,
  ]);

  // Apply sorting and filtering
  const filteredAndSortedGoals = useMemo(() => {
    let filtered = goalsWithProgress;

    // Apply filters
    switch (filterBy) {
      case 'completed':
        filtered = filtered.filter((g) => g.progressPercentage >= 100);
        break;
      case 'in-progress':
        filtered = filtered.filter((g) => g.progressPercentage < 100 && g.progressPercentage > 0);
        break;
      case 'high-priority':
        filtered = filtered.filter((g) => g.priority === 'High');
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'progress':
          aVal = a.progressPercentage;
          bVal = b.progressPercentage;
          break;
        case 'value':
          aVal = a.currentValue;
          bVal = b.currentValue;
          break;
        case 'completion':
          aVal = a.remainingAmount;
          bVal = b.remainingAmount;
          break;
        case 'priority':
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [goalsWithProgress, filterBy, sortBy, sortOrder]);

  // Calculate overall analytics
  const goalsAnalytics = useMemo(() => {
    if (goalsWithProgress.length === 0)
      return {
        totalGoals: 0,
        completedGoals: 0,
        totalTargetValue: 0,
        totalCurrentValue: 0,
        averageProgress: 0,
        highPriorityGoals: 0,
        riskDistribution: { Low: 0, Medium: 0, High: 0 },
        performanceDistribution: { Excellent: 0, Good: 0, Average: 0, Poor: 0 },
        totalMonthlyRequired: 0,
      };

    const totalGoals = goalsWithProgress.length;
    const completedGoals = goalsWithProgress.filter((g) => g.progressPercentage >= 100).length;
    const totalTargetValue = goalsWithProgress.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const totalCurrentValue = goalsWithProgress.reduce((sum, g) => sum + g.currentValue, 0);
    const averageProgress =
      goalsWithProgress.reduce((sum, g) => sum + g.progressPercentage, 0) / totalGoals;
    const highPriorityGoals = goalsWithProgress.filter((g) => g.priority === 'High').length;
    const totalMonthlyRequired = goalsWithProgress.reduce((sum, g) => sum + g.monthlyRequired, 0);

    const riskDistribution = goalsWithProgress.reduce(
      (acc, g) => {
        acc[g.riskLevel]++;
        return acc;
      },
      { Low: 0, Medium: 0, High: 0 }
    );

    const performanceDistribution = goalsWithProgress.reduce(
      (acc, g) => {
        acc[g.performance]++;
        return acc;
      },
      { Excellent: 0, Good: 0, Average: 0, Poor: 0 }
    );

    return {
      totalGoals,
      completedGoals,
      totalTargetValue,
      totalCurrentValue,
      averageProgress,
      highPriorityGoals,
      riskDistribution,
      performanceDistribution,
      totalMonthlyRequired,
    };
  }, [goalsWithProgress]);

  // Chart configurations
  const progressChartOptions = useMemo(() => {
    const data = filteredAndSortedGoals.map((goal) => ({
      name: goal.goalName,
      y: Math.min(goal.progressPercentage, 100),
      color:
        goal.progressPercentage >= 100
          ? '#22c55e'
          : goal.progressPercentage >= 75
            ? '#3b82f6'
            : goal.progressPercentage >= 50
              ? '#eab308'
              : '#ef4444',
    }));

    return {
      chart: { type: 'column', backgroundColor: 'transparent', height: 300 },
      title: {
        text: 'Goals Progress Overview',
        style: {
          color: theme === 'dark' ? '#fff' : '#18181b',
          fontSize: '16px',
          fontWeight: '600',
        },
      },
      xAxis: {
        type: 'category',
        labels: { style: { color: theme === 'dark' ? '#fff' : '#18181b' }, rotation: -45 },
      },
      yAxis: {
        title: { text: 'Progress (%)', style: { color: theme === 'dark' ? '#fff' : '#18181b' } },
        labels: { style: { color: theme === 'dark' ? '#fff' : '#18181b' } },
        max: 100,
      },
      series: [{ name: 'Progress', data: data, colorByPoint: true }],
      credits: { enabled: false },
    };
  }, [filteredAndSortedGoals, theme]);

  const assetAllocationChartOptions = useMemo(() => {
    const aggregatedAssets = filteredAndSortedGoals.reduce(
      (acc, goal) => {
        acc.stocks += goal.assetBreakdown.stocks.value;
        acc.mutualFunds += goal.assetBreakdown.mutualFunds.value;
        acc.crypto += goal.assetBreakdown.crypto.value;
        acc.gold += goal.assetBreakdown.gold.value;
        return acc;
      },
      { stocks: 0, mutualFunds: 0, crypto: 0, gold: 0 }
    );

    const data = [
      { name: 'Stocks', y: aggregatedAssets.stocks, color: '#3b82f6' },
      { name: 'Mutual Funds', y: aggregatedAssets.mutualFunds, color: '#22c55e' },
      { name: 'Cryptocurrency', y: aggregatedAssets.crypto, color: '#a855f7' },
      { name: 'Gold', y: aggregatedAssets.gold, color: '#eab308' },
    ].filter((item) => item.y > 0);

    return {
      chart: { type: 'pie', backgroundColor: 'transparent', height: 300 },
      title: {
        text: 'Asset Allocation Across Goals',
        style: {
          color: theme === 'dark' ? '#fff' : '#18181b',
          fontSize: '16px',
          fontWeight: '600',
        },
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f}%',
            style: { color: theme === 'dark' ? '#fff' : '#18181b' },
          },
          showInLegend: true,
        },
      },
      series: [{ name: 'Allocation', data: data }],
      credits: { enabled: false },
      legend: { itemStyle: { color: theme === 'dark' ? '#fff' : '#18181b' } },
    };
  }, [filteredAndSortedGoals, theme]);

  if (goalsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Target className="mx-auto h-16 w-16 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Goals Found</h3>
          <p className="mb-4">
            Create your first financial goal to start tracking your progress and building wealth
            systematically.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Award className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">Set Clear Targets</p>
              <p className="text-xs">Define specific financial goals with timelines</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Activity className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Track Progress</p>
              <p className="text-xs">Monitor your journey with detailed analytics</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="font-medium">Build Wealth</p>
              <p className="text-xs">Achieve financial freedom through systematic planning</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredAndSortedGoals.map((goal) => (
        <Card
          key={goal._id}
          className="p-4 relative hover:shadow-lg transition-all duration-200 group border-l-1"
          style={{
            borderLeftColor:
              goal.priority === 'High'
                ? '#ef4444'
                : goal.priority === 'Medium'
                  ? '#eab308'
                  : '#22c55e',
          }}
        >
          <div className="space-y-3">
            {/* Goal Header with Status */}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(goal.progressPercentage)}
                  <h3 className="text-sm font-semibold truncate">{goal.goalName}</h3>
                  <Badge variant={getRiskColor(goal.riskLevel)} className="text-xs">
                    {goal.riskLevel}
                  </Badge>
                </div>
                {goal.description && (
                  <p className="text-muted-foreground text-xs line-clamp-2">{goal.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Goal Analytics</h4>
                      <div className="text-sm space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-muted-foreground">Performance</p>
                            <Badge
                              variant={
                                goal.performance === 'Excellent'
                                  ? 'default'
                                  : goal.performance === 'Good'
                                    ? 'default'
                                    : goal.performance === 'Average'
                                      ? 'secondary'
                                      : 'destructive'
                              }
                            >
                              {goal.performance}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Momentum</p>
                            <p className="font-medium">{goal.momentum}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p>
                            <strong>Monthly Required:</strong>{' '}
                            {formatCurrency(goal.monthlyRequired)}
                          </p>
                          <p>
                            <strong>Remaining:</strong> {formatCurrency(goal.remainingAmount)}
                          </p>
                          <p>
                            <strong>Est. Completion:</strong> {goal.projectedCompletion}
                          </p>
                        </div>
                        {goal.insights.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">Insights:</p>
                            <ul className="text-xs space-y-1">
                              {goal.insights.map((insight, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-blue-500 mt-0.5">•</span>
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setEditGoal(goal)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Value Display */}
            <div className="text-center py-2">
              <div className="text-lg font-bold">{formatCurrency(goal.currentValue)}</div>
              {goal.targetAmount && (
                <div className="text-xs text-muted-foreground">
                  of {formatCurrency(goal.targetAmount)}
                </div>
              )}
            </div>

            {/* Progress Bar with Enhanced Styling */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span className="font-medium">{goal.progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="relative">
                <Progress
                  value={Math.min(goal.progressPercentage, 100)}
                  className="h-2"
                  indicatorClassName={getProgressColor(goal.progressPercentage)}
                />
                {goal.progressPercentage >= 100 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-muted-foreground">Monthly Req.</p>
                <p className="font-medium">{formatCurrency(goal.monthlyRequired)}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-muted-foreground">Timeline</p>
                <p className="font-medium">{goal.projectedCompletion}</p>
              </div>
            </div>

            {/* Asset Allocation Mini Chart */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Asset Mix</p>
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                {goal.assetBreakdown.stocks.percentage > 0 && (
                  <div
                    className="bg-blue-500"
                    style={{ width: `${goal.assetBreakdown.stocks.percentage}%` }}
                  />
                )}
                {goal.assetBreakdown.mutualFunds.percentage > 0 && (
                  <div
                    className="bg-green-500"
                    style={{ width: `${goal.assetBreakdown.mutualFunds.percentage}%` }}
                  />
                )}
                {goal.assetBreakdown.crypto.percentage > 0 && (
                  <div
                    className="bg-purple-500"
                    style={{ width: `${goal.assetBreakdown.crypto.percentage}%` }}
                  />
                )}
                {goal.assetBreakdown.gold.percentage > 0 && (
                  <div
                    className="bg-yellow-500"
                    style={{ width: `${goal.assetBreakdown.gold.percentage}%` }}
                  />
                )}
              </div>
            </div>

            {/* Asset Tags */}
            <div className="flex items-center gap-1 flex-wrap">
              {goal.stockSymbols && goal.stockSymbols.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                >
                  <Building className="h-3 w-3 mr-1" />
                  {goal.stockSymbols.length}
                </Badge>
              )}
              {goal.mutualFundIds && goal.mutualFundIds.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-green-50 text-green-700 border-green-200"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  {goal.mutualFundIds.length}
                </Badge>
              )}
              {goal.goldAlloted && goal.goldAlloted > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                >
                  <Gem className="h-3 w-3 mr-1" />
                  {goal.goldAlloted}g
                </Badge>
              )}
              {goal.cryptoCurrency && goal.cryptoCurrency.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                >
                  <Coins className="h-3 w-3 mr-1" />
                  {goal.cryptoCurrency.length}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const DetailedView = () => (
    <div className="space-y-6">
      {filteredAndSortedGoals.map((goal) => (
        <Card
          key={goal._id}
          className="p-6 border-l-4 hover:shadow-lg transition-all duration-200"
          style={{
            borderLeftColor:
              goal.priority === 'High'
                ? '#ef4444'
                : goal.priority === 'Medium'
                  ? '#eab308'
                  : '#22c55e',
          }}
        >
          <div className="space-y-6">
            {/* Enhanced Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                {getStatusIcon(goal.progressPercentage)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-semibold">{goal.goalName}</h3>
                    <Badge variant={getRiskColor(goal.riskLevel)}>{goal.riskLevel} Risk</Badge>
                    <Badge
                      variant={
                        goal.priority === 'High'
                          ? 'destructive'
                          : goal.priority === 'Medium'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {goal.priority} Priority
                    </Badge>
                  </div>
                  {goal.description && <p className="text-muted-foreground">{goal.description}</p>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{formatCurrency(goal.currentValue)}</div>
                {goal.targetAmount && (
                  <div className="text-muted-foreground">
                    Target: {formatCurrency(goal.targetAmount)}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setEditGoal(goal)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit Goal
                </Button>
              </div>
            </div>

            {/* Enhanced Progress Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Progress</span>
                <span className="text-2xl font-bold">{goal.progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(goal.progressPercentage, 100)}
                className="h-3"
                indicatorClassName={getProgressColor(goal.progressPercentage)}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Remaining: {formatCurrency(goal.remainingAmount)}</span>
                <span>Performance: {goal.performance}</span>
              </div>
            </div>

            {/* Enhanced Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-lg font-semibold">{goal.projectedCompletion}</div>
                <div className="text-xs text-muted-foreground">Est. Completion</div>
              </Card>
              <Card className="p-4 text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="text-lg font-semibold">{formatCurrency(goal.monthlyRequired)}</div>
                <div className="text-xs text-muted-foreground">Monthly Required</div>
              </Card>
              <Card className="p-4 text-center">
                <Activity className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <div className="text-lg font-semibold">{goal.momentum}</div>
                <div className="text-xs text-muted-foreground">Momentum</div>
              </Card>
              <Card className="p-4 text-center">
                <Target className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <div className="text-lg font-semibold">{goal.performance}</div>
                <div className="text-xs text-muted-foreground">Performance</div>
              </Card>
            </div>

            {/* Enhanced Asset Breakdown */}
            <div>
              <h4 className="text-lg font-medium mb-3">Asset Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {goal.assetBreakdown.stocks.value > 0 && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Building className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-lg font-semibold text-blue-700">
                      {formatCurrency(goal.assetBreakdown.stocks.value)}
                    </div>
                    <div className="text-sm text-blue-600">
                      {goal.assetBreakdown.stocks.count} Stocks (
                      {goal.assetBreakdown.stocks.percentage.toFixed(1)}%)
                    </div>
                  </div>
                )}

                {goal.assetBreakdown.mutualFunds.value > 0 && (
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <div className="text-lg font-semibold text-green-700">
                      {formatCurrency(goal.assetBreakdown.mutualFunds.value)}
                    </div>
                    <div className="text-sm text-green-600">
                      {goal.assetBreakdown.mutualFunds.count} Funds (
                      {goal.assetBreakdown.mutualFunds.percentage.toFixed(1)}%)
                    </div>
                  </div>
                )}

                {goal.assetBreakdown.gold.value > 0 && (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Gem className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <div className="text-lg font-semibold text-yellow-700">
                      {goal.assetBreakdown.gold.value}g
                    </div>
                    <div className="text-sm text-yellow-600">
                      Target: {goal.assetBreakdown.gold.grams}g Gold
                    </div>
                  </div>
                )}

                {goal.assetBreakdown.crypto.value > 0 && (
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <Coins className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-lg font-semibold text-purple-700">
                      {formatCurrency(goal.assetBreakdown.crypto.value)}
                    </div>
                    <div className="text-sm text-purple-600">
                      {goal.assetBreakdown.crypto.count} Cryptos (
                      {goal.assetBreakdown.crypto.percentage.toFixed(1)}%)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Insights Section */}
            {goal.insights.length > 0 && (
              <div>
                <h4 className="text-lg font-medium mb-3">AI Insights</h4>
                <div className="space-y-2">
                  {goal.insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  const AnalyticsView = () => (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Goals Progress Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <HighchartsReact highcharts={Highcharts} options={progressChartOptions} />
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <HighchartsReact highcharts={Highcharts} options={assetAllocationChartOptions} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-3">
              {Object.entries(goalsAnalytics.performanceDistribution).map(
                ([performance, count]) => (
                  <div
                    key={performance}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded"
                  >
                    <span className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          performance === 'Excellent'
                            ? 'bg-green-500'
                            : performance === 'Good'
                              ? 'bg-blue-500'
                              : performance === 'Average'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                        }`}
                      />
                      {performance}
                    </span>
                    <span className="font-semibold">{count} goals</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Risk Analysis</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-3">
              {Object.entries(goalsAnalytics.riskDistribution).map(([risk, count]) => (
                <div
                  key={risk}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded"
                >
                  <span className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        risk === 'High'
                          ? 'bg-red-500'
                          : risk === 'Medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                    />
                    {risk} Risk
                  </span>
                  <span className="font-semibold">{count} goals</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Total Goals</p>
              <p className="text-2xl font-bold text-blue-700">{goalsAnalytics.totalGoals}</p>
              <p className="text-xs text-blue-500">
                {goalsAnalytics.highPriorityGoals} high priority
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-700">{goalsAnalytics.completedGoals}</p>
              <p className="text-xs text-green-500">
                {((goalsAnalytics.completedGoals / goalsAnalytics.totalGoals) * 100).toFixed(1)}%
                success rate
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Avg Progress</p>
              <p className="text-2xl font-bold text-purple-700">
                {goalsAnalytics.averageProgress.toFixed(1)}%
              </p>
              <p className="text-xs text-purple-500">Across all goals</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600">Total Value</p>
              <p className="text-2xl font-bold text-orange-700">
                {formatCurrency(goalsAnalytics.totalCurrentValue)}
              </p>
              <p className="text-xs text-orange-500">Current portfolio</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Enhanced Controls */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select
                value={filterBy}
                onValueChange={(value) =>
                  setFilterBy(value as 'all' | 'completed' | 'in-progress' | 'high-priority')
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Goals</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="high-priority">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">Sort by:</span>
              <Select
                value={sortBy}
                onValueChange={(value) =>
                  setSortBy(value as 'progress' | 'value' | 'completion' | 'priority')
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="completion">Completion</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as 'grid' | 'detailed' | 'analytics')}
          >
            <TabsList>
              <TabsTrigger value="grid">
                <Grid3X3 className="h-4 w-4 mr-1" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="detailed">
                <List className="h-4 w-4 mr-1" />
                Detailed
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <PieChart className="h-4 w-4 mr-1" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Dynamic Content Based on View Mode */}
      {viewMode === 'grid' && <GridView />}
      {viewMode === 'detailed' && <DetailedView />}
      {viewMode === 'analytics' && <AnalyticsView />}

      {/* Edit Goal Drawer */}
      {editGoal && (
        <GoalEditDrawer
          goal={editGoal}
          onClose={() => setEditGoal(null)}
          assetOptions={{
            stocks: stockOptions,
            mutualFunds: mutualFundOptions,
            crypto: cryptoOptions,
          }}
        />
      )}
    </div>
  );
}
