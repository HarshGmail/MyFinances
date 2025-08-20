'use client';

import {
  useEpfQuery,
  useEpfTimelineQuery,
  useInflationQuery,
  useUserProfileQuery,
} from '@/api/query';
import { useAddEpfAccountMutation } from '@/api/mutations';
import { EpfAccountPayload } from '@/api/dataInterface';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  CalendarIcon,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  PiggyBank,
  Calculator,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { format, differenceInYears } from 'date-fns';

import { useAppStore } from '@/store/useAppStore';
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
  const { theme } = useAppStore();
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
  const { data: user } = useUserProfileQuery();
  const { data: inflationData } = useInflationQuery(5);

  const {
    data: timelineData,
    refetch: refetchTimeline,
    isLoading: timelineLoading,
    error: timelineError,
  } = useEpfTimelineQuery();

  // Loading and error states
  const isLoading = epfLoading || timelineLoading;
  const error = epfError || timelineError;

  const inflationAnnualPct = Number.isFinite(inflationData?.average)
    ? (inflationData!.average as number)
    : 5;
  const INF = inflationAnnualPct / 100;

  // EPF calculation logic (CORRECTED FOR MONTHLY CONTRIBUTIONS)
  const calculateEPFGrowth = () => {
    if (!data || data.length === 0) return { yearlyData: [], summary: null };

    // Sort accounts by start date
    const sortedAccounts = [...data].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const EPF_RATE = 8.25 / 100; // nominal annual interest
    const RETIREMENT_AGE = 58;
    const currentYear = new Date().getFullYear();

    const currentAge = user?.dob ? differenceInYears(new Date(), new Date(user.dob)) : 25;
    const safeAge = Math.max(0, Math.min(RETIREMENT_AGE, currentAge));
    const retirementYear = currentYear + (RETIREMENT_AGE - safeAge);

    let totalBalanceNominal = 0; // future nominal ₹
    let totalContributedNominal = 0; // sum of nominal contributions
    let totalContributedRealPV = 0; // PV (today ₹) of contributions

    const yearlyData: Array<{
      year: number;
      balance: number; // nominal
      realBalance: number; // inflation-adjusted (today ₹)
      contribution: number; // nominal annual contribution
      monthlyContribution: number;
      interestEarned: number; // nominal interest (approx)
      interestEarnedReal: number; // real interest (today ₹)
    }> = [];

    // Calculate growth year by year
    for (let year = currentYear; year <= Math.min(retirementYear, 2060); year++) {
      let monthlyContribution = 0;

      // Which account is active this year?
      for (let i = 0; i < sortedAccounts.length; i++) {
        const account = sortedAccounts[i];
        const accountStartYear = new Date(account.startDate).getFullYear();
        const nextAccountStartYear =
          i < sortedAccounts.length - 1
            ? new Date(sortedAccounts[i + 1].startDate).getFullYear()
            : retirementYear + 1;

        if (year >= accountStartYear && year < nextAccountStartYear) {
          monthlyContribution = account.epfAmount; // monthly amount
          break;
        }
      }

      // Annual contribution
      const yearlyContribution = monthlyContribution * 12;

      // Nominal track
      totalBalanceNominal += yearlyContribution;
      totalContributedNominal += yearlyContribution;
      totalBalanceNominal = totalBalanceNominal * (1 + EPF_RATE);

      // Inflation adjustment (deflate to today's ₹)
      // +1 because we just compounded this year's interest
      const yearsFromNow = year - currentYear + 1;
      const realBalance = totalBalanceNominal / Math.pow(1 + INF, yearsFromNow);

      // Present value of this year's contribution (rough, end-of-year timing)
      const pvContribution = yearlyContribution / Math.pow(1 + INF, yearsFromNow);
      totalContributedRealPV += pvContribution;

      const interestNominal = totalBalanceNominal - totalContributedNominal;
      const interestReal = realBalance - totalContributedRealPV;

      yearlyData.push({
        year,
        balance: Math.round(totalBalanceNominal),
        realBalance: Math.round(realBalance),
        contribution: yearlyContribution,
        monthlyContribution,
        interestEarned: Math.round(interestNominal),
        interestEarnedReal: Math.round(interestReal),
      });
    }

    const finalNominal = yearlyData.at(-1)?.balance ?? 0;
    const finalReal = yearlyData.at(-1)?.realBalance ?? 0;

    return {
      yearlyData,
      summary: {
        finalBalance: finalNominal, // nominal
        finalBalanceReal: finalReal, // real, today ₹
        totalContributed: totalContributedNominal, // nominal
        totalContributedReal: Math.round(totalContributedRealPV), // PV (today ₹)
        totalInterest: finalNominal - totalContributedNominal, // nominal
        totalInterestReal: Math.round(finalReal - totalContributedRealPV), // real
        yearsToRetirement: retirementYear - currentYear,
        inflationAnnualPct, // surfaced for UI
      },
    };
  };

  const { yearlyData, summary } = calculateEPFGrowth();

  const BLUE = '#3B82F6';
  const ORANGE = '#F97316';

  // Highcharts configuration
  const chartOptions = {
    chart: {
      type: 'area',
      height: 500,
      backgroundColor: 'transparent',
    },
    title: {
      text: 'EPF Investment Growth Projection',
      style: { fontSize: '18px', fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#18181b' },
    },
    subtitle: {
      text: `8.25% nominal, deflated by ${inflationAnnualPct.toFixed(2)}% inflation`,
      style: { fontSize: '14px', color: '#666' },
    },
    xAxis: {
      categories: yearlyData.map((d) => d.year.toString()),
      title: { text: 'Year', style: { color: theme === 'dark' ? '#FFF' : '#18181b' } },
      labels: {
        style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
      },
    },
    yAxis: {
      title: { text: 'Amount (₹)', style: { color: theme === 'dark' ? '#FFF' : '#18181b' } },
      labels: {
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          return '₹' + ((this.value as number) / 100000).toFixed(1) + 'L';
        },
        style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
      },
    },
    tooltip: {
      // @ts-expect-error highcharts formatter
      formatter: function () {
        // @ts-expect-error highcharts formatter
        const data = yearlyData[this.point.index];
        // @ts-expect-error highcharts formatter
        return `<b>Year ${this.x}</b><br/>
                Total Balance (Nominal): ₹${data.balance.toLocaleString('en-IN')}<br/>
                Total Balance (Real): ₹${data.realBalance.toLocaleString('en-IN')}<br/>
                Annual Contribution: ₹${data.contribution.toLocaleString('en-IN')}<br/>
                Monthly Contribution: ₹${data.monthlyContribution.toLocaleString('en-IN')}<br/>
                Interest Earned (Nominal): ₹${data.interestEarned.toLocaleString('en-IN')}<br/>
                Interest Earned (Real): ₹${data.interestEarnedReal.toLocaleString('en-IN')}`;
      },
    },
    plotOptions: {
      area: {
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
        name: 'EPF Balance (Nominal)',
        data: yearlyData.map((d) => d.balance),
        color: BLUE,
        lineColor: BLUE,
        zIndex: 1,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(BLUE).setOpacity(0.35).get('rgba')],
            [1, Highcharts.color(BLUE).setOpacity(0.1).get('rgba')],
          ],
        },
      },
      {
        name: 'EPF Balance (Real, ₹ today)',
        data: yearlyData.map((d) => d.realBalance),
        color: ORANGE,
        lineColor: ORANGE,
        zIndex: 2, // ensure orange area sits on top of blue
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(ORANGE).setOpacity(0.35).get('rgba')],
            [1, Highcharts.color(ORANGE).setOpacity(0.1).get('rgba')],
          ],
        },
      },
    ],
    legend: { enabled: true },
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-20 mt-1" />
              </CardContent>
            </Card>
          ))}
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
          {/* Enhanced Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Current Balance */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
                <PiggyBank className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{timelineData?.totalCurrentBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total invested till date</div>
              </CardContent>
            </Card>

            {/* Maturity Value - Nominal */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Maturity Value (Nominal)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{summary?.finalBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Future rupee value at 58</div>
              </CardContent>
            </Card>

            {/* Maturity Value - Real (Inflation Adjusted) */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Maturity Value (Real)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{summary?.finalBalanceReal.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Today&apos;s purchasing power
                </div>
              </CardContent>
            </Card>

            {/* Total Investment - Nominal */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Investment (Nominal)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  ₹{summary?.totalContributed.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Future rupee contributions</div>
              </CardContent>
            </Card>

            {/* Total Investment - Real (Present Value) */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
                <Calculator className="h-4 w-4 text-cyan-600" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Investment (Real)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-600">
                  ₹{summary?.totalContributedReal.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Present value of contributions
                </div>
              </CardContent>
            </Card>

            {/* Years to Retirement */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center space-y-0 space-x-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Years to Retirement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {summary?.yearsToRetirement} years
                </div>
                <div className="text-xs text-muted-foreground mt-1">Until age 58</div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Summary Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Interest Earned - Nominal */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Interest (Nominal)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600">
                  ₹{summary?.totalInterest.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Future rupee interest earnings
                </div>
              </CardContent>
            </Card>

            {/* Interest Earned - Real */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Interest (Real)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-teal-600">
                  ₹{summary?.totalInterestReal.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Today&apos;s purchasing power
                </div>
              </CardContent>
            </Card>

            {/* Interest Rate */}
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

            {/* Inflation Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inflation Assumption
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">
                  {summary?.inflationAnnualPct?.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Annual inflation rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>EPF Growth Projection (Nominal vs Real)</CardTitle>
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
