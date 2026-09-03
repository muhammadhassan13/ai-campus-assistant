import { z } from 'zod';

export const createStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  degree: z.enum([
    'BS Computer Science',
    'BS Software Engineering',
    'BS Data Science',
    'BS Artificial Intelligence',
    'Not specified',
  ]),
  gpa: z.number().min(0.0).max(4.0).default(0.0),
  status: z
    .enum(['Active', 'Inactive', 'Graduated', 'Suspended'])
    .default('Active'),
});

export const updateStudentSchema = createStudentSchema.extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
});

export const patchStudentSchema = createStudentSchema.partial();
