import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import type { VaultCategory, VaultCustomField, VaultItemContent } from '@myfinances/core/types';
import {
  applyDerivedFields,
  emptyContentFor,
  formatVaultFieldInput,
  getCategoryDef,
} from '@myfinances/core/vault/vaultTypes';
import { Field, Label } from '@/components/ui';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { useVaultSession } from '@/features/vault/VaultSession';

const EMPTY_CUSTOM_FIELD: VaultCustomField = { label: '', value: '', secret: false };

export default function VaultItemScreen() {
  usePreventScreenCapture();
  const { id, category: categoryParam } = useLocalSearchParams<{
    id?: string;
    category?: VaultCategory;
  }>();
  const { isUnlocked, items, saveItem, isBusy, markActivity } = useVaultSession();
  const existing = id ? items.find((item) => item.id === id) : undefined;
  const category: VaultCategory = existing?.category ?? categoryParam ?? 'other';
  const definition = getCategoryDef(category);
  const [content, setContent] = useState<VaultItemContent>(
    () => existing?.content ?? emptyContentFor(category)
  );
  const [error, setError] = useState<string | null>(null);

  if (!isUnlocked) return <Redirect href="/more/vault" />;

  const setField = (name: string, value: string) => {
    markActivity();
    setContent((current) => ({ ...current, fields: { ...current.fields, [name]: value } }));
  };

  const setCustomField = (index: number, patch: Partial<VaultCustomField>) => {
    markActivity();
    setContent((current) => ({
      ...current,
      customFields: current.customFields.map((field, i) =>
        i === index ? { ...field, ...patch } : field
      ),
    }));
  };

  const submit = async () => {
    const title = content.fields[definition.titleField]?.trim();
    if (!title) {
      setError(
        `${definition.fields.find((f) => f.name === definition.titleField)?.label} is required`
      );
      return;
    }
    setError(null);
    try {
      await saveItem(category, applyDerivedFields(category, content), existing?.id);
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{ title: existing ? `Edit ${definition.singular}` : `New ${definition.singular}` }}
      />
      <FormScreen
        submitLabel={existing ? 'Save changes' : 'Save entry'}
        onSubmit={submit}
        submitting={isBusy}
        error={error}
      >
        {definition.fields
          .filter((field) => !field.derived)
          .map((field) => (
            <Field
              key={field.name}
              label={field.label}
              placeholder={field.placeholder}
              value={content.fields[field.name] ?? ''}
              onChangeText={(value) =>
                setField(
                  field.name,
                  field.format ? formatVaultFieldInput(field.format, value) : value
                )
              }
              secureTextEntry={field.secret}
              multiline={field.multiline}
              autoCorrect={false}
              autoCapitalize={field.secret ? 'none' : 'sentences'}
              keyboardType={field.format ? 'number-pad' : 'default'}
            />
          ))}

        <View className="gap-3">
          <Label>Custom fields</Label>
          {content.customFields.map((field, index) => (
            <View key={index} className="gap-2 rounded-lg border border-border p-3">
              <Field
                label="Label"
                value={field.label}
                onChangeText={(label) => setCustomField(index, { label })}
              />
              <Field
                label="Value"
                value={field.value}
                secureTextEntry={field.secret}
                autoCorrect={false}
                onChangeText={(value) => setCustomField(index, { value })}
              />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-foreground">Secret</Text>
                <Switch
                  value={field.secret}
                  onValueChange={(secret) => setCustomField(index, { secret })}
                />
              </View>
              <Pressable
                onPress={() =>
                  setContent((current) => ({
                    ...current,
                    customFields: current.customFields.filter((_, i) => i !== index),
                  }))
                }
              >
                <Text className="text-xs text-loss">Remove field</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() =>
              setContent((current) => ({
                ...current,
                customFields: [...current.customFields, EMPTY_CUSTOM_FIELD],
              }))
            }
          >
            <Text className="text-sm font-semibold text-foreground">+ Add custom field</Text>
          </Pressable>
        </View>
      </FormScreen>
    </>
  );
}
