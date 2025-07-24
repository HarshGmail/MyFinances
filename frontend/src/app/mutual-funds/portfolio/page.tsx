'use client';

import React, { useState, useId, useRef, useEffect } from 'react';
import { useMutualFundInfoFetchQuery } from '@/api/query';
import { AnimatePresence, motion } from 'motion/react';
import { useOutsideClick } from '@/hooks/use-outside-click';
import { CirclePlus } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAddMutualFundInfoMutation } from '@/api/mutations';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AddMfTransactionForm } from '@/app/mutual-funds/portfolio/AddMfTransactionForm';
import { OtpDateInput } from '@/components/ui/otp-date-input';
import { MutualFundInfo } from '@/api/dataInterface';
import { useSearchMutualFundsQuery } from '@/api/query';
import { debounce } from 'lodash';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const mutualFundFormSchema = z.object({
  fundName: z.string().min(1, 'Mutual Fund Name is required'),
  schemeNumber: z.number({ invalid_type_error: 'Scheme Number is required' }), // <-- add this
  sipAmount: z
    .number({ invalid_type_error: 'SIP Amount is required' })
    .min(1, 'SIP Amount must be at least 1'),
  goal: z.string().optional(),
  platform: z.string().optional(),
  date: z
    .string()
    .length(8, 'Date must be 8 digits in DDMMYYYY format')
    .refine((val) => {
      // Validate DDMMYYYY
      if (!/^[0-9]{8}$/.test(val)) return false;
      const dd = parseInt(val.slice(0, 2), 10);
      const mm = parseInt(val.slice(2, 4), 10);
      const yyyy = parseInt(val.slice(4, 8), 10);
      if (dd < 1 || dd > 31) return false;
      if (mm < 1 || mm > 12) return false;
      if (yyyy <= 2002) return false;
      // Check for valid date
      const d = new Date(
        `${yyyy}-${mm.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`
      );
      if (d.getFullYear() !== yyyy || d.getMonth() + 1 !== mm || d.getDate() !== dd) return false;
      // Date must be less than today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d >= today) return false;
      return true;
    }, 'Enter a valid date in DDMMYYYY format (year > 2002 and less than today)'),
});

type MutualFundFormValues = z.infer<typeof mutualFundFormSchema>;
const MF_INFO_CACHE_KEY = 'mutualFundFormCache';

export default function MutualFundsPortfolioPage() {
  const { data: funds, isLoading, error } = useMutualFundInfoFetchQuery();
  const [active, setActive] = useState<MutualFundInfo | null>(null);
  const [addActive, setAddActive] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [fundNameInput, setFundNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPeriodic, setIsPeriodic] = useState(false);
  // removed unused selectedSuggestion
  const { data: fundSuggestions } = useSearchMutualFundsQuery(fundNameInput);

  // Debounced handler
  const debouncedSetFundNameInput = debounce((val: string) => {
    setFundNameInput(val);
  }, 1000);

  // Mutual Fund Add Form logic
  const { mutate: addMutualFund, isPending: isAdding } = useAddMutualFundInfoMutation();
  const mfForm = useForm<MutualFundFormValues>({
    resolver: zodResolver(mutualFundFormSchema),
    defaultValues: {
      fundName: '',
      schemeNumber: 0, // <-- add this
      sipAmount: 0,
      goal: '',
      platform: '',
      date: '',
    },
  });

  // Load cached values if present
  useEffect(() => {
    if (!addActive) return;
    const cached = localStorage.getItem(MF_INFO_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        Object.entries(parsed).forEach(([key, value]) => {
          if (key in mfForm.getValues()) {
            let v = value;
            if (key === 'date' && typeof value === 'string') {
              v = new Date(value);
            } else if (key === 'sipAmount' && typeof value === 'string') {
              v = Number(value);
            }
            mfForm.setValue(key as keyof MutualFundFormValues, v as string);
          }
        });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addActive]);

  // Save form values to cache on change
  useEffect(() => {
    if (!addActive) return;
    const subscription = mfForm.watch((values) => {
      localStorage.setItem(MF_INFO_CACHE_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [mfForm, addActive]);

  // Refetch mutual funds after add
  const { refetch } = useMutualFundInfoFetchQuery();

  function onAddSubmit(values: MutualFundFormValues) {
    // Convert DDMMYYYY to ISO string
    const dd = values.date.slice(0, 2);
    const mm = values.date.slice(2, 4);
    const yyyy = values.date.slice(4, 8);
    const dateIso = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
    addMutualFund(
      {
        fundName: values.fundName,
        schemeNumber: values.schemeNumber,
        sipAmount: values.sipAmount,
        goal: values.goal || undefined,
        platform: values.platform || undefined,
        date: dateIso,
      },
      {
        onSuccess: () => {
          toast.success('Mutual fund added successfully');
          setAddActive(false);
          localStorage.removeItem(MF_INFO_CACHE_KEY);
          mfForm.reset();
          refetch();
        },
        onError: (error: unknown) => {
          let description = 'An error occurred';
          if (
            error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof (error as Error).message === 'string'
          ) {
            description = (error as Error).message;
          }
          toast.error('Mutual fund addition failed!', {
            description,
          });
        },
      }
    );
  }

  useOutsideClick(ref as React.RefObject<HTMLDivElement>, () => setActive(null));

  useEffect(() => {
    if (active) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [active]);

  // Handle form submission with validation
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = mfForm.getValues();
    const errors: string[] = [];

    if (!values.fundName?.trim()) errors.push('Mutual Fund Name');
    if (!values.sipAmount || values.sipAmount <= 0) errors.push('SIP Amount');
    if (!values.date || values.date.length !== 8) errors.push('Date');

    if (errors.length > 0) {
      toast.error(`Please enter: ${errors.join(', ')}`, {
        description: 'All mandatory fields are required',
      });
      return;
    }

    mfForm.handleSubmit(onAddSubmit)(e);
  };

  return (
    <div className="p-4 h-full">
      <h2 className="text-xl font-bold text-center mb-6">Invested Mutual Funds</h2>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error loading mutual funds</div>}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Default Add Card */}
        <div
          className="flex items-center justify-center bg-white dark:bg-neutral-900 rounded-xl shadow p-4 min-h-[200px] cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 border-2 border-dashed border-gray-300 dark:border-gray-700 max-w-xs w-full"
          onClick={() => setAddActive(true)}
        >
          <CirclePlus size={50} strokeWidth={0.5} />
        </div>
        {funds &&
          funds.map((fund, idx) => (
            <motion.div
              key={`${fund.fundName ?? 'fund'}-${idx}`}
              layoutId={`card-${fund.fundName ?? 'fund'}-${id}-${idx}`}
              onClick={() => setActive(fund)}
              className="bg-white dark:bg-neutral-900 rounded-xl shadow p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 flex flex-col justify-between min-h-[200px]"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-lg text-neutral-800 dark:text-neutral-200">
                  {fund.fundName || '-'}
                </span>
                <span className="text-sm text-green-600 font-medium">{fund.goal || '-'}</span>
              </div>
              <div className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
                SIP:{' '}
                <span className="font-semibold">₹{fund.sipAmount?.toLocaleString() ?? '-'}</span>
              </div>
              <div className="mt-auto text-xs text-neutral-500 dark:text-neutral-400 flex flex-col gap-1">
                <div>
                  First SIP date: {fund.date ? new Date(fund.date).toLocaleDateString() : '-'}
                </div>
                <div>Platform: {fund.platform || '-'}</div>
              </div>
            </motion.div>
          ))}
      </div>
      {/* Expanded Card Modal */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm h-full w-full z-10"
            onClick={() => setActive(null)}
          />
        )}
        {addActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm h-full w-full z-10"
            onClick={() => setAddActive(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && (
          <div
            className="fixed inset-0 grid place-items-center z-[100]"
            onClick={() => setActive(null)}
          >
            <motion.div
              layoutId={`card-${active.fundName ?? 'fund'}-${id}`}
              ref={ref}
              className="w-full max-w-[400px] flex flex-col bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {!showTransactionForm ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-xl text-neutral-800 dark:text-neutral-200">
                      {active.fundName || '-'}
                    </span>
                    <span className="text-base text-green-600 font-medium">
                      {active.goal || '-'}
                    </span>
                  </div>
                  <div className="mb-6 text-base text-neutral-700 dark:text-neutral-300">
                    SIP:{' '}
                    <span className="font-semibold">
                      ₹{active.sipAmount?.toLocaleString() ?? '-'}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 flex flex-col gap-2">
                    <div>
                      First SIP date:{' '}
                      {active.date ? new Date(active.date).toLocaleDateString() : '-'}
                    </div>
                    <div>Platform: {active.platform || '-'}</div>
                  </div>
                  <div className="mt-auto pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowTransactionForm(true)}
                      className="w-full"
                    >
                      Add MF units
                    </Button>
                  </div>
                </>
              ) : (
                <AddMfTransactionForm
                  fundName={active.fundName || ''}
                  platform={active.platform}
                  sipAmount={active.sipAmount}
                  onSuccess={() => {
                    setShowTransactionForm(false);
                    setActive(null);
                  }}
                  onCancel={() => setShowTransactionForm(false)}
                  isPeriodic={isPeriodic}
                  setIsPeriodic={setIsPeriodic}
                  setShowTransactionForm={setShowTransactionForm}
                />
              )}
            </motion.div>
          </div>
        )}
        {addActive && (
          <div
            className="fixed inset-0 grid place-items-center z-[100]"
            onClick={() => setAddActive(false)}
          >
            <motion.div
              layoutId="add-card"
              className="w-full max-w-[400px] flex flex-col bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 text-xl text-neutral-800 dark:text-neutral-200 text-center font-bold">
                Add a mutual fund to your portfolio
              </div>
              <Form {...mfForm}>
                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 gap-y-4">
                  <FormLabel>Mutual Fund Name</FormLabel>
                  <FormField
                    control={mfForm.control}
                    name="fundName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Enter mutual fund name"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                debouncedSetFundNameInput(e.target.value);
                                setShowSuggestions(true);
                                mfForm.setValue('schemeNumber', 0);
                              }}
                              onFocus={() => setShowSuggestions(true)}
                              autoComplete="off"
                            />

                            {showSuggestions && fundNameInput.length >= 2 && (
                              <div className="absolute z-20 mt-1 w-full">
                                <Command className="border rounded-md bg-white dark:bg-neutral-900 shadow max-h-[250px] overflow-y-auto">
                                  <CommandInput
                                    value={fundNameInput}
                                    onValueChange={(val) => {
                                      setFundNameInput(val);
                                      debouncedSetFundNameInput(val);
                                    }}
                                    placeholder="Search mutual funds..."
                                  />
                                  <CommandList>
                                    {fundSuggestions?.length ? (
                                      <CommandGroup heading="Suggestions">
                                        {/* @ts-expect-error this is expected*/}
                                        {fundSuggestions.map((fund) => (
                                          <CommandItem
                                            key={fund.schemeCode}
                                            onSelect={() => {
                                              mfForm.setValue('fundName', fund.schemeName);
                                              mfForm.setValue('schemeNumber', fund.schemeCode);
                                              setShowSuggestions(false);
                                            }}
                                          >
                                            {fund.schemeName}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    ) : (
                                      <CommandEmpty>No results found</CommandEmpty>
                                    )}
                                  </CommandList>
                                </Command>
                              </div>
                            )}
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Hidden field for schemeNumber to ensure it's in the form state */}
                  <input
                    type="hidden"
                    {...mfForm.register('schemeNumber', { valueAsNumber: true })}
                  />

                  <FormLabel>SIP Amount</FormLabel>
                  <FormField
                    control={mfForm.control}
                    name="sipAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter SIP amount"
                            {...field}
                            value={field.value === 0 ? '' : field.value}
                            onFocus={() => {
                              if (field.value === 0) field.onChange('');
                            }}
                            onBlur={() => {
                              if (field.value === undefined) field.onChange(0);
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                field.onChange('');
                              } else {
                                field.onChange(Number(val));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormLabel>Goal (optional)</FormLabel>
                  <FormField
                    control={mfForm.control}
                    name="goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter goal (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormLabel>Platform (optional)</FormLabel>
                  <FormField
                    control={mfForm.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter platform (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormLabel>Date (DDMMYYYY)</FormLabel>
                  <FormField
                    control={mfForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <OtpDateInput value={field.value || ''} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="mt-2">
                    <Button type="submit" className="w-full" disabled={isAdding}>
                      {isAdding ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-4 w-4" /> Adding...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
