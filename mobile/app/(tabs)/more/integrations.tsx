import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useUserProfileQuery } from '@myfinances/core/api/query/profile';
import { useRegenerateIngestTokenMutation } from '@myfinances/core/api/mutations/profile';
import { useUpdateIngestSenderEmailMutation } from '@myfinances/core/api/mutations/auth';
import { Button, Card, Field, Label, LoadingState, Row, Screen } from '@/components/ui';
import { errorMessage } from '@/components/FormScreen';

const INGEST_INBOX = 'transactions-ingest@my-finances.site';
const WEB_INTEGRATIONS_URL = 'https://www.my-finances.site/integrations';

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <View className="gap-1">
      <Label>{label}</Label>
      <View className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
        <Text className="flex-1 text-sm text-foreground" selectable numberOfLines={1}>
          {value}
        </Text>
        <Pressable
          onPress={() => {
            Clipboard.setStringAsync(value);
            setCopied(true);
          }}
          accessibilityRole="button"
        >
          <Text className="text-xs font-semibold text-foreground">
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function IntegrationsScreen() {
  const profileQuery = useUserProfileQuery();
  const regenerate = useRegenerateIngestTokenMutation();
  const saveSender = useUpdateIngestSenderEmailMutation();
  const [senderEmail, setSenderEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (profileQuery.isLoading || !profileQuery.data) return <LoadingState />;
  const profile = profileQuery.data;
  const senderValue = senderEmail ?? profile.ingestSenderEmail ?? '';

  const confirmRegenerate = () =>
    Alert.alert(
      'Regenerate token?',
      'Your existing Shortcut stops working until you paste the new token into it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () =>
            regenerate.mutate(undefined, {
              onError: (error) => setMessage(errorMessage(error)),
            }),
        },
      ]
    );

  const saveSenderEmail = async () => {
    setMessage(null);
    try {
      await saveSender.mutateAsync(senderValue.trim() || null);
      setMessage('Sender email saved');
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };

  return (
    <Screen underHeader>
      <Stack.Screen options={{ title: 'Integrations' }} />
      {message ? <Text className="text-sm text-foreground">{message}</Text> : null}

      <Card>
        <Text className="text-base font-semibold text-foreground">UPI auto-track</Text>
        <Label>
          Bank SMS for UPI payments are emailed to the inbox below by a phone automation and logged
          as expenses. They appear in the Expenses tab the next time it loads.
        </Label>
        {profile.ingestToken ? (
          <CopyRow label="Your ingest token" value={profile.ingestToken} />
        ) : (
          <Label>Token unavailable. Pull to refresh on the web integrations page.</Label>
        )}
        <CopyRow label="Send to" value={INGEST_INBOX} />
        <Row label="Subject" value="UPI Transaction" />
        <Button
          label="Regenerate token"
          variant="secondary"
          onPress={confirmRegenerate}
          loading={regenerate.isPending}
        />
      </Card>

      <Card>
        <Text className="text-base font-semibold text-foreground">Sender email</Text>
        <Label>Only emails from this address are accepted as your UPI messages.</Label>
        <Field
          label="Email the automation sends from"
          value={senderValue}
          onChangeText={setSenderEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          label="Save sender email"
          onPress={saveSenderEmail}
          loading={saveSender.isPending}
          disabled={senderValue.trim() === (profile.ingestSenderEmail ?? '')}
        />
      </Card>

      <Card>
        <Text className="text-base font-semibold text-foreground">On the web</Text>
        <Label>
          Gmail import (CDSL and SafeGold statements), PDF passwords, EPF passbook upload and Claude
          connection are set up on the website.
        </Label>
        <Button
          label="Open web integrations"
          variant="secondary"
          onPress={() => WebBrowser.openBrowserAsync(WEB_INTEGRATIONS_URL)}
        />
      </Card>
    </Screen>
  );
}
