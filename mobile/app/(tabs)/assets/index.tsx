import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Screen } from '@/components/ui';
import { colors } from '@/lib/theme';

const ASSET_LINKS: { label: string; description: string; href: Href }[] = [
  { label: 'Stocks', description: 'Holdings, day change, XIRR', href: '/assets/stocks' },
  { label: 'Mutual Funds', description: 'Funds, NAV moves, XIRR', href: '/assets/mutual-funds' },
  { label: 'Gold', description: 'SafeGold holdings and leases', href: '/assets/gold' },
  { label: 'Crypto', description: 'Coins at CoinDCX prices', href: '/assets/crypto' },
  { label: 'EPF', description: 'Balance, contributions, interest', href: '/assets/epf' },
  { label: 'Deposits', description: 'Fixed and recurring deposits', href: '/assets/deposits' },
  {
    label: 'Transactions',
    description: 'Add, edit and delete buys and sells',
    href: '/assets/transactions',
  },
];

export default function AssetsHub() {
  return (
    <Screen title="Assets">
      <View className="overflow-hidden rounded-xl border border-border bg-card">
        {ASSET_LINKS.map((link, index) => (
          <Pressable
            key={link.label}
            onPress={() => router.push(link.href)}
            className={`flex-row items-center justify-between px-4 py-4 ${index > 0 ? 'border-t border-border' : ''}`}
          >
            <View className="gap-0.5">
              <Text className="text-base font-medium text-foreground">{link.label}</Text>
              <Text className="text-xs text-muted">{link.description}</Text>
            </View>
            <ChevronRight color={colors.muted} size={18} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
