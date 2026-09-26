import { Redirect } from 'expo-router';
import { useSession } from '@/lib/session';

export default function Index() {
  const token = useSession((state) => state.token);
  return <Redirect href={token ? '/(tabs)/today' : '/login'} />;
}
