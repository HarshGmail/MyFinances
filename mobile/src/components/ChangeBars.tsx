import { Text, View } from 'react-native';
import { formatSignedCurrency, formatSignedPercent } from '@myfinances/core/calc/numbers';
import { changeClass, changeColor } from '@/lib/theme';

export interface ChangeBar {
  label: string;
  change: number;
  changePct: number;
}

const BAR_HEIGHT = 10;
const FULL_WIDTH_PERCENT = 100;

export function ChangeBars({ bars }: { bars: ChangeBar[] }) {
  const sorted = [...bars].sort((a, b) => b.change - a.change);
  const largest = Math.max(...sorted.map((bar) => Math.abs(bar.change)), 1);

  return (
    <View className="gap-3">
      {sorted.map((bar) => {
        const barWidth = `${(Math.abs(bar.change) / largest) * FULL_WIDTH_PERCENT}%` as const;
        const isGain = bar.change >= 0;
        return (
          <View
            key={bar.label}
            className="gap-1"
            accessible
            accessibilityLabel={`${bar.label} ${formatSignedCurrency(bar.change)}`}
          >
            <View className="flex-row justify-between">
              <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>
                {bar.label}
              </Text>
              <Text className={`text-xs font-medium ${changeClass(bar.change)}`}>
                {formatSignedCurrency(bar.change)} ({formatSignedPercent(bar.changePct)})
              </Text>
            </View>
            <View className="flex-row" style={{ height: BAR_HEIGHT }}>
              <View className="flex-1 flex-row justify-end">
                {!isGain && (
                  <View
                    className="rounded-l"
                    style={{ width: barWidth, backgroundColor: changeColor(bar.change) }}
                  />
                )}
              </View>
              <View className="w-px bg-muted" />
              <View className="flex-1 flex-row">
                {isGain && (
                  <View
                    className="rounded-r"
                    style={{ width: barWidth, backgroundColor: changeColor(bar.change) }}
                  />
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function BreadthBar({ advancers, decliners }: { advancers: number; decliners: number }) {
  const counted = advancers + decliners;
  if (counted === 0) return null;
  return (
    <View
      className="h-1.5 flex-row gap-0.5 overflow-hidden rounded-full"
      accessible
      accessibilityLabel={`${advancers} up, ${decliners} down`}
    >
      {advancers > 0 && <View className="rounded-full bg-gain" style={{ flex: advancers }} />}
      {decliners > 0 && <View className="rounded-full bg-loss" style={{ flex: decliners }} />}
    </View>
  );
}
