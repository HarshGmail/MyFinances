import { Pressable, Text, View } from 'react-native';
import { Delete } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export const PIN_LENGTH = 6;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

export function PinPad({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (key === 'back') onChange(value.slice(0, -1));
    else if (key && value.length < PIN_LENGTH) onChange(value + key);
  };

  return (
    <View className="items-center gap-8">
      <View
        className="flex-row gap-3"
        accessible
        accessibilityLabel={`${value.length} of ${PIN_LENGTH} digits entered`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <View
            key={index}
            className={`h-3.5 w-3.5 rounded-full ${index < value.length ? 'bg-foreground' : 'border border-muted'}`}
          />
        ))}
      </View>
      <View className="w-72 flex-row flex-wrap">
        {KEYS.map((key, index) => (
          <View key={`${key}-${index}`} className="w-1/3 items-center p-2">
            {key ? (
              <Pressable
                onPress={() => press(key)}
                disabled={disabled}
                className="h-16 w-16 items-center justify-center rounded-full bg-card active:bg-accent"
                accessibilityRole="button"
                accessibilityLabel={key === 'back' ? 'Delete digit' : key}
              >
                {key === 'back' ? (
                  <Delete color={colors.foreground} size={22} />
                ) : (
                  <Text className="text-2xl text-foreground">{key}</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
