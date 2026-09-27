import { Alert, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useUserProfileQuery } from '@myfinances/core/api/query/profile';
import { useLogoutMutation } from '@myfinances/core/api/mutations/logout';
import { Button, Card, Label, Row, Screen } from '@/components/ui';
import { useSession } from '@/lib/session';
import { signOutLocally } from '@/lib/configureMobileApi';
import { colors } from '@/lib/theme';

const APP_LINKS: { label: string; description: string; href: Href }[] = [
  { label: 'Vault', description: 'PIN-locked, end-to-end encrypted', href: '/more/vault' },
  { label: 'Goals', description: 'Targets and progress', href: '/more/goals' },
  { label: 'Salary', description: 'Salary history and payments', href: '/more/salary' },
  {
    label: 'Integrations',
    description: 'UPI auto-track token and sender',
    href: '/more/integrations',
  },
];

export default function MoreScreen() {
  const user = useSession((state) => state.user);
  const profileQuery = useUserProfileQuery();
  const logout = useLogoutMutation();

  const confirmLogout = () =>
    Alert.alert('Sign out?', 'You will need to sign in again on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () =>
          logout.mutate(undefined, {
            onSettled: async () => {
              await signOutLocally();
              router.replace('/login');
            },
          }),
      },
    ]);

  return (
    <Screen title="More">
      <Card>
        <Label>Signed in as</Label>
        <Text className="text-lg font-semibold text-foreground">
          {profileQuery.data?.userName ?? user?.name}
        </Text>
        <Text className="text-sm text-muted">{profileQuery.data?.userEmail ?? user?.email}</Text>
        {profileQuery.data?.phone ? <Row label="Phone" value={profileQuery.data.phone} /> : null}
        {profileQuery.data?.panNumber ? (
          <Row label="PAN" value={profileQuery.data.panNumber} />
        ) : null}
        <View className="flex-row gap-4 pt-2">
          <Pressable onPress={() => router.push('/more/edit-profile')} className="flex-1">
            <Text className="text-sm font-semibold text-foreground">Edit profile</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/more/change-password')} className="flex-1">
            <Text className="text-sm font-semibold text-foreground">Change password</Text>
          </Pressable>
        </View>
      </Card>

      <View className="overflow-hidden rounded-xl border border-border bg-card">
        {APP_LINKS.map((link, index) => (
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

      <Button
        label="Sign out"
        variant="danger"
        onPress={confirmLogout}
        loading={logout.isPending}
      />
    </Screen>
  );
}
