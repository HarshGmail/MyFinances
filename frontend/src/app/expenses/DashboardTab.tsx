'use client';

import { useState } from 'react';
import {
  useAddExpenseMutation,
  useDeleteExpenseMutation,
  useUpdateExpenseMutation,
} from '@/api/mutations';
import { Expense } from '@/api/dataInterface';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrency } from '@/utils/numbers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
} from 'lucide-react';
import {
  expenseSchema,
  ExpenseFormValues,
  EXPENSE_TAGS,
  FIXED_EXPENSE_TAGS,
  EXPENSE_FREQUENCIES,
  MonthlyData,
} from './types';

interface DashboardTabProps {
  expenses: Expense[] | undefined;
  monthlyAnalysis: MonthlyData[];
  currentMonthData: MonthlyData | null;
  overallStats: {
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    avgMonthlyInvestments: number;
    avgSavingsRate: number;
    totalInvested: number;
    totalExpenses: number;
    avgDiscretionarySpending: number;
  };
  cashFlowChartOptions: object;
  savingsRateChartOptions: object;
}

export function DashboardTab({
  expenses,
  monthlyAnalysis,
  currentMonthData,
  overallStats,
  cashFlowChartOptions,
  savingsRateChartOptions,
}: DashboardTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const { mutateAsync: addExpense, isPending: isAdding } = useAddExpenseMutation();
  const { mutate: deleteExpense } = useDeleteExpenseMutation();
  const { mutateAsync: updateExpense, isPending: isUpdating } = useUpdateExpenseMutation();

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

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      await addExpense(values);
      toast.success('Expense added successfully');
      form.reset();
      setDrawerOpen(false);
    } catch {
      toast.error('Failed to add expense');
    }
  };

  const handleDeleteExpense = (id: string) => {
    deleteExpense(id, {
      onSuccess: () => toast.success('Deleted successfully'),
      onError: () => toast.error('Failed to delete'),
    });
  };

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
    } catch {
      toast.error('Failed to update expense');
    }
  };

  return (
    <>
      {/* Add Expense Drawer trigger */}
      <div className="flex justify-end">
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
    </>
  );
}
