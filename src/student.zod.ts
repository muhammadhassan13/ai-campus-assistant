import { z } from 'zod';

export enum StudentStatus {
  Active = 'Active',
  Graduated = 'Graduated',
  Suspended = 'Suspended',
}

export enum Degree {
  ComputerScience = 'BS Computer Science',
  SoftwareEngineering = 'BS Software Engineering',
  DataScience = 'BS Data Science',
  ArtificialIntelligence = 'BS Artificial Intelligence',
  Null = 'Not specified',
}

const allowedDegrees = Object.values(Degree) as [string, ...string[]];

export const createStudentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email format'),
  degree: z.enum(allowedDegrees, {
    message: `Invalid degree. Must be one of: ${allowedDegrees.join(', ')}`,
  }),
  gpa: z
    .number()
    .min(0.0, 'GPA must be at least 0.0')
    .max(4.0, 'GPA cannot exceed 4.0'),
  status: z.nativeEnum(StudentStatus).optional().default(StudentStatus.Active),
});

export const updateStudentSchema = createStudentSchema;
export const patchStudentSchema = createStudentSchema.partial();

export interface IStudent {
  id: number;
  name: string;
  email: string;
  degree: string;
  gpa: number;
  status: string;
}

export class Student implements IStudent {
  constructor(
    public name: string,
    public email: string,
    public degree: string = Degree.Null,
    public gpa: number = 0.0,
    public status: string = StudentStatus.Active,
    public id: number = 0
  ) {
    if (!name || name.trim() === '') {
      throw new Error('Student name cannot be empty');
    }
    if (!email.includes('@')) {
      throw new Error('Invalid email address format');
    }
    if (gpa < 0.0 || gpa > 4.0) {
      throw new Error('Invalid GPA! Must be between 0.0 and 4.0');
    }
  }
}
