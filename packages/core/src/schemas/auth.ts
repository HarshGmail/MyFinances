import { z } from 'zod';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 6;

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, { message: 'Password must be at least 6 characters' }),
});

export const signupSchema = loginSchema
  .extend({
    name: z
      .string()
      .min(MIN_NAME_LENGTH, { message: 'Name is required' })
      .max(MAX_NAME_LENGTH, { message: 'Name cannot be longer than 50 characters' }),
    confirmPassword: z.string().min(MIN_PASSWORD_LENGTH, { message: 'Confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
