import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Control, Controller, FieldValues, Path, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  mobileDemoLogin,
  mobileLogin,
  mobileSignup,
  MobileSession,
} from '@myfinances/core/api/mobileAuth';
import type { ApiError } from '@myfinances/core/api/client';
import {
  loginSchema,
  LoginValues,
  signupSchema,
  SignupValues,
} from '@myfinances/core/schemas/auth';
import { Button, Field } from '@/components/ui';
import { useSession } from '@/lib/session';

const FORGOT_PASSWORD_URL = 'https://www.my-finances.site/forgot-password';

type Pending = 'form' | 'demo' | null;

function FormField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  ...inputProps
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
} & React.ComponentProps<typeof Field>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field
          label={label}
          value={field.value}
          onChangeText={field.onChange}
          error={error}
          {...inputProps}
        />
      )}
    />
  );
}

function LoginForm({
  onSubmit,
  pending,
}: {
  onSubmit: (v: LoginValues) => void;
  pending: Pending;
}) {
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  return (
    <>
      <FormField
        control={control}
        name="email"
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={formState.errors.email?.message}
      />
      <FormField
        control={control}
        name="password"
        label="Password"
        secureTextEntry
        autoComplete="current-password"
        error={formState.errors.password?.message}
      />
      <Button
        label="Sign in"
        onPress={handleSubmit(onSubmit)}
        loading={pending === 'form'}
        disabled={pending !== null}
      />
    </>
  );
}

function SignupForm({
  onSubmit,
  pending,
}: {
  onSubmit: (v: SignupValues) => void;
  pending: Pending;
}) {
  const { control, handleSubmit, formState } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });
  return (
    <>
      <FormField
        control={control}
        name="name"
        label="Name"
        autoComplete="name"
        error={formState.errors.name?.message}
      />
      <FormField
        control={control}
        name="email"
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={formState.errors.email?.message}
      />
      <FormField
        control={control}
        name="password"
        label="Password"
        secureTextEntry
        autoComplete="new-password"
        error={formState.errors.password?.message}
      />
      <FormField
        control={control}
        name="confirmPassword"
        label="Confirm password"
        secureTextEntry
        autoComplete="new-password"
        error={formState.errors.confirmPassword?.message}
      />
      <Button
        label="Create account"
        onPress={handleSubmit(onSubmit)}
        loading={pending === 'form'}
        disabled={pending !== null}
      />
    </>
  );
}

export default function LoginScreen() {
  const token = useSession((state) => state.token);
  const signIn = useSession((state) => state.signIn);
  const [isSignup, setIsSignup] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  if (token) return <Redirect href="/(tabs)/today" />;

  const run = async (kind: Exclude<Pending, null>, action: () => Promise<MobileSession>) => {
    setServerError(null);
    setPending(kind);
    try {
      await signIn(await action());
      router.replace('/(tabs)/today');
    } catch (error) {
      setServerError((error as ApiError).message ?? 'Something went wrong');
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center gap-6 px-6"
      >
        <View className="gap-1">
          <Text className="text-3xl font-bold text-foreground">MyFinances</Text>
          <Text className="text-sm text-muted">
            {isSignup ? 'Create an account' : 'Sign in to your account'}
          </Text>
        </View>

        <View className="gap-4">
          {isSignup ? (
            <SignupForm
              pending={pending}
              onSubmit={({ name, email, password }) =>
                run('form', () => mobileSignup({ name, email, password }))
              }
            />
          ) : (
            <LoginForm
              pending={pending}
              onSubmit={(values) => run('form', () => mobileLogin(values))}
            />
          )}
          {serverError ? <Text className="text-sm text-loss">{serverError}</Text> : null}
          <Button
            label="Try the demo"
            variant="secondary"
            onPress={() => run('demo', mobileDemoLogin)}
            loading={pending === 'demo'}
            disabled={pending !== null}
          />
        </View>

        <View className="flex-row justify-between">
          <Pressable onPress={() => setIsSignup(!isSignup)}>
            <Text className="text-sm text-foreground">
              {isSignup ? 'I already have an account' : 'Create an account'}
            </Text>
          </Pressable>
          {!isSignup && (
            <Pressable onPress={() => WebBrowser.openBrowserAsync(FORGOT_PASSWORD_URL)}>
              <Text className="text-sm text-muted">Forgot password?</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
