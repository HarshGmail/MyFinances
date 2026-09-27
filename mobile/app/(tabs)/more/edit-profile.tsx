import { useState } from 'react';
import { Stack, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserProfileQuery } from '@myfinances/core/api/query/profile';
import { useUpdateUserProfileMutation } from '@myfinances/core/api/mutations/profile';
import { UserProfile } from '@myfinances/core/types';
import { DateField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { LoadingState, Label } from '@/components/ui';

const profileSchema = z.object({
  userName: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  dob: z.date().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfileForm({ profile }: { profile: UserProfile }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useUpdateUserProfileMutation();
  const { control, handleSubmit } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      userName: profile.userName ?? '',
      phone: profile.phone ?? '',
      dob: profile.dob ? new Date(profile.dob) : undefined,
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await mutation.mutateAsync({
        data: {
          userName: values.userName,
          phone: values.phone || undefined,
          dob: values.dob ? values.dob.toISOString() : undefined,
        },
      });
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <FormScreen
      submitLabel="Save"
      onSubmit={submit}
      submitting={mutation.isPending}
      error={serverError}
    >
      <TextField control={control} name="userName" label="Name" />
      <TextField control={control} name="phone" label="Phone" keyboardType="phone-pad" />
      <DateField control={control} name="dob" label="Date of birth" />
      <Label>PAN and email can be changed on the web.</Label>
    </FormScreen>
  );
}

export default function EditProfileScreen() {
  const { data, isLoading } = useUserProfileQuery();

  return (
    <>
      <Stack.Screen options={{ title: 'Edit profile' }} />
      {isLoading || !data ? <LoadingState /> : <ProfileForm profile={data} />}
    </>
  );
}
