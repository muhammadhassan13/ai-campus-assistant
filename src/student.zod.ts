import { z } from 'zod';

const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const degreeEnum = z.enum([
  'BS Computer Science',
  'BS Software Engineering',
  'BS Data Science',
  'BS Artificial Intelligence',
  'Not specified',
]);

export const statusEnum = z.enum([
  'Active',
  'Inactive',
  'Graduated',
  'Suspended',
]);

// POST /api/students (Registration Schema)
export const createStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordValidation,
  degree: degreeEnum.default('Not specified'),
  gpa: z.number().min(0.0).max(4.0).default(0.0),
  status: statusEnum.default('Active'),
});

// PUT & PATCH /api/students/:id (Supports updating any field individually or together)
export const updateStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: passwordValidation.optional(),
  degree: degreeEnum.optional(),
  gpa: z.number().min(0.0).max(4.0).optional(),
  status: statusEnum.optional(),
});

export const patchStudentSchema = updateStudentSchema;
