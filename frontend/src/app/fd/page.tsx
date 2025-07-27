'use client';

import { useFixedDepositsQuery } from '@/api/query';
import { useFixedDepositMutation } from '@/api/mutations/fixed-deposits';
import { FixedDeposit, FixedDepositPayload } from '@/api/dataInterface';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { differenceInDays } from 'date-fns';
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

export default function FixedDepositPage() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const form = useForm<FixedDepositPayload>({
    resolver: zodResolver(
      z.object({
        fixedDepositName: z.string().min(1, 'FD name is required'),
        amountInvested: z.number().min(1, 'Amount must be greater than 0'),
        rateOfInterest: z.number().min(0.1, 'Interest rate is required'),
        platform: z.string().optional(),
        dateOfCreation: z.string().min(1, 'Creation date is required'),
        dateOfMaturity: z.string().min(1, 'Maturity date is required'),
      })
    ),
    defaultValues: {
      fixedDepositName: '',
      amountInvested: 0,
      rateOfInterest: 0,
      platform: '',
      dateOfCreation: '',
      dateOfMaturity: '',
    },
  });

  const { mutateAsync: addFixedDeposit, isPending } = useFixedDepositMutation();
  const { data: fdData, refetch, isLoading, error } = useFixedDepositsQuery();

  // Process FD data for calculations
  const processedFDData = useMemo(() => {
    if (!fdData || fdData.length === 0) return [];

    return fdData.map((fd) => {
      const creationDate = new Date(fd.dateOfCreation);
      const maturityDate = new Date(fd.dateOfMaturity);
      const currentDate = new Date();

      const totalDays = differenceInDays(maturityDate, creationDate);
      const daysCompleted = Math.min(differenceInDays(currentDate, creationDate), totalDays);
      const daysRemaining = Math.max(totalDays - daysCompleted, 0);

      const annualRate = fd.rateOfInterest / 100;
      const totalInterest = (fd.amountInvested * annualRate * totalDays) / 365;
      const currentInterest = (fd.amountInvested * annualRate * daysCompleted) / 365;
      const maturityAmount = fd.amountInvested + totalInterest;
      const currentValue = fd.amountInvested + currentInterest;

      const isMatured = currentDate >= maturityDate;
      const progressPercentage = (daysCompleted / totalDays) * 100;

      return {
        ...fd,
        totalDays,
        daysCompleted,
        daysRemaining,
        totalInterest,
        currentInterest,
        maturityAmount,
        currentValue,
        isMatured,
        progressPercentage: Math.min(progressPercentage, 100),
        annualRate,
      };
    });
  }, [fdData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!processedFDData.length) {
      return {
        totalInvested: 0,
        totalCurrentValue: 0,
        totalInterestEarned: 0,
        totalMaturityValue: 0,
        averageRate: 0,
        activeFDs: 0,
        maturedFDs: 0,
      };
    }

    const totalInvested = processedFDData.reduce((sum, fd) => sum + fd.amountInvested, 0);
    const totalCurrentValue = processedFDData.reduce((sum, fd) => sum + fd.currentValue, 0);
    const totalInterestEarned = processedFDData.reduce((sum, fd) => sum + fd.currentInterest, 0);
    const totalMaturityValue = processedFDData.reduce((sum, fd) => sum + fd.maturityAmount, 0);
    const averageRate =
      processedFDData.reduce((sum, fd) => sum + fd.annualRate, 0) / processedFDData.length;
    const activeFDs = processedFDData.filter((fd) => !fd.isMatured).length;
    const maturedFDs = processedFDData.filter((fd) => fd.isMatured).length;

    return {
      totalInvested,
      totalCurrentValue,
      totalInterestEarned,
      totalMaturityValue,
      averageRate: averageRate * 100,
      activeFDs,
      maturedFDs,
    };
  }, [processedFDData]);

  // Chart data for FD timeline
  const chartData = useMemo(() => {
    if (!processedFDData.length) return null;

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

    return processedFDData.map((fd, index) => {
      const creationTime = new Date(fd.dateOfCreation).getTime();
      const maturityTime = new Date(fd.dateOfMaturity).getTime();
      const currentTime = new Date().getTime();
      const endTime = Math.min(currentTime, maturityTime);

      return {
        name: fd.fixedDepositName,
        data: [
          [creationTime, fd.amountInvested],
          [endTime, fd.currentValue],
          [maturityTime, fd.maturityAmount],
        ],
        color: colors[index % colors.length],
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 4,
        },
      };
    });
  }, [processedFDData]);

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
        text: 'Fixed Deposit Growth Timeline',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: isDark ? '#fff' : '#374151',
        },
      },
      subtitle: {
        text: 'Investment growth from creation to maturity',
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

  const onSubmit = async (values: FixedDepositPayload) => {
    try {
      // Convert date format from DDMMYYYY to ISO format for submission
      const submissionValues = {
        ...values,
        dateOfCreation: convertToISODate(values.dateOfCreation),
        dateOfMaturity: convertToISODate(values.dateOfMaturity),
      };

      await addFixedDeposit(submissionValues);
      setDialogOpen(false);
      toast.success('Fixed Deposit added successfully');
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

  const handleAddFDClick = () => {
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
          <h1 className="text-3xl font-bold text-center flex-1">Fixed Deposits</h1>
        </div>
        <div className="text-red-500 text-center">Error loading Fixed Deposit data</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header with Title and Add Button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center flex-1">Fixed Deposits</h1>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full w-[35%] ml-auto">
            <DrawerHeader className="border-b">
              <div className="flex justify-between items-center">
                <DrawerTitle>Fixed Deposits</DrawerTitle>
                <Button size="icon" variant="outline" onClick={handleAddFDClick}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {fdData?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <p>No Fixed Deposits added yet</p>
                  <p className="text-sm">Click the + button to add your first FD</p>
                </div>
              ) : (
                fdData?.map((fd: FixedDeposit) => (
                  <Card key={fd._id} className="hover:shadow-md transition">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="font-medium text-base">{fd.fixedDepositName}</div>
                        <div className="text-sm text-muted-foreground">
                          Amount: ₹{fd.amountInvested.toLocaleString('en-IN')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Rate: {fd.rateOfInterest}% per annum
                        </div>
                        {fd.platform && (
                          <div className="text-sm text-muted-foreground">
                            Platform: {fd.platform}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(fd.dateOfCreation).toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Maturity: {new Date(fd.dateOfMaturity).toLocaleDateString('en-IN')}
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

      {/* Add Fixed Deposit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fixed Deposit</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4 py-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="fixedDepositName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FD Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SBI FD 2024" {...field} />
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
                    <FormLabel>Rate of Interest (%)</FormLabel>
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
                {isPending ? 'Adding...' : 'Add Fixed Deposit'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Summary Cards and Content */}
      {fdData && fdData.length > 0 && (
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
                <div className="text-2xl font-bold text-green-600">
                  {summaryStats.averageRate.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Chart */}
          {chartData && chartOptions && (
            <Card>
              <CardHeader>
                <CardTitle>Fixed Deposit Timeline</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Growth timeline from creation to maturity for all FDs
                </p>
              </CardHeader>
              <CardContent>
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              </CardContent>
            </Card>
          )}

          {/* FD Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Fixed Deposit Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete overview of all your fixed deposits
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>FD Name</TableHead>
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
                    {processedFDData.map((fd) => (
                      <TableRow key={fd._id}>
                        <TableCell className="font-medium">{fd.fixedDepositName}</TableCell>
                        <TableCell>{fd.platform || '-'}</TableCell>
                        <TableCell>₹{fd.amountInvested.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{fd.rateOfInterest}%</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ₹{Math.round(fd.currentValue).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-blue-600 font-medium">
                          ₹{Math.round(fd.maturityAmount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-purple-600 font-medium">
                          ₹{Math.round(fd.currentInterest).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${fd.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(fd.progressPercentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              fd.isMatured
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {fd.isMatured ? 'Matured' : 'Active'}
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
      {fdData && fdData.length === 0 && (
        <div className="text-center text-muted-foreground">
          No Fixed Deposits found. Add some FDs to see your portfolio.
        </div>
      )}
    </div>
  );
}
