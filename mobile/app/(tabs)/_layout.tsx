import { Redirect, Tabs } from 'expo-router';
import { Activity, House, Layers, Receipt, Ellipsis } from 'lucide-react-native';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const TAB_ICON_SIZE = 22;

export default function TabsLayout() {
  const token = useSession((state) => state.token);
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Activity color={color} size={TAB_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <House color={color} size={TAB_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          tabBarIcon: ({ color }) => <Layers color={color} size={TAB_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color }) => <Receipt color={color} size={TAB_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Ellipsis color={color} size={TAB_ICON_SIZE} />,
        }}
      />
    </Tabs>
  );
}
