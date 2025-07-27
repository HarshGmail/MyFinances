'use client';

import { useRecurringDepositsQuery } from '@/api/query';
import { useRecurringDepositMutation } from '@/api/mutations/recurring-deposits';
import { RecurringDeposit, RecurringDepositPayload } from '@/api/dataInterface';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { differenceInDays, differenceInMonths } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { OtpDateInput } from '@/components/ui/otp-date-input';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAppStore } from '@/store/useAppStore';

// Helper function to convert DDMMYYYY to YYYY-MM-DD
const convertToISODate = (dateStr: string) => {
  if (dateStr.length !== 8) return '';
  const day = dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const year = dateStr.substring(4, 8);
  return `${year}-${month}-${day}`;
};

// Helper function to calculate compound interest for RD (quarterly compounding)
const calculateCompoundInterest = (principal: number, rate: number, timeInMonths: number) => {
  const quarterlyRate = rate / 400; // Convert annual rate to quarterly decimal
  const quarters = Math.floor(timeInMonths / 3);
  const remainingMonths = timeInMonths % 3;

  // Calculate compound interest for complete quarters
  let amount = principal * Math.pow(1 + quarterlyRate, quarters);

  // Add simple interest for remaining months (less than a quarter)
  if (remainingMonths > 0) {
    const monthlyRate = rate / 1200; // Monthly rate
    amount = amount * (1 + monthlyRate * remainingMonths);
  }

  return amount - principal; // Return interest only
};

export default function RecurringDepositPage() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const form = useForm<RecurringDepositPayload>({
    resolver: zodResolver(
      z.object({
        recurringDepositName: z.string().min(1, 'RD name is required'),
        amountInvested: z.number().min(1, 'Amount must be greater than 0'),
        rateOfInterest: z.number().min(0.1, 'Interest rate is required'),
        platform: z.string().optional(),
        dateOfCreation: z.string().min(1, 'Creation date is required'),
        dateOfMaturity: z.string().min(1, 'Maturity date is required'),
      })
    ),
    defaultValues: {
      recurringDepositName: '',
      amountInvested: 0,
      rateOfInterest: 0,
      platform: '',
      dateOfCreation: '',
      dateOfMaturity: '',
    },
  });

  const { mutateAsync: addRecurringDeposit, isPending } = useRecurringDepositMutation();
  const { data: rdData, refetch, isLoading, error } = useRecurringDepositsQuery();

  // Process RD data for calculations with compound interest
  const processedRDData = useMemo(() => {
    if (!rdData || rdData.length === 0) return [];

    return rdData.map((rd) => {
      const creationDate = new Date(rd.dateOfCreation);
      const maturityDate = new Date(rd.dateOfMaturity);
      const currentDate = new Date();

      const totalDays = differenceInDays(maturityDate, creationDate);
      const daysCompleted = Math.min(differenceInDays(currentDate, creationDate), totalDays);
      const daysRemaining = Math.max(totalDays - daysCompleted, 0);

      // Calculate total months and current months for compound interest
      const totalMonths = differenceInMonths(maturityDate, creationDate);
      const monthsCompleted = Math.min(differenceInMonths(currentDate, creationDate), totalMonths);

      // Calculate compound interest
      const totalInterest = calculateCompoundInterest(
        rd.amountInvested,
        rd.rateOfInterest,
        totalMonths
      );
      const currentInterest = calculateCompoundInterest(
        rd.amountInvested,
        rd.rateOfInterest,
        monthsCompleted
      );

      const maturityAmount = rd.amountInvested + totalInterest;
      const currentValue = rd.amountInvested + currentInterest;

      const isMatured = currentDate >= maturityDate;
      const progressPercentage = (daysCompleted / totalDays) * 100;

      return {
        ...rd,
        totalDays,
        daysCompleted,
        daysRemaining,
        totalMonths,
        monthsCompleted,
        totalInterest,
        currentInterest,
        maturityAmount,
        currentValue,
        isMatured,
        progressPercentage: Math.min(progressPercentage, 100),
        annualRate: rd.rateOfInterest / 100,
      };
    });
  }, [rdData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!processedRDData.length) {
      return {
        totalInvested: 0,
        totalCurrentValue: 0,
        totalInterestEarned: 0,
        totalMaturityValue: 0,
        averageRate: 0,
        activeRDs: 0,
        maturedRDs: 0,
      };
    }

    const totalInvested = processedRDData.reduce((sum, rd) => sum + rd.amountInvested, 0);
    const totalCurrentValue = processedRDData.reduce((sum, rd) => sum + rd.currentValue, 0);
    const totalInterestEarned = processedRDData.reduce((sum, rd) => sum + rd.currentInterest, 0);
    const totalMaturityValue = processedRDData.reduce((sum, rd) => sum + rd.maturityAmount, 0);
    const averageRate =
      processedRDData.reduce((sum, rd) => sum + rd.annualRate, 0) / processedRDData.length;
    const activeRDs = processedRDData.filter((rd) => !rd.isMatured).length;
    const maturedRDs = processedRDData.filter((rd) => rd.isMatured).length;

    return {
      totalInvested,
      totalCurrentValue,
      totalInterestEarned,
      totalMaturityValue,
      averageRate: averageRate * 100,
      activeRDs,
      maturedRDs,
    };
  }, [processedRDData]);

  // Chart data for RD timeline with quarterly compound interest points
  const chartData = useMemo(() => {
    if (!processedRDData.length) return null;

    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E9',
      '#F8C471',
      '#82E0AA',
    ];

    return processedRDData.map((rd, index) => {
      const creationTime = new Date(rd.dateOfCreation).getTime();
      const maturityTime = new Date(rd.dateOfMaturity).getTime();
      const currentTime = new Date().getTime();

      // Create quarterly points for compound interest visualization
      const dataPoints = [];
      const startDate = new Date(rd.dateOfCreation);
      const endDate = new Date(Math.min(currentTime, maturityTime));

      // Add starting point
      dataPoints.push([creationTime, rd.amountInvested]);

      // Add quarterly compound points
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthsFromStart = differenceInMonths(currentDate, startDate);
        if (monthsFromStart > 0 && monthsFromStart % 3 === 0) {
          const interestAtPoint = calculateCompoundInterest(
            rd.amountInvested,
            rd.rateOfInterest,
            monthsFromStart
          );
          dataPoints.push([currentDate.getTime(), rd.amountInvested + interestAtPoint]);
        }
        currentDate.setMonth(currentDate.getMonth() + 3);
      }

      // Add current point if not matured
      if (currentTime < maturityTime) {
        dataPoints.push([currentTime, rd.currentValue]);
      }

      // Add maturity point
      dataPoints.push([maturityTime, rd.maturityAmount]);

      return {
        name: rd.recurringDepositName,
        data: dataPoints,
        color: colors[index % colors.length],
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 4,
        },
      };
    });
  }, [processedRDData]);

  // Chart configuration
  const chartOptions = useMemo(() => {
    if (!chartData) return null;

    return {
      chart: {
        type: 'line',
        height: 500,
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'inherit',
        },
      },
      title: {
        text: 'Recurring Deposit Growth Timeline',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: isDark ? '#fff' : '#374151',
        },
      },
      subtitle: {
        text: 'Investment growth with quarterly compound interest',
        style: {
          color: isDark ? '#d1d5db' : '#6b7280',
        },
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Timeline',
          style: {
            color: isDark ? '#fff' : '#374151',
          },
        },
        labels: {
          style: {
            color: isDark ? '#d1d5db' : '#6b7280',
          },
        },
        gridLineWidth: 1,
        gridLineColor: isDark ? '#374151' : '#e5e7eb',
        lineColor: isDark ? '#4b5563' : '#d1d5db',
      },
      yAxis: {
        title: {
          text: 'Amount (₹)',
          style: {
            color: isDark ? '#fff' : '#374151',
          },
        },
        labels: {
          style: {
            color: isDark ? '#d1d5db' : '#6b7280',
          },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return '₹' + Highcharts.numberFormat(this.value as number, 0);
          },
        },
        gridLineWidth: 1,
        gridLineColor: isDark ? '#374151' : '#e5e7eb',
      },
      tooltip: {
        shared: false,
        backgroundColor: isDark ? '#1f2937' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? '#4b5563' : '#d1d5db',
        borderRadius: 8,
        shadow: true,
        useHTML: true,
        style: {
          color: isDark ? '#fff' : '#374151',
        },
        // @ts-expect-error highcharts
        formatter: function (this: Highcharts.TooltipFormatterContextObject) {
          return `<b style="color: ${isDark ? '#fff' : '#374151'}">${this.series.name}</b><br/>
                  <b>${Highcharts.dateFormat('%e %b %Y', this.x as number)}</b><br/>
                  Amount: <b>₹${Highcharts.numberFormat(this.y as number, 2)}</b>`;
        },
      },
      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        itemStyle: {
          fontSize: '12px',
          color: isDark ? '#d1d5db' : '#6b7280',
        },
        itemHoverStyle: {
          color: isDark ? '#fff' : '#374151',
        },
      },
      plotOptions: {
        line: {
          animation: {
            duration: 1000,
          },
          marker: {
            enabled: true,
            radius: 4,
          },
          states: {
            hover: {
              lineWidth: 4,
            },
          },
        },
      },
      series: chartData,
      credits: {
        enabled: false,
      },
    };
  }, [chartData, isDark]);

  const onSubmit = async (values: RecurringDepositPayload) => {
    try {
      // Convert date format from DDMMYYYY to ISO format for submission
      const submissionValues = {
        ...values,
        dateOfCreation: convertToISODate(values.dateOfCreation),
        dateOfMaturity: convertToISODate(values.dateOfMaturity),
      };

      await addRecurringDeposit(submissionValues);
      setDialogOpen(false);
      toast.success('Recurring Deposit added successfully');
      form.reset();
      await refetch();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('An unknown error occurred');
      }
    }
  };

  const handleAddRDClick = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setDialogOpen(true);
    }, 150);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-9 w-32 mx-auto" />
          <Skeleton className="h-10 w-10" />
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        </div>

        {/* Chart Skeleton */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[500px]" />
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-9 gap-4 pb-2 border-b">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-20" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-9 gap-4 py-2">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-16" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-center flex-1">Recurring Deposits</h1>
        </div>
        <div className="text-red-500 text-center">Error loading Recurring Deposit data</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header with Title and Add Button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center flex-1">Recurring Deposits</h1>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full w-[35%] ml-auto">
            <DrawerHeader className="border-b">
              <div className="flex justify-between items-center">
                <DrawerTitle>Recurring Deposits</DrawerTitle>
                <Button size="icon" variant="outline" onClick={handleAddRDClick}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {rdData?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <p>No Recurring Deposits added yet</p>
                  <p className="text-sm">Click the + button to add your first RD</p>
                </div>
              ) : (
                rdData?.map((rd: RecurringDeposit) => (
                  <Card key={rd._id} className="hover:shadow-md transition">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="font-medium text-base">{rd.recurringDepositName}</div>
                        <div className="text-sm text-muted-foreground">
                          Amount: ₹{rd.amountInvested.toLocaleString('en-IN')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Rate: {rd.rateOfInterest}% per annum (Compound)
                        </div>
                        {rd.platform && (
                          <div className="text-sm text-muted-foreground">
                            Platform: {rd.platform}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(rd.dateOfCreation).toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Maturity: {new Date(rd.dateOfMaturity).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Add Recurring Deposit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Recurring Deposit</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4 py-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="recurringDepositName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RD Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SBI RD 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amountInvested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Invested</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="100000"
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Remove leading zeros and convert to number
                          const cleanValue = value.replace(/^0+/, '') || '0';
                          field.onChange(parseFloat(cleanValue) || 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rateOfInterest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate of Interest (% per annum)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="7.5"
                        type="number"
                        step="0.1"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Remove leading zeros and convert to number, allowing decimals
                          const cleanValue = value.replace(/^0+(?=\d)/, '');
                          field.onChange(parseFloat(cleanValue) || 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SBI, HDFC Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfCreation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creation Date (DD-MM-YYYY)</FormLabel>
                    <FormControl>
                      <OtpDateInput
                        value={field.value}
                        onChange={field.onChange}
                        className="justify-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfMaturity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maturity Date (DD-MM-YYYY)</FormLabel>
                    <FormControl>
                      <OtpDateInput
                        value={field.value}
                        onChange={field.onChange}
                        className="justify-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Adding...' : 'Add Recurring Deposit'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Summary Cards and Content */}
      {rdData && rdData.length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invested
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{summaryStats.totalInvested.toLocaleString('en-IN')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{summaryStats.totalCurrentValue.toLocaleString('en-IN')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Interest Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  ₹{summaryStats.totalInterestEarned.toLocaleString('en-IN')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {summaryStats.averageRate.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Chart */}
          {chartData && chartOptions && (
            <Card>
              <CardHeader>
                <CardTitle>Recurring Deposit Timeline</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Growth timeline with quarterly compound interest for all RDs
                </p>
              </CardHeader>
              <CardContent>
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              </CardContent>
            </Card>
          )}

          {/* RD Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recurring Deposit Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete overview of all your recurring deposits with compound interest
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RD Name</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Rate (%)</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>Maturity Amount</TableHead>
                      <TableHead>Interest Earned</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRDData.map((rd) => (
                      <TableRow key={rd._id}>
                        <TableCell className="font-medium">{rd.recurringDepositName}</TableCell>
                        <TableCell>{rd.platform || '-'}</TableCell>
                        <TableCell>₹{rd.amountInvested.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{rd.rateOfInterest}% (Compound)</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ₹{Math.round(rd.currentValue).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-blue-600 font-medium">
                          ₹{Math.round(rd.maturityAmount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-purple-600 font-medium">
                          ₹{Math.round(rd.currentInterest).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${rd.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(rd.progressPercentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rd.isMatured
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {rd.isMatured ? 'Matured' : 'Active'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {rdData && rdData.length === 0 && (
        <div className="text-center text-muted-foreground">
          No Recurring Deposits found. Add some RDs to see your portfolio.
        </div>
      )}
    </div>
  );
}
