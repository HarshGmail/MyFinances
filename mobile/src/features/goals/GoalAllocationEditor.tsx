import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, SectionList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Search, X } from 'lucide-react-native';
import type { GoalAllocation, GoalAssetType } from '@myfinances/core/types';
import {
  GOAL_ASSET_LABELS,
  GOAL_ASSET_TYPES,
  GoalHolding,
  freePercent,
  holdingKey,
  isOverAllocated,
} from '@myfinances/core/calc/goals';
import { AddButton, Label } from '@/components/ui';
import { colors } from '@/lib/theme';
import { allocationLabel, formatPercent, formatRupees } from './goalDisplay';

const PERCENT = 100;
const HUNDREDTHS = 100;
const ICON_SIZE = 16;
const HIT_SLOP = 8;
const PICKER_BOTTOM_PADDING = 40;

type AllocationErrors = ({ percent?: { message?: string } } | undefined)[] | undefined;

function allocationKey(allocation: GoalAllocation): string {
  return holdingKey(allocation.assetType, allocation.assetKey);
}

function parsePercent(text: string): number {
  const normalised = text.replace(/,/g, '').trim();
  return normalised === '' ? Number.NaN : Number(normalised);
}

function roundDownToHundredths(value: number): number {
  return Math.floor(value * HUNDREDTHS) / HUNDREDTHS;
}

function contribution(holding: GoalHolding | null, percent: number): number {
  return holding && Number.isFinite(percent) ? (holding.currentValue * percent) / PERCENT : 0;
}

function PercentInput({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (value: number) => void;
  invalid: boolean;
}) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '');
  return (
    <View
      className={`h-10 w-20 flex-row items-center rounded-lg border bg-card px-2 ${invalid ? 'border-loss' : 'border-border'}`}
    >
      <TextInput
        value={text}
        onChangeText={(next) => {
          setText(next);
          onChange(parsePercent(next));
        }}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.muted}
        className="flex-1 text-right text-base text-foreground"
        accessibilityLabel="Percent allocated"
      />
      <Text className="pl-0.5 text-sm text-muted">%</Text>
    </View>
  );
}

function AllocationRow({
  allocation,
  holding,
  available,
  schemaError,
  onPercentChange,
  onRemove,
}: {
  allocation: GoalAllocation;
  holding: GoalHolding | null;
  available: number;
  schemaError?: string;
  onPercentChange: (percent: number) => void;
  onRemove: () => void;
}) {
  const overCap =
    Number.isFinite(allocation.percent) && isOverAllocated(allocation.percent, available);
  const error = overCap ? `Only ${formatPercent(available)} of this holding is free` : schemaError;
  const label = allocationLabel(allocation, holding);
  return (
    <View className="gap-1.5 border-t border-border py-3">
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-sm text-foreground" numberOfLines={2}>
            {label}
          </Text>
          {holding ? (
            <Text className="text-xs text-muted">
              {`${formatRupees(contribution(holding, allocation.percent))} of ${formatRupees(holding.currentValue)}`}
            </Text>
          ) : (
            <Text className="text-xs text-loss">Holding not found · counts as ₹0</Text>
          )}
        </View>
        <PercentInput
          value={allocation.percent}
          onChange={onPercentChange}
          invalid={Boolean(error)}
        />
        <Pressable
          onPress={onRemove}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
        >
          <X size={ICON_SIZE} color={colors.muted} />
        </Pressable>
      </View>
      {error ? <Text className="text-xs text-loss">{error}</Text> : null}
    </View>
  );
}

interface PickerSection {
  assetType: GoalAssetType;
  title: string;
  data: GoalHolding[];
}

function HoldingPickerModal({
  visible,
  holdings,
  excludedKeys,
  allocated,
  onClose,
  onAdd,
}: {
  visible: boolean;
  holdings: GoalHolding[];
  excludedKeys: Set<string>;
  allocated: Record<string, number>;
  onClose: () => void;
  onAdd: (holdings: GoalHolding[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sections = useMemo<PickerSection[]>(() => {
    const search = query.trim().toLowerCase();
    return GOAL_ASSET_TYPES.map((assetType) => ({
      assetType,
      title: GOAL_ASSET_LABELS[assetType],
      data: holdings.filter(
        (holding) =>
          holding.assetType === assetType &&
          !excludedKeys.has(holdingKey(holding.assetType, holding.assetKey)) &&
          (search === '' || holding.label.toLowerCase().includes(search))
      ),
    })).filter((section) => section.data.length > 0);
  }, [holdings, excludedKeys, query]);

  const keyOf = (holding: GoalHolding) => holdingKey(holding.assetType, holding.assetKey);
  const isSelectable = (holding: GoalHolding) => freePercent(allocated, keyOf(holding)) > 0;

  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleSection = (section: PickerSection) => {
    const keys = section.data.filter(isSelectable).map(keyOf);
    const allSelected = keys.every((key) => selected.has(key));
    setSelected((current) => {
      const next = new Set(current);
      keys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
      return next;
    });
  };

  const reset = () => {
    setQuery('');
    setSelected(new Set());
  };

  const finish = () => {
    onAdd(holdings.filter((holding) => selected.has(keyOf(holding))));
    reset();
    onClose();
  };

  const cancel = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={cancel}
    >
      <SafeAreaView
        className="flex-1 bg-background"
        edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
      >
        <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
          <Pressable onPress={cancel} hitSlop={HIT_SLOP} accessibilityRole="button">
            <Text className="text-base text-muted">Cancel</Text>
          </Pressable>
          <Text className="text-base font-semibold text-foreground">Add holdings</Text>
          <Pressable onPress={finish} hitSlop={HIT_SLOP} accessibilityRole="button">
            <Text className="text-base font-semibold text-foreground">
              {selected.size > 0 ? `Done (${selected.size})` : 'Done'}
            </Text>
          </Pressable>
        </View>
        <View className="mx-4 mb-2 h-11 flex-row items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search size={ICON_SIZE} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search holdings"
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            className="flex-1 text-base text-foreground"
          />
        </View>
        <SectionList
          sections={sections}
          keyExtractor={keyOf}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: PICKER_BOTTOM_PADDING }}
          ListEmptyComponent={
            <Text className="py-10 text-center text-sm text-muted">
              {holdings.length ? 'No holdings match.' : 'No holdings found yet.'}
            </Text>
          }
          renderSectionHeader={({ section }) => {
            const selectableKeys = section.data.filter(isSelectable).map(keyOf);
            const allSelected =
              selectableKeys.length > 0 && selectableKeys.every((key) => selected.has(key));
            return (
              <View className="flex-row items-center justify-between bg-background px-4 pb-1 pt-4">
                <Label>{section.title}</Label>
                {selectableKeys.length > 0 && (
                  <Pressable
                    onPress={() => toggleSection(section)}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                  >
                    <Text className="text-xs font-semibold text-foreground">
                      {allSelected ? 'Clear' : 'Add all'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }}
          renderItem={({ item }) => {
            const key = keyOf(item);
            const free = freePercent(allocated, key);
            const disabled = free <= 0;
            const checked = selected.has(key);
            return (
              <Pressable
                onPress={() => toggle(key)}
                disabled={disabled}
                className={`mx-4 flex-row items-center gap-3 border-t border-border py-3 ${disabled ? 'opacity-40' : ''}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled }}
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded border ${checked ? 'border-foreground bg-foreground' : 'border-border'}`}
                >
                  {checked && <Check size={ICON_SIZE - 4} color={colors.background} />}
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-foreground" numberOfLines={2}>
                    {item.label}
                  </Text>
                  <Text className="text-xs text-muted">
                    {`${formatRupees(item.currentValue)} · ${disabled ? 'Fully allocated' : `${formatPercent(free)} free`}`}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

export function GoalAllocationEditor({
  value,
  onChange,
  holdings,
  holdingsByKey,
  allocated,
  errors,
  isLoading,
}: {
  value: GoalAllocation[];
  onChange: (allocations: GoalAllocation[]) => void;
  holdings: GoalHolding[];
  holdingsByKey: Map<string, GoalHolding>;
  allocated: Record<string, number>;
  errors?: AllocationErrors;
  isLoading?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const includedKeys = useMemo(() => new Set(value.map(allocationKey)), [value]);

  const groups = useMemo(
    () =>
      GOAL_ASSET_TYPES.map((assetType) => ({
        assetType,
        rows: value
          .map((allocation, index) => ({ allocation, index }))
          .filter(({ allocation }) => allocation.assetType === assetType),
      })).filter((group) => group.rows.length > 0),
    [value]
  );

  const linkedTotal = value.reduce(
    (sum, allocation) =>
      sum + contribution(holdingsByKey.get(allocationKey(allocation)) ?? null, allocation.percent),
    0
  );

  const setPercent = (index: number, percent: number) =>
    onChange(value.map((allocation, i) => (i === index ? { ...allocation, percent } : allocation)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const addHoldings = (picked: GoalHolding[]) =>
    onChange([
      ...value,
      ...picked.map((holding) => ({
        assetType: holding.assetType,
        assetKey: holding.assetKey,
        percent: roundDownToHundredths(
          freePercent(allocated, holdingKey(holding.assetType, holding.assetKey))
        ),
      })),
    ]);

  return (
    <View className="gap-1.5">
      <Label>Funded by</Label>
      <View className="rounded-xl border border-border bg-card px-4 pb-1 pt-3">
        {groups.length ? (
          groups.map((group) => (
            <View key={group.assetType} className="pb-2">
              <Text className="text-xs font-semibold uppercase text-muted">
                {GOAL_ASSET_LABELS[group.assetType]}
              </Text>
              {group.rows.map(({ allocation, index }) => {
                const key = allocationKey(allocation);
                return (
                  <AllocationRow
                    key={key}
                    allocation={allocation}
                    holding={holdingsByKey.get(key) ?? null}
                    available={freePercent(allocated, key)}
                    schemaError={errors?.[index]?.percent?.message}
                    onPercentChange={(percent) => setPercent(index, percent)}
                    onRemove={() => remove(index)}
                  />
                );
              })}
            </View>
          ))
        ) : (
          <Text className="pb-3 text-sm text-muted">
            {isLoading
              ? 'Loading your holdings…'
              : 'No holdings linked. Add a share of any fund, stock, crypto, gold, EPF or deposit.'}
          </Text>
        )}
        {value.length > 0 && (
          <Text className="border-t border-border py-3 text-xs text-muted">
            {`${formatRupees(linkedTotal)} linked across ${value.length} ${value.length === 1 ? 'holding' : 'holdings'}`}
          </Text>
        )}
      </View>
      <AddButton label="Add holdings" onPress={() => setPickerOpen(true)} />
      <HoldingPickerModal
        visible={pickerOpen}
        holdings={holdings}
        excludedKeys={includedKeys}
        allocated={allocated}
        onClose={() => setPickerOpen(false)}
        onAdd={addHoldings}
      />
    </View>
  );
}

export function hasOverAllocation(
  allocations: GoalAllocation[],
  allocated: Record<string, number>
): boolean {
  return allocations.some(
    (allocation) =>
      Number.isFinite(allocation.percent) &&
      isOverAllocated(allocation.percent, freePercent(allocated, allocationKey(allocation)))
  );
}
