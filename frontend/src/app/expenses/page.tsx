'use client';

import { useState, useMemo } from 'react';
import {
  useExpensesQuery,
  useUserProfileQuery,
  useGoldTransactionsQuery,
  useCryptoTransactionsQuery,
  useStockTransactionsQuery,
  useMutualFundTransactionsQuery,
  useRecurringDepositsQuery,
} from '@/api/query';
import { useAddExpenseMutation, useDeleteExpenseMutation } from '@/api/mutations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency } from '@/utils/numbers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
  Target,
  Trash2,
  DollarSign,
  PieChart,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Coins,
  Building,
  Gem,
  Zap,
  Banknote,
  Info,
} from 'lucide-react';

// Form schema for expense (removed type field)
const expenseSchema = z.object({
  tag: z.string().min(1, 'Tag is required'),
  expenseAmount: z.number().min(0.01, 'Amount must be greater than 0'),
  expenseName: z.string().min(1, 'Name is required'),
  expenseFrequency: z.enum(['one-time', 'daily', 'weekly', 'monthly', 'yearly']),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// Predefined tags for expenses only
const EXPENSE_TAGS = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Personal Care',
  'Rent',
  'Insurance',
  'Others',
];

const EXPENSE_FREQUENCIES = [
  { value: 'one-time', label: 'One Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function ExpensesPage() {
  const { theme } = useAppStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Queries
  const { data: user, isLoading: userLoading } = useUserProfileQuery();
  const { data: expenses, isLoading: expensesLoading, refetch } = useExpensesQuery();
  const { data: goldTransactions, isLoading: goldLoading } = useGoldTransactionsQuery();
  const { data: cryptoTransactions, isLoading: cryptoLoading } = useCryptoTransactionsQuery();
  const { data: stockTransactions, isLoading: stockLoading } = useStockTransactionsQuery();
  const { data: mutualFundTransactions, isLoading: mfLoading } = useMutualFundTransactionsQuery();
  const { data: rdData, isLoading: rdLoading } = useRecurringDepositsQuery();

  // Mutations
  const { mutateAsync: addExpense, isPending: isAdding } = useAddExpenseMutation();
  const { mutate: deleteExpense } = useDeleteExpenseMutation();

  const isLoading =
    userLoading ||
    expensesLoading ||
    goldLoading ||
    cryptoLoading ||
    stockLoading ||
    mfLoading ||
    rdLoading;

  // Form setup
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      tag: '',
      expenseAmount: 0,
      expenseName: '',
      expenseFrequency: 'one-time',
    },
  });

  // Calculate comprehensive financial statistics
  const financialStats = useMemo(() => {
    if (
      !expenses &&
      !goldTransactions &&
      !cryptoTransactions &&
      !stockTransactions &&
      !mutualFundTransactions &&
      !rdData
    ) {
      return {
        totalExpenses: 0,
        monthlyExpenses: 0,
        totalInvestments: 0,
        investmentsByAsset: {},
        expensesByCategory: {},
        expenseToIncomeRatio: 0,
        investmentToIncomeRatio: 0,
        diversificationScore: 0,
        expenseDistribution: {},
        investmentBreakdown: {},
        riskProfile: 'Conservative',
        monthlyBurnRate: 0,
        emergencyFundRatio: 0,
        financialHealthScore: 0,
        recommendations: [],
      };
    }

    const monthlySalary = user?.monthlySalary || 0;

    // Calculate expenses
    const totalExpenses = (expenses || []).reduce((sum, exp) => sum + exp.expenseAmount, 0);
    const monthlyExpenses = (expenses || []).reduce((sum, exp) => {
      switch (exp.expenseFrequency) {
        case 'daily':
          return sum + exp.expenseAmount * 30;
        case 'weekly':
          return sum + exp.expenseAmount * 4;
        case 'monthly':
          return sum + exp.expenseAmount;
        case 'yearly':
          return sum + exp.expenseAmount / 12;
        case 'one-time':
        default:
          return sum + exp.expenseAmount;
      }
    }, 0);

    // Calculate investments by asset type
    const goldInvestments = (goldTransactions || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const cryptoInvestments = (cryptoTransactions || []).reduce(
      (sum, tx) => sum + (tx.amount || 0),
      0
    );
    const stockInvestments = (stockTransactions || [])
      .filter((tx) => tx.type !== 'debit')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const mfInvestments = (mutualFundTransactions || [])
      .filter((tx) => tx.type !== 'debit')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const rdInvestments = (rdData || []).reduce((sum, rd) => sum + rd.amountInvested, 0);

    const totalInvestments =
      goldInvestments + cryptoInvestments + stockInvestments + mfInvestments + rdInvestments;

    const investmentsByAsset = {
      Gold: goldInvestments,
      Cryptocurrency: cryptoInvestments,
      Stocks: stockInvestments,
      'Mutual Funds': mfInvestments,
      'Recurring Deposits': rdInvestments,
    };

    // Group expenses by category
    const expensesByCategory = (expenses || []).reduce(
      (acc, exp) => {
        acc[exp.tag] = (acc[exp.tag] || 0) + exp.expenseAmount;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate ratios
    const expenseToIncomeRatio = monthlySalary > 0 ? (monthlyExpenses / monthlySalary) * 100 : 0;
    const investmentToIncomeRatio =
      monthlySalary > 0 ? (totalInvestments / 12 / monthlySalary) * 100 : 0;

    // Calculate diversification score (0-100)
    const assetTypes = Object.values(investmentsByAsset).filter((amount) => amount > 0).length;
    const diversificationScore = Math.min((assetTypes / 5) * 100, 100);

    // Risk profile assessment
    const highRiskAssets = cryptoInvestments + stockInvestments;
    const lowRiskAssets = rdInvestments + mfInvestments;
    const mediumRiskAssets = goldInvestments;

    let riskProfile = 'Conservative';
    if (highRiskAssets > lowRiskAssets + mediumRiskAssets) {
      riskProfile = 'Aggressive';
    } else if (highRiskAssets > lowRiskAssets * 0.5) {
      riskProfile = 'Moderate';
    }

    // Emergency fund ratio (assuming 6 months of expenses as ideal)
    const monthlySavings = Math.max(0, monthlySalary - monthlyExpenses);
    const emergencyFundRatio =
      monthlyExpenses > 0 ? (monthlySavings * 6) / (monthlyExpenses * 6) : 1;

    // Financial health score (0-100)
    const expenseScore = Math.max(0, 100 - expenseToIncomeRatio);
    const investmentScore = Math.min(investmentToIncomeRatio * 2, 100);
    const diversificationFactor = diversificationScore * 0.3;
    const financialHealthScore = Math.round(
      (expenseScore * 0.4 + investmentScore * 0.4 + diversificationFactor) * 0.8
    );

    // Generate recommendations
    const recommendations = [];
    if (expenseToIncomeRatio > 70) {
      recommendations.push(
        'Consider reducing monthly expenses - currently using ' +
          expenseToIncomeRatio.toFixed(1) +
          '% of income'
      );
    }
    if (investmentToIncomeRatio < 20) {
      recommendations.push(
        'Increase monthly investments to at least 20% of income for better wealth building'
      );
    }
    if (diversificationScore < 60) {
      recommendations.push('Diversify across more asset classes to reduce risk');
    }
    if (emergencyFundRatio < 1) {
      recommendations.push('Build emergency fund covering 6 months of expenses');
    }

    return {
      totalExpenses,
      monthlyExpenses,
      totalInvestments,
      investmentsByAsset,
      expensesByCategory,
      expenseToIncomeRatio,
      investmentToIncomeRatio,
      diversificationScore,
      riskProfile,
      monthlyBurnRate: monthlyExpenses,
      emergencyFundRatio,
      financialHealthScore,
      recommendations,
    };
  }, [
    expenses,
    goldTransactions,
    cryptoTransactions,
    stockTransactions,
    mutualFundTransactions,
    rdData,
    user,
  ]);

  // Prepare data for charts
  const assetAllocationOptions = useMemo(() => {
    const data = Object.entries(financialStats.investmentsByAsset)
      .filter(([, amount]) => amount > 0)
      .map(([name, y]) => ({ name, y }));

    return {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: 350,
      },
      title: {
        text: 'Investment Portfolio Distribution',
        style: {
          color: theme === 'dark' ? '#fff' : '#18181b',
          fontSize: '16px',
          fontWeight: '600',
        },
      },
      tooltip: {
        pointFormat: '<b>₹{point.y:,.0f}</b> ({point.percentage:.1f}%)',
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f}%',
            style: {
              color: theme === 'dark' ? '#fff' : '#18181b',
            },
          },
          showInLegend: true,
        },
      },
      series: [
        {
          name: 'Investment',
          colorByPoint: true,
          data: data,
        },
      ],
      credits: { enabled: false },
      legend: {
        itemStyle: {
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
    };
  }, [financialStats.investmentsByAsset, theme]);

  const expenseDistributionOptions = useMemo(() => {
    const data = Object.entries(financialStats.expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, y]) => ({ name, y }));

    return {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        height: 300,
      },
      title: {
        text: 'Expense Distribution by Category',
        style: {
          color: theme === 'dark' ? '#fff' : '#18181b',
          fontSize: '16px',
          fontWeight: '600',
        },
      },
      xAxis: {
        type: 'category',
        labels: {
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
          rotation: -45,
        },
      },
      yAxis: {
        title: {
          text: 'Amount (₹)',
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
        },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            return '₹' + (this.value as number).toLocaleString();
          },
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
        },
      },
      series: [
        {
          name: 'Expenses',
          data: data,
          color: '#ef4444',
        },
      ],
      credits: { enabled: false },
    };
  }, [financialStats.expensesByCategory, theme]);

  // Handle form submission
  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      await addExpense(values);
      toast.success('Expense added successfully');
      form.reset();
      setDrawerOpen(false);
      refetch();
    } catch {
      toast.error('Failed to add expense');
    }
  };

  // Handle delete expense
  const handleDeleteExpense = (id: string) => {
    deleteExpense(id, {
      onSuccess: () => {
        toast.success('Deleted successfully');
        refetch();
      },
      onError: () => {
        toast.error('Failed to delete');
      },
    });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Personal Finance Dashboard</h1>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full w-[400px] ml-auto">
            <DrawerHeader>
              <DrawerTitle>Add New Expense</DrawerTitle>
            </DrawerHeader>
            <div className="p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="expenseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Coffee, Uber ride" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXPENSE_TAGS.map((tag) => (
                              <SelectItem key={tag} value={tag}>
                                {tag}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expenseAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expenseFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXPENSE_FREQUENCIES.map((freq) => (
                              <SelectItem key={freq.value} value={freq.value}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isAdding}>
                    {isAdding ? 'Adding...' : 'Add Expense'}
                  </Button>
                </form>
              </Form>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Financial Health Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Financial Health Score: {financialStats.financialHealthScore}/100
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-semibold">Financial Health Score Calculation</h4>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Formula:</strong> (Expense Score × 40% + Investment Score × 40% +
                      Diversification × 30%) × 80%
                    </p>
                    <div className="space-y-1">
                      <p>
                        <strong>Expense Score:</strong> 100 - Expense-to-Income ratio
                      </p>
                      <p>
                        <strong>Investment Score:</strong> Investment-to-Income ratio × 2 (capped at
                        100)
                      </p>
                      <p>
                        <strong>Diversification:</strong> Number of active asset types ÷ 5 × 100
                      </p>
                    </div>
                    <p className="text-muted-foreground">
                      A higher score indicates better financial health. Scores above 80 are
                      excellent, 60-80 are good, below 60 need improvement.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  financialStats.financialHealthScore >= 80
                    ? 'bg-green-500'
                    : financialStats.financialHealthScore >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${financialStats.financialHealthScore}%` }}
              />
            </div>
            <span className="ml-4 font-semibold">
              {financialStats.financialHealthScore >= 80
                ? 'Excellent'
                : financialStats.financialHealthScore >= 60
                  ? 'Good'
                  : 'Needs Improvement'}
            </span>
          </div>
          {financialStats.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Recommendations:
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {financialStats.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <Wallet className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(user?.monthlySalary || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Base salary</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Burn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(financialStats.monthlyBurnRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {financialStats.expenseToIncomeRatio.toFixed(1)}% of income
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(financialStats.totalInvestments)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {Object.values(financialStats.investmentsByAsset).filter((v) => v > 0).length}{' '}
              asset types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-2">
              <PieChart className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Diversification Score
              </CardTitle>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Info className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-semibold">Diversification Score</h4>
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Formula:</strong> (Number of Active Asset Types ÷ 5) × 100
                    </p>
                    <div className="space-y-1">
                      <p>
                        <strong>Asset Types:</strong> Gold, Crypto, Stocks, Mutual Funds, RDs
                      </p>
                      <p>
                        <strong>Active:</strong> Asset type with investment amount {'>'} 0
                      </p>
                    </div>
                    <div className="bg-muted p-2 rounded text-xs">
                      <p>
                        <strong>Your Score:</strong>{' '}
                        {
                          Object.values(financialStats.investmentsByAsset).filter((v) => v > 0)
                            .length
                        }
                        /5 asset types = {financialStats.diversificationScore.toFixed(0)}%
                      </p>
                    </div>
                    <p className="text-muted-foreground">
                      Higher diversification reduces investment risk. Aim for 80%+ (4-5 asset
                      types).
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {financialStats.diversificationScore.toFixed(0)}/100
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Risk Profile: {financialStats.riskProfile}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(financialStats.investmentsByAsset).map(([asset, amount]) => {
          const icons = {
            Gold: Gem,
            Cryptocurrency: Zap,
            Stocks: Building,
            'Mutual Funds': BarChart3,
            'Recurring Deposits': Banknote,
          };
          const Icon = icons[asset as keyof typeof icons] || Coins;

          return (
            <Card key={asset} className="text-center">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">{asset}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{formatCurrency(amount)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {financialStats.totalInvestments > 0
                    ? ((amount / financialStats.totalInvestments) * 100).toFixed(1) + '%'
                    : '0%'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Investment Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <HighchartsReact highcharts={Highcharts} options={assetAllocationOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <HighchartsReact highcharts={Highcharts} options={expenseDistributionOptions} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Expense Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Expense Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Frequency</th>
                  <th className="text-left p-2">Monthly Impact</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(expenses || []).map((expense) => {
                  let monthlyImpact = expense.expenseAmount;
                  switch (expense.expenseFrequency) {
                    case 'daily':
                      monthlyImpact = expense.expenseAmount * 30;
                      break;
                    case 'weekly':
                      monthlyImpact = expense.expenseAmount * 4;
                      break;
                    case 'yearly':
                      monthlyImpact = expense.expenseAmount / 12;
                      break;
                  }

                  return (
                    <tr key={expense._id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{expense.expenseName}</td>
                      <td className="p-2">{expense.tag}</td>
                      <td className="p-2">{formatCurrency(expense.expenseAmount)}</td>
                      <td className="p-2 capitalize">
                        {expense.expenseFrequency.replace('-', ' ')}
                      </td>
                      <td className="p-2">{formatCurrency(monthlyImpact)}</td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteExpense(expense._id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {expenses && expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No expenses recorded yet. Add your first expense to get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Investment Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Investment Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Asset Type</th>
                  <th className="text-left p-2">Total Investment</th>
                  <th className="text-left p-2">Portfolio %</th>
                  <th className="text-left p-2">Transactions</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(financialStats.investmentsByAsset).map(([asset, amount]) => {
                  const percentage =
                    financialStats.totalInvestments > 0
                      ? ((amount / financialStats.totalInvestments) * 100).toFixed(1)
                      : '0.0';

                  let transactionCount = 0;
                  switch (asset) {
                    case 'Gold':
                      transactionCount = goldTransactions?.length || 0;
                      break;
                    case 'Cryptocurrency':
                      transactionCount = cryptoTransactions?.length || 0;
                      break;
                    case 'Stocks':
                      transactionCount =
                        stockTransactions?.filter((tx) => tx.type !== 'debit').length || 0;
                      break;
                    case 'Mutual Funds':
                      transactionCount =
                        mutualFundTransactions?.filter((tx) => tx.type !== 'debit').length || 0;
                      break;
                    case 'Recurring Deposits':
                      transactionCount = rdData?.length || 0;
                      break;
                  }

                  const isActive = amount > 0;

                  return (
                    <tr key={asset} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{asset}</td>
                      <td className="p-2">{formatCurrency(amount)}</td>
                      <td className="p-2">{percentage}%</td>
                      <td className="p-2">{transactionCount}</td>
                      <td className="p-2">
                        <span
                          className={`flex items-center gap-1 text-xs ${isActive ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {isActive ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {isActive ? 'Active' : 'Not Started'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-semibold bg-muted/40">
                  <td className="p-2">Total Portfolio</td>
                  <td className="p-2">{formatCurrency(financialStats.totalInvestments)}</td>
                  <td className="p-2">100%</td>
                  <td className="p-2">
                    {(goldTransactions?.length || 0) +
                      (cryptoTransactions?.length || 0) +
                      (stockTransactions?.filter((tx) => tx.type !== 'debit').length || 0) +
                      (mutualFundTransactions?.filter((tx) => tx.type !== 'debit').length || 0) +
                      (rdData?.length || 0)}
                  </td>
                  <td className="p-2">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Key Financial Ratios
              </CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Financial Ratios Explained</h4>
                    <div className="text-sm space-y-3">
                      <div>
                        <p>
                          <strong>Expense-to-Income Ratio:</strong>
                        </p>
                        <p className="text-muted-foreground">
                          Monthly Expenses ÷ Monthly Income × 100
                        </p>
                        <p className="text-xs">≤50% Excellent | 51-70% Good | {'>'}70% High Risk</p>
                      </div>
                      <div>
                        <p>
                          <strong>Investment Rate:</strong>
                        </p>
                        <p className="text-muted-foreground">
                          (Total Investments ÷ 12) ÷ Monthly Income × 100
                        </p>
                        <p className="text-xs">
                          {'\u2265'}20% Excellent | 10-20% Good | {'<'}10% Low
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Monthly Surplus:</strong>
                        </p>
                        <p className="text-muted-foreground">Monthly Income - Monthly Expenses</p>
                        <p className="text-xs">Amount available for savings and investments</p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Expense-to-Income Ratio</span>
              <div className="text-right">
                <span
                  className={`font-semibold ${financialStats.expenseToIncomeRatio > 70 ? 'text-red-600' : financialStats.expenseToIncomeRatio > 50 ? 'text-yellow-600' : 'text-green-600'}`}
                >
                  {financialStats.expenseToIncomeRatio.toFixed(1)}%
                </span>
                <p className="text-xs text-muted-foreground">
                  {financialStats.expenseToIncomeRatio <= 50
                    ? 'Excellent'
                    : financialStats.expenseToIncomeRatio <= 70
                      ? 'Good'
                      : 'High'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Investment Rate</span>
              <div className="text-right">
                <span
                  className={`font-semibold ${financialStats.investmentToIncomeRatio < 10 ? 'text-red-600' : financialStats.investmentToIncomeRatio < 20 ? 'text-yellow-600' : 'text-green-600'}`}
                >
                  {financialStats.investmentToIncomeRatio.toFixed(1)}%
                </span>
                <p className="text-xs text-muted-foreground">
                  {financialStats.investmentToIncomeRatio >= 20
                    ? 'Excellent'
                    : financialStats.investmentToIncomeRatio >= 10
                      ? 'Good'
                      : 'Low'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monthly Surplus</span>
              <div className="text-right">
                <span
                  className={`font-semibold ${(user?.monthlySalary || 0) - financialStats.monthlyBurnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency((user?.monthlySalary || 0) - financialStats.monthlyBurnRate)}
                </span>
                <p className="text-xs text-muted-foreground">After expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Financial Goals Progress
              </CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Financial Goals Calculation</h4>
                    <div className="text-sm space-y-3">
                      <div>
                        <p>
                          <strong>Emergency Fund (6 months):</strong>
                        </p>
                        <p className="text-muted-foreground">
                          Monthly Surplus × 6 ÷ (Monthly Expenses × 6) × 100
                        </p>
                        <p className="text-xs">Target: Cover 6 months of expenses with savings</p>
                      </div>
                      <div>
                        <p>
                          <strong>Investment Diversification:</strong>
                        </p>
                        <p className="text-muted-foreground">
                          Number of Active Asset Types ÷ 5 × 100
                        </p>
                        <p className="text-xs">Target: Invest across 4-5 different asset classes</p>
                      </div>
                      <div>
                        <p>
                          <strong>Savings Rate Target:</strong>
                        </p>
                        <p className="text-muted-foreground">100 - Expense-to-Income Ratio</p>
                        <p className="text-xs">Target: Save at least 20% of income monthly</p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Emergency Fund (6 months)</span>
                <span className="text-sm font-semibold">
                  {(financialStats.emergencyFundRatio * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    financialStats.emergencyFundRatio >= 1 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(financialStats.emergencyFundRatio * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Investment Diversification</span>
                <span className="text-sm font-semibold">
                  {financialStats.diversificationScore.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    financialStats.diversificationScore >= 80
                      ? 'bg-green-500'
                      : financialStats.diversificationScore >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${financialStats.diversificationScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Savings Rate Target (20%)</span>
                <span className="text-sm font-semibold">
                  {Math.max(0, 100 - financialStats.expenseToIncomeRatio).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    100 - financialStats.expenseToIncomeRatio >= 20 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100 - financialStats.expenseToIncomeRatio, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
