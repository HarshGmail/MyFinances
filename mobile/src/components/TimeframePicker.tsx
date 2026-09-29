import { Pressable, Text, View } from 'react-native';

export interface Timeframe {
  label: string;
  days: number;
}

export function TimeframePicker({
  timeframes,
  selected,
  onSelect,
}: {
  timeframes: Timeframe[];
  selected: string;
  onSelect: (label: string) => void;
}) {
  return (
    <View className="flex-row gap-1.5">
      {timeframes.map((timeframe) => {
        const isSelected = timeframe.label === selected;
        return (
          <Pressable
            key={timeframe.label}
            onPress={() => onSelect(timeframe.label)}
            className={`h-8 flex-1 items-center justify-center rounded-md ${isSelected ? 'bg-foreground' : 'bg-accent'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              className={
                isSelected ? 'text-xs font-semibold text-background' : 'text-xs text-foreground'
              }
            >
              {timeframe.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
