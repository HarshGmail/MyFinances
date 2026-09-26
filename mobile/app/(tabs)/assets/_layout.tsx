import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AssetsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="stocks" options={{ title: 'Stocks' }} />
      <Stack.Screen name="mutual-funds" options={{ title: 'Mutual Funds' }} />
      <Stack.Screen name="gold" options={{ title: 'Gold' }} />
      <Stack.Screen name="crypto" options={{ title: 'Crypto' }} />
      <Stack.Screen name="epf" options={{ title: 'EPF' }} />
      <Stack.Screen name="deposits" options={{ title: 'Deposits' }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Stack.Screen name="forms" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
