import { Stack } from 'expo-router';
import { VaultSessionProvider } from '@/features/vault/VaultSession';
import { colors } from '@/lib/theme';

export default function VaultLayout() {
  return (
    <VaultSessionProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Vault' }} />
        <Stack.Screen name="item" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="wallets" options={{ title: 'Wallets' }} />
        <Stack.Screen name="wallet" />
      </Stack>
    </VaultSessionProvider>
  );
}
