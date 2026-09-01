import { z } from 'zod';

export const createStudentSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  degree: z.string().min(1, 'Degree is required'),
  gpa: z
    .number()
    .min(0, 'GPA must be at least 0.0')
    .max(4.0, 'GPA cannot exceed 4.0'),
});

export const updateStudentSchema = createStudentSchema.omit({ id: true });
export const patchStudentSchema = updateStudentSchema.partial();

// Existing Interfaces & Enums
export enum StudentStatus {
  Active = 'ACTIVE',
  Graduated = 'GRADUATED',
  Suspended = 'SUSPENDED',
}

export enum Degree {
  ComputerScience = 'Computer Science',
  SoftwareEngineering = 'Software Engineering',
  DataScience = 'Data Science',
  ArtificialIntelligence = 'Artificial Intelligence',
  Null = 'Not specified',
}

export interface IStudent {
  id: number;
  name: string;
  email: string;
  degree: Degree;
  gpa: number;
  status: StudentStatus;
}

export class Student implements IStudent {
  constructor(
    public id: number,
    public name: string,
    public email: string,
    public degree: Degree = Degree.Null,
    public gpa: number,
    public status: StudentStatus = StudentStatus.Active
  ) {
    if (!name || name.trim() === '') {
      throw new Error('Student name cannot be empty');
    }
    if (!email.includes('@')) {
      throw new Error('Invalid email address format');
    }
    this.validateGpa(gpa);
  }

  public updateStatus(newStatus: StudentStatus): void {
    this.status = newStatus;
  }

  public updateGpa(newGpa: number): void {
    this.validateGpa(newGpa);
    this.gpa = newGpa;
  }

  public validateGpa(gpa: number): void {
    if (gpa < 0.0 || gpa > 4.0) {
      throw new Error('Invalid GPA! Must be between 0.0 and 4.0');
    }
  }

  public getDetails(): string {
    return `[${this.id}] ${this.name} | Department: ${this.degree} | GPA: ${this.gpa} | Status: ${this.status}`;
  }
}
