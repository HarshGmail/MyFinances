'use client';

import { useEpfQuery, useEpfTimelineQuery } from '@/api/query';
import { useAddEpfAccountMutation } from '@/api/mutations';
import { EpfAccountPayload } from '@/api/dataInterface';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { format } from 'date-fns';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function EPFPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const form = useForm<EpfAccountPayload>({
    resolver: zodResolver(
      z.object({
        organizationName: z.string().min(1, 'Organization name is required'),
        epfAmount: z.number().min(1, 'EPF amount must be greater than 0'),
        creditDay: z.number().min(1).max(31),
        startDate: z.date(),
      })
    ),
    defaultValues: {
      organizationName: '',
      epfAmount: 0,
      creditDay: 5,
      startDate: new Date(),
    },
  });

  const { mutateAsync: addAccount, isPending } = useAddEpfAccountMutation();
  const { data, refetch, isLoading: epfLoading, error: epfError } = useEpfQuery();
  const {
    data: timelineData,
    refetch: refetchTimeline,
    isLoading: timelineLoading,
    error: timelineError,
  } = useEpfTimelineQuery();

  // Loading and error states
  const isLoading = epfLoading || timelineLoading;
  const error = epfError || timelineError;

  // EPF calculation logic (CORRECTED FOR MONTHLY CONTRIBUTIONS)
  const calculateEPFGrowth = () => {
    if (!data || data.length === 0) return { yearlyData: [], summary: null };

    // Sort accounts by start date
    const sortedAccounts = [...data].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const EPF_RATE = 8.25 / 100; // 8.25% annual interest
    const RETIREMENT_AGE = 58;
    const currentYear = new Date().getFullYear();

    // Assuming user is currently 25 (you can make this dynamic)
    const assumedCurrentAge = 25;
    const retirementYear = currentYear + (RETIREMENT_AGE - assumedCurrentAge);

    let totalBalance = 0;
    const yearlyData = [];
    let totalContributed = 0;

    // Calculate growth year by year
    for (let year = currentYear; year <= Math.min(retirementYear, 2060); year++) {
      let monthlyContribution = 0;

      // Find which account is active in this year
      for (let i = 0; i < sortedAccounts.length; i++) {
        const account = sortedAccounts[i];
        const accountStartYear = new Date(account.startDate).getFullYear();
        const nextAccountStartYear =
          i < sortedAccounts.length - 1
            ? new Date(sortedAccounts[i + 1].startDate).getFullYear()
            : retirementYear + 1;

        if (year >= accountStartYear && year < nextAccountStartYear) {
          monthlyContribution = account.epfAmount; // This is monthly amount
          break;
        }
      }

      // Calculate annual contribution (monthly * 12)
      const yearlyContribution = monthlyContribution * 12;

      // Add yearly contribution
      totalBalance += yearlyContribution;
      totalContributed += yearlyContribution;

      // Apply compound interest
      totalBalance = totalBalance * (1 + EPF_RATE);

      yearlyData.push({
        year,
        balance: Math.round(totalBalance),
        contribution: yearlyContribution,
        monthlyContribution,
        interestEarned: Math.round(totalBalance - totalContributed),
      });
    }

    const finalBalance = yearlyData[yearlyData.length - 1]?.balance || 0;
    const totalInterest = finalBalance - totalContributed;

    return {
      yearlyData,
      summary: {
        finalBalance,
        totalContributed,
        totalInterest,
        yearsToRetirement: retirementYear - currentYear,
      },
    };
  };

  const { yearlyData, summary } = calculateEPFGrowth();

  // Highcharts configuration
  const chartOptions = {
    chart: {
      type: 'area',
      height: 500,
      backgroundColor: 'transparent',
    },
    title: {
      text: 'EPF Investment Growth Projection',
      style: { fontSize: '18px', fontWeight: 'bold' },
    },
    subtitle: {
      text: 'Based on 8.25% annual interest rate',
      style: { fontSize: '14px', color: '#666' },
    },
    xAxis: {
      categories: yearlyData.map((d) => d.year.toString()),
      title: { text: 'Year' },
    },
    yAxis: {
      title: { text: 'Amount (₹)' },
      labels: {
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          return '₹' + ((this.value as number) / 100000).toFixed(1) + 'L';
        },
      },
    },
    tooltip: {
      // @ts-expect-error highcharts formatter
      formatter: function () {
        // @ts-expect-error highcharts formatter
        const data = yearlyData[this.point.index];
        // @ts-expect-error highcharts formatter
        return `<b>Year ${this.x}</b><br/>
                Total Balance: ₹${data.balance.toLocaleString('en-IN')}<br/>
                Annual Contribution: ₹${data.contribution.toLocaleString('en-IN')}<br/>
                Monthly Contribution: ₹${data.monthlyContribution.toLocaleString('en-IN')}<br/>
                Interest Earned: ₹${data.interestEarned.toLocaleString('en-IN')}`;
      },
    },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(59, 130, 246, 0.3)'],
            [1, 'rgba(59, 130, 246, 0.1)'],
          ],
        },
        lineColor: '#3B82F6',
        lineWidth: 2,
        marker: {
          enabled: false,
          states: {
            hover: { enabled: true, radius: 5 },
          },
        },
      },
    },
    series: [
      {
        name: 'EPF Balance',
        data: yearlyData.map((d) => d.balance),
        color: '#3B82F6',
      },
    ],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  const onSubmit = async (values: EpfAccountPayload) => {
    try {
      await addAccount(values);
      setDialogOpen(false);
      toast.success('EPF account added successfully');
      form.reset();
      await refetch();
      await refetchTimeline();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('An unknown error occurred');
      }
    }
  };

  const handleAddAccountClick = () => {
    setDrawerOpen(false); // Close drawer first
    setTimeout(() => {
      setDialogOpen(true); // Then open modal with slight delay
    }, 150);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-9 w-16 mx-auto" />
          <Skeleton className="h-10 w-10" />
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        </div>

        {/* Growth Chart Skeleton */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[500px]" />
          </CardContent>
        </Card>

        {/* Contribution Timeline Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="w-full">
                {/* Table Header Skeleton */}
                <div className="border-b pb-2 mb-4">
                  <div className="grid grid-cols-5 gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>

                {/* Table Body Skeleton */}
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="grid grid-cols-5 gap-4 py-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>

                {/* Total Row Skeleton */}
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-5 gap-4 py-2">
                    <div className="col-span-4">
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </div>
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
          <h1 className="text-3xl font-bold text-center flex-1">EPF</h1>
        </div>
        <div className="text-red-500 text-center">Error loading EPF data</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header with Title and Add Button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center flex-1">EPF</h1>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full w-[35%] ml-auto">
            <DrawerHeader className="border-b">
              <div className="flex justify-between items-center">
                <DrawerTitle>EPF Declarations</DrawerTitle>
                <Button size="icon" variant="outline" onClick={handleAddAccountClick}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <p>No EPF accounts added yet</p>
                  <p className="text-sm">Click the + button to add your first account</p>
                </div>
              ) : (
                data?.map((epf) => (
                  <Card key={epf._id} className="hover:shadow-md transition">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="font-medium text-base">{epf.organizationName}</div>
                        <div className="text-sm text-muted-foreground">
                          Monthly Contribution: ₹{epf.epfAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Annual Contribution: ₹{(epf.epfAmount * 12).toLocaleString('en-IN')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Credit Day: {epf.creditDay}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Start Date: {new Date(epf.startDate).toLocaleDateString('en-IN')}
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

      {/* Add Account Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add EPF Account</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4 py-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. TCS, Infosys" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="epfAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly EPF Contribution</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="3000"
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Day</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="5"
                        type="number"
                        min="1"
                        max="31"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Adding...' : 'Add EPF Account'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Investment Growth Chart and Summary */}
      {data && data.length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invested Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{timelineData?.totalCurrentBalance.toLocaleString('en-IN')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Projected Balance at 58
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{summary?.finalBalance.toLocaleString('en-IN')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Contributed by 58
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{summary?.totalContributed.toLocaleString('en-IN')}
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
                  ₹{summary?.totalInterest.toLocaleString('en-IN')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Years to Retirement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {summary?.yearsToRetirement} years
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>EPF Growth Projection</CardTitle>
              <p className="text-sm text-muted-foreground">
                Investment timeline based on your monthly EPF contributions and job changes
              </p>
            </CardHeader>
            <CardContent>
              <HighchartsReact highcharts={Highcharts} options={chartOptions} />
            </CardContent>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Contribution Timeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your EPF contribution history based on job changes
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Organization</th>
                      <th className="text-left p-2">Monthly Contribution</th>
                      <th className="text-left p-2">Start Date</th>
                      <th className="text-left p-2">End Date</th>
                      <th className="text-left p-2">Total Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineData?.timeline.map((row, index) => {
                      if (row.type === 'contribution') {
                        return (
                          <tr key={`contribution-${index}`} className="border-b">
                            <td className="p-2 font-medium">{row.organization}</td>
                            <td className="p-2">
                              ₹{row.monthlyContribution?.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2">{row.startDate}</td>
                            <td className="p-2">{row.endDate}</td>
                            <td className="p-2">
                              ₹{row.totalContribution.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr
                            key={`interest-${index}`}
                            className="border-b text-muted-foreground italic"
                          >
                            <td className="p-2 font-medium">Interest for {row.financialYear}</td>
                            <td className="p-2">—</td>
                            <td className="p-2">—</td>
                            <td className="p-2">{row.interestCreditDate}</td>
                            <td className="p-2">
                              ₹{row.totalContribution.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      }
                    })}

                    {/* Total Row */}
                    <tr className="font-semibold bg-muted/40 border-t">
                      <td className="p-2" colSpan={4}>
                        Total Current Balance
                      </td>
                      <td className="p-2 text-green-600">
                        ₹{timelineData?.totalCurrentBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
