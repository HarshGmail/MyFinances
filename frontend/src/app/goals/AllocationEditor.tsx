'use client';

import { useMemo, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Check, Plus, Trash2 } from 'lucide-react';
import {
  GOAL_ASSET_LABELS,
  GOAL_ASSET_TYPES,
  computeGoalValue,
  freePercent,
  holdingKey,
  isOverAllocated,
  type GoalHolding,
} from '@myfinances/core/calc/goals';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import type { GoalFormValues } from '@myfinances/core/schemas/goals';
import type { GoalAllocation, GoalAssetType } from '@myfinances/core/types';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ASSET_COLORS, formatPercentNumber } from './goalDisplay';

interface AllocationEditorProps {
  holdings: GoalHolding[];
  holdingsByKey: Map<string, GoalHolding>;
  allocatedElsewhere: Record<string, number>;
  isHoldingsLoading: boolean;
}

function roundPercent(pct: number): number {
  return Math.round(pct * 100) / 100;
}

function finitePercent(pct: number): number {
  return Number.isFinite(pct) ? pct : 0;
}

export function sanitiseAllocations(allocations: GoalAllocation[] | undefined): GoalAllocation[] {
  return (allocations ?? []).map((allocation) => ({
    ...allocation,
    percent: finitePercent(allocation.percent),
  }));
}

export function AllocationEditor({
  holdings,
  holdingsByKey,
  allocatedElsewhere,
  isHoldingsLoading,
}: AllocationEditorProps) {
  const { control, register, formState } = useFormContext<GoalFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'allocations' });
  const watchedAllocations = useWatch({ control, name: 'allocations' });
  const manualAmount = useWatch({ control, name: 'manualAmount' });
  const [pickerOpen, setPickerOpen] = useState(false);

  const allocations = useMemo(() => sanitiseAllocations(watchedAllocations), [watchedAllocations]);
  const selectedKeys = useMemo(
    () => new Set(fields.map((field) => holdingKey(field.assetType, field.assetKey))),
    [fields]
  );
  const linkedValue = useMemo(
    () => computeGoalValue({ allocations, manualAmount }, holdingsByKey),
    [allocations, manualAmount, holdingsByKey]
  );

  const holdingsByType = useMemo(
    () =>
      GOAL_ASSET_TYPES.map((assetType) => ({
        assetType,
        holdings: holdings.filter((holding) => holding.assetType === assetType),
      })).filter((group) => group.holdings.length > 0),
    [holdings]
  );

  const freeFor = (assetType: GoalAssetType, assetKey: string) =>
    freePercent(allocatedElsewhere, holdingKey(assetType, assetKey));

  const isSelectable = (holding: GoalHolding) =>
    !selectedKeys.has(holdingKey(holding.assetType, holding.assetKey)) &&
    freeFor(holding.assetType, holding.assetKey) > 0;

  const addHoldings = (toAdd: GoalHolding[]) =>
    append(
      toAdd.map((holding) => ({
        assetType: holding.assetType,
        assetKey: holding.assetKey,
        percent: roundPercent(freeFor(holding.assetType, holding.assetKey)),
      }))
    );

  const rowGroups = GOAL_ASSET_TYPES.map((assetType) => ({
    assetType,
    rows: fields
      .map((field, index) => ({ field, index }))
      .filter(({ field }) => field.assetType === assetType),
  })).filter((group) => group.rows.length > 0);

  const holdingCount = fields.length;
  const holdingCountLabel = `${holdingCount} ${holdingCount === 1 ? 'holding' : 'holdings'}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Linked holdings</p>
          <p className="text-xs text-muted-foreground">
            Assign a share of any holding. A holding can be split across goals up to 100%.
          </p>
        </div>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen} modal>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={isHoldingsLoading}>
              <Plus />
              {isHoldingsLoading ? 'Loading…' : 'Add holdings'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search holdings…" />
              <CommandList className="max-h-[320px]">
                <CommandEmpty>
                  {holdings.length === 0 ? 'You have no holdings yet.' : 'No matching holdings.'}
                </CommandEmpty>
                {holdingsByType.map((group) => {
                  const addable = group.holdings.filter(isSelectable);
                  return (
                    <CommandGroup
                      key={group.assetType}
                      heading={GOAL_ASSET_LABELS[group.assetType]}
                    >
                      {addable.length > 1 && (
                        <CommandItem
                          value={`add-all:${group.assetType}`}
                          keywords={[GOAL_ASSET_LABELS[group.assetType], 'add all']}
                          onSelect={() => addHoldings(addable)}
                          className="text-primary"
                        >
                          <Plus className="size-4" />
                          Add all {addable.length}{' '}
                          {GOAL_ASSET_LABELS[group.assetType].toLowerCase()}
                        </CommandItem>
                      )}
                      {group.holdings.map((holding) => {
                        const key = holdingKey(holding.assetType, holding.assetKey);
                        const isSelected = selectedKeys.has(key);
                        const free = freeFor(holding.assetType, holding.assetKey);
                        return (
                          <CommandItem
                            key={key}
                            value={key}
                            keywords={[holding.label, GOAL_ASSET_LABELS[holding.assetType]]}
                            disabled={!isSelectable(holding)}
                            onSelect={() => addHoldings([holding])}
                          >
                            <Check className={cn('size-4', !isSelected && 'invisible')} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate">{holding.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(holding.currentValue)}
                              </div>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 text-xs',
                                free > 0 ? 'text-muted-foreground' : 'text-destructive'
                              )}
                            >
                              {isSelected ? 'Added' : `${formatPercentNumber(free)}% free`}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {rowGroups.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No holdings linked. Add mutual funds, stocks, deposits, gold, crypto or EPF, or just track
          other savings with the manual amount above.
        </div>
      ) : (
        <div className="space-y-3">
          {rowGroups.map((group) => (
            <div key={group.assetType} className="rounded-md border">
              <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: ASSET_COLORS[group.assetType] }}
                />
                {GOAL_ASSET_LABELS[group.assetType]}
              </div>
              <ul className="divide-y">
                {group.rows.map(({ field, index }) => {
                  const holding =
                    holdingsByKey.get(holdingKey(field.assetType, field.assetKey)) ?? null;
                  const pct = finitePercent(allocations[index]?.percent ?? 0);
                  const free = freeFor(field.assetType, field.assetKey);
                  const schemaError = formState.errors.allocations?.[index]?.percent?.message;
                  const overAllocated = isOverAllocated(pct, free);
                  const errorMessage =
                    schemaError ??
                    (overAllocated
                      ? `Only ${formatPercentNumber(free)}% is free — other goals use the rest`
                      : undefined);
                  return (
                    <li key={field.id} className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{holding?.label ?? field.assetKey}</div>
                          <div className="text-xs text-muted-foreground">
                            {holding ? (
                              <>
                                {formatCurrency((holding.currentValue * pct) / 100)} of{' '}
                                {formatCurrency(holding.currentValue)}
                              </>
                            ) : (
                              <span className="text-destructive">Not found — sold or renamed</span>
                            )}
                          </div>
                        </div>
                        <div className="relative w-24 shrink-0">
                          <Input
                            type="number"
                            inputMode="decimal"
                            step={1}
                            min={0}
                            max={100}
                            aria-label={`Percent of ${holding?.label ?? field.assetKey}`}
                            aria-invalid={Boolean(errorMessage)}
                            className="pr-7 text-right"
                            {...register(`allocations.${index}.percent`, { valueAsNumber: true })}
                          />
                          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${holding?.label ?? field.assetKey}`}
                          onClick={() => remove(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      {errorMessage && (
                        <p className="mt-1 text-xs text-destructive">{errorMessage}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatCurrency(linkedValue.currentValue)}
        </span>{' '}
        linked across {holdingCountLabel}
        {manualAmount ? `, including ${formatCurrency(manualAmount)} of other savings` : ''}
      </p>
    </div>
  );
}
