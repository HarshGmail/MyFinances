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
import {
  useAddExpenseMutation,
  useDeleteExpenseMutation,
  useUpdateExpenseMutation,
} from '@/api/mutations';
import { Expense } from '@/api/dataInterface';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  TrendingDown,
  TrendingUp,
  Wallet,
  Trash2,
  Pencil,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ShoppingBag,
  Home,
  Zap,
  Info,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

// Types
interface MonthlyData {
  month: Date;
  monthStr: string;
  salary: number;
  actualPaid: number;
  bonus: number;
  arrears: number;
  totalInvestments: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalExpenses: number;
  discretionarySpending: number;
  savingsRate: number;
  investmentsByType: Record<string, number>;
  expensesByCategory: Record<string, number>;
}

// Form schema for expense
const expenseSchema = z.object({
  tag: z.string().min(1, 'Tag is required'),
  expenseAmount: z.number().min(0.01, 'Amount must be greater than 0'),
  expenseName: z.string().min(1, 'Name is required'),
  expenseFrequency: z.enum(['one-time', 'daily', 'weekly', 'monthly', 'yearly']),
  isFixed: z.boolean(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// Predefined tags for expenses
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

const FIXED_EXPENSE_TAGS = ['Rent', 'Insurance', 'Bills & Utilities'];

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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

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
  const { mutateAsync: updateExpense, isPending: isUpdating } = useUpdateExpenseMutation();

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
      isFixed: false,
    },
  });

  const editForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      tag: '',
      expenseAmount: 0,
      expenseName: '',
      expenseFrequency: 'one-time',
      isFixed: false,
    },
  });

  // Helper function to get salary for a specific month
  const getSalaryForMonth = (month: Date): number => {
    const salaryHistory = user?.salaryHistory || [];
    const paymentHistory = user?.paymentHistory || [];

    // Find the latest salary record that is on or before this month
    const applicableSalary = salaryHistory
      .filter((record) => new Date(record.effectiveDate) <= month)
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0];

    if (applicableSalary) return applicableSalary.baseSalary;

    // Month is before all salary history — use earliest payment record's baseAmount
    // (best approximation of what salary was before any record exists)
    if (paymentHistory.length > 0) {
      const earliest = [...paymentHistory].sort(
        (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
      )[0];
      return earliest.baseAmount;
    }

    // Last resort: earliest salary history entry or monthlySalary
    if (salaryHistory.length > 0) {
      const earliest = [...salaryHistory].sort(
        (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
      )[0];
      return earliest.baseSalary;
    }

    return user?.monthlySalary || 0;
  };

  // Helper function to get actual payment for a specific month
  const getPaymentForMonth = (month: Date) => {
    const paymentHistory = user?.paymentHistory || [];
    const monthStart = startOfMonth(month);

    const payment = paymentHistory.find(
      (p) => format(new Date(p.month), 'yyyy-MM') === format(monthStart, 'yyyy-MM')
    );

    if (payment) {
      return {
        totalPaid: payment.totalPaid,
        baseAmount: payment.baseAmount,
        bonus: payment.bonus,
        arrears: payment.arrears,
      };
    }

    // If no payment record, use effective salary
    const effectiveSalary = getSalaryForMonth(month);
    return {
      totalPaid: effectiveSalary,
      baseAmount: effectiveSalary,
      bonus: 0,
      arrears: 0,
    };
  };

  // Calculate comprehensive monthly data
  const monthlyAnalysis = useMemo(() => {
    if (!user) return [];

    // Get last 12 months
    const endDate = new Date();
    const startDate = subMonths(endDate, 11);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const monthlyData: MonthlyData[] = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthStr = format(month, 'MMM yyyy');

      // Get salary and payment info
      const effectiveSalary = getSalaryForMonth(month);
      const payment = getPaymentForMonth(month);

      // Calculate investments for this month
      const goldInv =
        goldTransactions
          ?.filter((tx) => {
            const txDate = new Date(tx.date);
            return txDate >= monthStart && txDate <= monthEnd;
          })
          .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      const cryptoInv =
        cryptoTransactions
          ?.filter((tx) => {
            const txDate = new Date(tx.date);
            return txDate >= monthStart && txDate <= monthEnd;
          })
          .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      const stockInv =
        stockTransactions
          ?.filter((tx) => {
            const txDate = new Date(tx.date);
            return txDate >= monthStart && txDate <= monthEnd && tx.type !== 'debit';
          })
          .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      const mfInv =
        mutualFundTransactions
          ?.filter((tx) => {
            const txDate = new Date(tx.date);
            return txDate >= monthStart && txDate <= monthEnd && tx.type !== 'debit';
          })
          .reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      const rdInv =
        rdData
          ?.filter((rd) => {
            const rdDate = new Date(rd.dateOfCreation);
            return rdDate >= monthStart && rdDate <= monthEnd;
          })
          .reduce((sum, rd) => sum + rd.monthlyDeposit, 0) || 0;

      const totalInvestments = goldInv + cryptoInv + stockInv + mfInv + rdInv;

      const investmentsByType: Record<string, number> = {
        Gold: goldInv,
        Crypto: cryptoInv,
        Stocks: stockInv,
        'Mutual Funds': mfInv,
        RD: rdInv,
      };

      // Calculate expenses (fixed and variable)
      let fixedExpenses = 0;
      let variableExpenses = 0;
      const expensesByCategory: Record<string, number> = {};

      expenses?.forEach((exp) => {
        let monthlyAmount = exp.expenseAmount;
        switch (exp.expenseFrequency) {
          case 'daily':
            monthlyAmount = exp.expenseAmount * 30;
            break;
          case 'weekly':
            monthlyAmount = exp.expenseAmount * 4;
            break;
          case 'yearly':
            monthlyAmount = exp.expenseAmount / 12;
            break;
        }

        const isFixed = FIXED_EXPENSE_TAGS.includes(exp.tag);

        if (isFixed) {
          fixedExpenses += monthlyAmount;
        } else {
          variableExpenses += monthlyAmount;
        }

        expensesByCategory[exp.tag] = (expensesByCategory[exp.tag] || 0) + monthlyAmount;
      });

      const totalExpenses = fixedExpenses + variableExpenses;

      // Discretionary spending = Salary - Investments - Fixed Expenses
      const discretionarySpending = Math.max(
        0,
        payment.totalPaid - totalInvestments - fixedExpenses
      );

      // Savings rate = Investments / Income * 100
      // Only money put into investments is considered saved; everything else is spent
      const savingsRate = payment.totalPaid > 0 ? (totalInvestments / payment.totalPaid) * 100 : 0;

      return {
        month,
        monthStr,
        salary: effectiveSalary,
        actualPaid: payment.totalPaid,
        bonus: payment.bonus,
        arrears: payment.arrears,
        totalInvestments,
        fixedExpenses,
        variableExpenses,
        totalExpenses,
        discretionarySpending,
        savingsRate,
        investmentsByType,
        expensesByCategory,
      };
    });

    return monthlyData.reverse(); // Most recent first
  }, [
    user,
    expenses,
    goldTransactions,
    cryptoTransactions,
    stockTransactions,
    mutualFundTransactions,
    rdData,
  ]);

  // Get current month data
  const currentMonthData = monthlyAnalysis[0] || null;

  // Overall statistics
  const overallStats = useMemo(() => {
    if (monthlyAnalysis.length === 0) {
      return {
        avgMonthlyIncome: 0,
        avgMonthlyExpenses: 0,
        avgMonthlyInvestments: 0,
        avgSavingsRate: 0,
        totalInvested: 0,
        totalExpenses: 0,
        avgDiscretionarySpending: 0,
      };
    }

    const totalIncome = monthlyAnalysis.reduce((sum, m) => sum + m.actualPaid, 0);
    const totalExpenses = monthlyAnalysis.reduce((sum, m) => sum + m.totalExpenses, 0);
    const totalInvestments = monthlyAnalysis.reduce((sum, m) => sum + m.totalInvestments, 0);
    const avgSavingsRate =
      monthlyAnalysis.reduce((sum, m) => sum + m.savingsRate, 0) / monthlyAnalysis.length;
    const avgDiscretionarySpending =
      monthlyAnalysis.reduce((sum, m) => sum + m.discretionarySpending, 0) / monthlyAnalysis.length;

    return {
      avgMonthlyIncome: totalIncome / monthlyAnalysis.length,
      avgMonthlyExpenses: totalExpenses / monthlyAnalysis.length,
      avgMonthlyInvestments: totalInvestments / monthlyAnalysis.length,
      avgSavingsRate,
      totalInvested: totalInvestments,
      totalExpenses,
      avgDiscretionarySpending,
    };
  }, [monthlyAnalysis]);

  // Prepare chart data
  const cashFlowChartOptions = useMemo(() => {
    const categories = monthlyAnalysis.map((m) => m.monthStr).reverse();
    const incomeData = monthlyAnalysis.map((m) => m.actualPaid).reverse();
    const investmentData = monthlyAnalysis.map((m) => m.totalInvestments).reverse();
    const fixedExpenseData = monthlyAnalysis.map((m) => m.fixedExpenses).reverse();
    const variableExpenseData = monthlyAnalysis.map((m) => m.variableExpenses).reverse();

    return {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        height: 400,
      },
      title: {
        text: 'Monthly Cash Flow Analysis',
        style: {
          color: theme === 'dark' ? '#fff' : '#18181b',
          fontSize: '18px',
          fontWeight: '600',
        },
      },
      xAxis: {
        categories,
        labels: {
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
        },
      },
      yAxis: {
        title: {
          text: 'Amount (₹)',
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
        },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            return '₹' + ((this.value as number) / 1000).toFixed(0) + 'k';
          },
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
        },
      },
      tooltip: {
        shared: true,
        formatter: function (this: { x: string; points?: Highcharts.Point[] }): string {
          let s = '<b>' + this.x + '</b><br/>';
          this.points?.forEach((point: Highcharts.Point) => {
            s +=
              '<span style="color:' +
              point.color +
              '">\u25CF</span> ' +
              point.series.name +
              ': ₹' +
              (point.y || 0).toLocaleString('en-IN') +
              '<br/>';
          });
          return s;
        },
      },
      plotOptions: {
        column: {
          stacking: 'normal',
        },
      },
      series: [
        {
          name: 'Income',
          data: incomeData,
          color: '#10b981',
          stack: 'income',
        },
        {
          name: 'Investments',
          data: investmentData,
          color: '#3b82f6',
          stack: 'outflow',
        },
        {
          name: 'Fixed Expenses',
          data: fixedExpenseData,
          color: '#ef4444',
          stack: 'outflow',
        },
        {
          name: 'Variable Expenses',
          data: variableExpenseData,
          color: '#f97316',
          stack: 'outflow',
        },
      ],
      credits: { enabled: false },
      legend: {
        itemStyle: {
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
    };
  }, [monthlyAnalysis, theme]);

  const savingsRateChartOptions = useMemo(() => {
    const categories = monthlyAnalysis.map((m) => m.monthStr).reverse();
    const savingsData = monthlyAnalysis.map((m) => m.savingsRate).reverse();

    return {
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        height: 300,
      },
      title: {
        text: 'Savings Rate Trend',
        style: {
          color: theme === 'dark' ? '#fff' : '#18181b',
          fontSize: '16px',
          fontWeight: '600',
        },
      },
      xAxis: {
        categories,
        labels: {
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
        },
      },
      yAxis: {
        title: {
          text: 'Savings Rate (%)',
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
        },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            return (this.value as number).toFixed(0) + '%';
          },
          style: { color: theme === 'dark' ? '#fff' : '#18181b' },
        },
        plotLines: [
          {
            value: 70,
            color: '#10b981',
            dashStyle: 'Dash',
            width: 2,
            label: {
              text: 'Target: 70%',
              style: { color: theme === 'dark' ? '#fff' : '#18181b' },
            },
          },
        ],
      },
      series: [
        {
          name: 'Savings Rate',
          data: savingsData,
          color: '#8b5cf6',
          marker: {
            enabled: true,
            radius: 4,
          },
        },
      ],
      credits: { enabled: false },
      legend: {
        enabled: false,
      },
    };
  }, [monthlyAnalysis, theme]);

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

  // Handle edit expense
  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    editForm.reset({
      tag: expense.tag,
      expenseAmount: expense.expenseAmount,
      expenseName: expense.expenseName,
      expenseFrequency: expense.expenseFrequency as ExpenseFormValues['expenseFrequency'],
      isFixed: expense.isFixed ?? false,
    });
  };

  const onEditSubmit = async (values: ExpenseFormValues) => {
    if (!editingExpense) return;
    try {
      await updateExpense({ id: editingExpense._id, data: values });
      toast.success('Expense updated successfully');
      setEditingExpense(null);
      refetch();
    } catch {
      toast.error('Failed to update expense');
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
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
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your income, investments, and spending patterns
          </p>
        </div>
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

      {/* Current Month Overview */}
      {currentMonthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Month Income
                </CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentMonthData.actualPaid)}
              </div>
              {currentMonthData.bonus > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Includes ₹{currentMonthData.bonus.toLocaleString('en-IN')} bonus
                </p>
              )}
              {currentMonthData.arrears > 0 && (
                <p className="text-xs text-muted-foreground">
                  + ₹{currentMonthData.arrears.toLocaleString('en-IN')} arrears
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Investments
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(currentMonthData.totalInvestments)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((currentMonthData.totalInvestments / currentMonthData.actualPaid) * 100).toFixed(
                  1
                )}
                % of income
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(currentMonthData.totalExpenses)}
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-muted-foreground">
                  Fixed: ₹{currentMonthData.fixedExpenses.toLocaleString('en-IN')}
                </span>
                <span className="text-muted-foreground">
                  Variable: ₹{currentMonthData.variableExpenses.toLocaleString('en-IN')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Discretionary Spending
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(currentMonthData.discretionarySpending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">After investments & fixed costs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Avg Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(overallStats.avgMonthlyIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 12 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Avg Monthly Investments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(overallStats.avgMonthlyInvestments)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatCurrency(overallStats.totalInvested)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              Avg Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(overallStats.avgMonthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatCurrency(overallStats.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Avg Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">
              {overallStats.avgSavingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: 70% • {overallStats.avgSavingsRate >= 70 ? '✓ On track' : '⚠ Below target'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <HighchartsReact highcharts={Highcharts} options={cashFlowChartOptions} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <HighchartsReact highcharts={Highcharts} options={savingsRateChartOptions} />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Breakdown
            </CardTitle>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthlyAnalysis.map((m) => (
                  <SelectItem key={m.monthStr} value={m.monthStr}>
                    {m.monthStr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyAnalysis
              .filter((m) => selectedMonth === 'all' || m.monthStr === selectedMonth)
              .map((monthData) => (
                <div
                  key={monthData.monthStr}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{monthData.monthStr}</h3>
                    <Badge
                      variant={monthData.savingsRate >= 20 ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {monthData.savingsRate.toFixed(1)}% Savings
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Income</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(monthData.actualPaid)}
                      </p>
                      {monthData.bonus > 0 && (
                        <p className="text-xs text-green-600">
                          +₹{monthData.bonus.toLocaleString('en-IN')} bonus
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Investments</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(monthData.totalInvestments)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((monthData.totalInvestments / monthData.actualPaid) * 100).toFixed(1)}% of
                        income
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Fixed Expenses</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(monthData.fixedExpenses)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Home className="h-3 w-3" />
                        Rent, Bills, etc.
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Discretionary</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(monthData.discretionarySpending)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        After fixed costs
                      </p>
                    </div>
                  </div>

                  {/* Investment Breakdown */}
                  {monthData.totalInvestments > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Investment Breakdown:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(monthData.investmentsByType)
                          .filter(([, amount]) => amount > 0)
                          .map(([type, amount]) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}: ₹{amount.toLocaleString('en-IN')}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Expense Breakdown */}
                  {monthData.totalExpenses > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Expense Breakdown:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(monthData.expensesByCategory)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([category, amount]) => (
                            <Badge key={category} variant="secondary" className="text-xs">
                              {category}: ₹{amount.toLocaleString('en-IN')}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
                name="expenseFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
              <Button type="submit" className="w-full" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
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
                  <th className="text-left p-2">Type</th>
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

                  const isFixed = FIXED_EXPENSE_TAGS.includes(expense.tag);

                  return (
                    <tr key={expense._id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{expense.expenseName}</td>
                      <td className="p-2">{expense.tag}</td>
                      <td className="p-2">{formatCurrency(expense.expenseAmount)}</td>
                      <td className="p-2 capitalize">
                        {expense.expenseFrequency.replace('-', ' ')}
                      </td>
                      <td className="p-2">
                        <Badge variant={isFixed ? 'default' : 'secondary'} className="text-xs">
                          {isFixed ? 'Fixed' : 'Variable'}
                        </Badge>
                      </td>
                      <td className="p-2">{formatCurrency(monthlyImpact)}</td>
                      <td className="p-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditClick(expense)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
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
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      No expenses recorded yet. Add your first expense to get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
