import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { apiRequest } from '@myfinances/core/api/client';
import { useSession } from './session';

const GRANTED = 'granted';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function obtainExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const existing = await Notifications.getPermissionsAsync();
  const status =
    existing.status === GRANTED
      ? existing.status
      : (await Notifications.requestPermissionsAsync()).status;
  if (status !== GRANTED) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export function usePushRegistration() {
  const token = useSession((state) => state.token);

  useEffect(() => {
    if (!token) return;
    obtainExpoPushToken()
      .then((pushToken) =>
        pushToken
          ? apiRequest({
              endpoint: '/push/expo-token',
              method: 'POST',
              body: { token: pushToken, platform: Platform.OS },
            })
          : null
      )
      .catch(() => undefined);
  }, [token]);
}
