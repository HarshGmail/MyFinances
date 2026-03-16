'use client';

import { useState, useRef, useEffect } from 'react';
import {
  useAddExpenseTransactionMutation,
  useUpdateExpenseTransactionMutation,
  useDeleteExpenseTransactionMutation,
} from '@/api/mutations';
import { ExpenseTransaction } from '@/api/dataInterface';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
import { Pencil, Trash2, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { trackerSchema, TrackerFormValues, EXPENSE_TAGS } from './types';

interface TrackerTabProps {
  expenseTransactions: ExpenseTransaction[] | undefined;
  expenseNames: string[] | undefined;
  isLoading: boolean;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  timelineOptions: object;
  categoryOptions: object;
  monthlyOptions: object;
  stats: { toDay: number; thisWeek: number; thisMonth: number; total: number };
}

export function TrackerTab({
  expenseTransactions,
  expenseNames,
  isLoading,
  drawerOpen,
  onDrawerOpenChange,
  timelineOptions,
  categoryOptions,
  monthlyOptions,
  stats,
}: TrackerTabProps) {
  const [editingTransaction, setEditingTransaction] = useState<ExpenseTransaction | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { mutateAsync: addTransaction, isPending: isAdding } = useAddExpenseTransactionMutation();
  const { mutateAsync: updateTransaction, isPending: isUpdating } =
    useUpdateExpenseTransactionMutation();
  const { mutate: deleteTransaction } = useDeleteExpenseTransactionMutation();

  const form = useForm<TrackerFormValues>({
    resolver: zodResolver(trackerSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      name: '',
      amount: 0,
      category: '',
      notes: '',
    },
  });

  const editForm = useForm<TrackerFormValues>({
    resolver: zodResolver(trackerSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      name: '',
      amount: 0,
      category: '',
      notes: '',
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNameInput = (value: string) => {
    form.setValue('name', value);
    if (value.length > 0 && expenseNames) {
      const matches = expenseNames.filter((n) => n.toLowerCase().includes(value.toLowerCase()));
      setNameSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const onSubmit = async (values: TrackerFormValues) => {
    try {
      await addTransaction(values);
      toast.success('Expense logged');
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        name: '',
        amount: 0,
        category: '',
        notes: '',
      });
      onDrawerOpenChange(false);
    } catch {
      toast.error('Failed to log expense');
    }
  };

  const onEditSubmit = async (values: TrackerFormValues) => {
    if (!editingTransaction) return;
    try {
      await updateTransaction({ id: editingTransaction._id, data: values });
      toast.success('Updated successfully');
      setEditingTransaction(null);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id, {
      onSuccess: () => toast.success('Deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  const handleEditClick = (tx: ExpenseTransaction) => {
    setEditingTransaction(tx);
    editForm.reset({
      date: format(new Date(tx.date), 'yyyy-MM-dd'),
      name: tx.name,
      amount: tx.amount,
      category: tx.category,
      notes: tx.notes ?? '',
    });
  };

  const txList = expenseTransactions || [];

  return (
    <>
      {/* Log Expense Drawer */}
      <Drawer open={drawerOpen} onOpenChange={onDrawerOpenChange}>
        <DrawerContent className="h-full w-[400px] ml-auto">
          <DrawerHeader>
            <DrawerTitle>Log Expense</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Name</FormLabel>
                      <FormControl>
                        <div className="relative" ref={suggestionsRef}>
                          <Input
                            placeholder="e.g., Doctor visit, Amazon order"
                            {...field}
                            onChange={(e) => handleNameInput(e.target.value)}
                            onFocus={() => {
                              if (nameSuggestions.length > 0) setShowSuggestions(true);
                            }}
                            autoComplete="off"
                          />
                          {showSuggestions && nameSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                              {nameSuggestions.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                                  onMouseDown={() => {
                                    form.setValue('name', s);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Any details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isAdding}>
                  {isAdding ? 'Saving...' : 'Log Expense'}
                </Button>
              </form>
            </Form>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(o) => !o && setEditingTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.toDay)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats.thisWeek)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.thisMonth)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">All Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.total)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {txList.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <HighchartsReact highcharts={Highcharts} options={timelineOptions} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <HighchartsReact highcharts={Highcharts} options={categoryOptions} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-4">
              <HighchartsReact highcharts={Highcharts} options={monthlyOptions} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No expenses logged yet</p>
            <p className="text-sm mt-1">Hit &quot;Log Expense&quot; to start tracking</p>
          </CardContent>
        </Card>
      )}

      {/* Transactions table */}
      {txList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Logged Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Notes</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txList.map((tx) => (
                      <tr key={tx._id} className="border-b hover:bg-muted/50">
                        <td className="p-2 whitespace-nowrap">
                          {format(new Date(tx.date), 'dd MMM yyyy')}
                        </td>
                        <td className="p-2">{tx.name}</td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-xs">
                            {tx.category}
                          </Badge>
                        </td>
                        <td className="p-2 font-medium">{formatCurrency(tx.amount)}</td>
                        <td className="p-2 text-muted-foreground text-xs">{tx.notes || '—'}</td>
                        <td className="p-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(tx)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(tx._id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
