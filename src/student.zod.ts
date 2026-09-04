import { z } from 'zod';

// Base Enums
export const DegreeEnum = z.enum([
  'BS Computer Science',
  'BS Software Engineering',
  'BS Data Science',
  'BS Artificial Intelligence',
  'Not specified',
]);

export const StatusEnum = z.enum([
  'Active',
  'Inactive',
  'Graduated',
  'Suspended',
]);

// Schemas
export const createStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  degree: DegreeEnum,
  gpa: z.number().min(0).max(4),
  status: StatusEnum,
});

export const updateStudentSchema = createStudentSchema.partial();
export const patchStudentSchema = createStudentSchema.partial();

// Layer DTO Types
export type CreateStudentDTO = z.infer<typeof createStudentSchema>;
export type UpdateStudentDTO = z.infer<typeof updateStudentSchema>;

export interface StudentResponseDTO {
  student_id: number;
  name: string;
  email: string;
  degree: string;
  gpa: number;
  status: string;
}

export interface AuthResponseDTO {
  token: string;
  student: StudentResponseDTO;
}

// Internal Repository Data Payloads
export interface StudentRecord extends StudentResponseDTO {
  password_hash: string;
}

export type CreateStudentRepoPayload = Omit<StudentRecord, 'student_id'>;
export type UpdateStudentRepoPayload = Partial<CreateStudentRepoPayload>;
