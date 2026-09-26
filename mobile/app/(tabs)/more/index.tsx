import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronRight } from 'lucide-react-native';
import { useUserProfileQuery } from '@myfinances/core/api/query/profile';
import { useLogoutMutation } from '@myfinances/core/api/mutations/logout';
import { Button, Card, Label, Row, Screen } from '@/components/ui';
import { useSession } from '@/lib/session';
import { signOutLocally } from '@/lib/configureMobileApi';
import { colors } from '@/lib/theme';

const WEB_APP_URL = 'https://www.my-finances.site';

const WEB_ONLY_LINKS = [
  { label: 'Goals', path: '/goals' },
  { label: 'Integrations', path: '/integrations' },
  { label: 'Stock research', path: '/stocks/detail' },
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
      </Card>

      <View className="overflow-hidden rounded-xl border border-border bg-card">
        {WEB_ONLY_LINKS.map((link, index) => (
          <Pressable
            key={link.path}
            onPress={() => WebBrowser.openBrowserAsync(`${WEB_APP_URL}${link.path}`)}
            className={`flex-row items-center justify-between px-4 py-4 ${index > 0 ? 'border-t border-border' : ''}`}
          >
            <Text className="text-base text-foreground">{link.label}</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs text-muted">on web</Text>
              <ChevronRight color={colors.muted} size={18} />
            </View>
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
