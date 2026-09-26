'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushConfigQuery } from '@myfinances/core/api';
import { isStandaloneDisplayMode, isIosDevice } from '@/lib/pwa';
import { InstallAppButton } from '@/components/custom/InstallAppButton';
import {
  getExistingPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/utils/webPush';

export default function NotificationsIntegration() {
  const { data: config, isLoading } = usePushConfigQuery();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isInstalledApp, setIsInstalledApp] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const requiresInstallForPush = isIos;

  const refreshSubscription = useCallback(async () => {
    setIsSubscribed(Boolean(await getExistingPushSubscription()));
  }, []);

  useEffect(() => {
    setIsSupported(isPushSupported());
    setIsInstalledApp(isStandaloneDisplayMode());
    setIsIos(isIosDevice());
    refreshSubscription();
  }, [refreshSubscription]);

  const handleSubscribe = async () => {
    if (!config?.publicKey) return;
    setIsBusy(true);
    try {
      await subscribeToPush(config.publicKey);
      await refreshSubscription();
      toast.success('Notifications enabled');
    } catch (error) {
      toast.error('Could not enable notifications', {
        description: (error as Error)?.message,
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsBusy(true);
    try {
      await unsubscribeFromPush();
      await refreshSubscription();
      toast.success('Notifications disabled');
    } catch (error) {
      toast.error('Could not disable notifications', {
        description: (error as Error)?.message,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get notified when a long-running job finishes — starting with email import.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <InstallAppButton />

        {!isSupported && (
          <p className="text-sm text-muted-foreground">
            This browser does not support push notifications.
          </p>
        )}

        {isSupported && !isInstalledApp && requiresInstallForPush && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">Add the app to your Home Screen first</p>
            <p className="text-muted-foreground mt-1">
              On iPhone, notifications only work from the installed app. In Safari, tap Share → Add
              to Home Screen, then open MyFinance from your Home Screen and come back here.
            </p>
          </div>
        )}

        {isSupported && !isLoading && !config?.enabled && (
          <p className="text-sm text-muted-foreground">
            Push notifications are not configured on the server yet.
          </p>
        )}

        {isSupported && config?.enabled && (
          <Button
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isBusy}
            variant={isSubscribed ? 'outline' : 'default'}
            className="gap-2"
          >
            {isSubscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {isSubscribed ? 'Disable notifications' : 'Enable notifications'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
