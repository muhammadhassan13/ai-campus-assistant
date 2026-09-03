import type { Request, Response } from 'express';
import { StudentService } from '../services/student.service.js';
import { createStudentSchema, updateStudentSchema } from '../student.zod.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ZodError } from 'zod';

export class StudentController {
  // Parses login request and delegates authentication to service
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: 'Email and password are required' });
      }

      const authData = await StudentService.authenticateUser(email, password);
      return res.json({ message: 'Login successful', ...authData });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      return res.status(500).json({ error: 'Failed to authenticate user' });
    }
  }

  // Fetches list of all students through service
  static async getAll(_req: Request, res: Response) {
    try {
      const students = await StudentService.getAllStudents();
      return res.json(students);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch students' });
    }
  }

  // Fetches single student profile by URL parameter ID
  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      const student = await StudentService.getStudentById(id);

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      return res.json(student);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch student' });
    }
  }

  // Validates payload with Zod and triggers student registration service
  static async create(req: Request, res: Response) {
    try {
      const validatedData = createStudentSchema.parse(req.body);
      const student = await StudentService.registerStudent(validatedData);
      return res
        .status(201)
        .json({ message: 'Student created successfully', student });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      return res.status(500).json({ error: 'Failed to create student' });
    }
  }

  // Validates update schema and calls student update service
  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      const validatedData = updateStudentSchema.parse(req.body);

      const updatedStudent = await StudentService.updateStudent(
        id,
        validatedData
      );
      if (!updatedStudent) {
        return res.status(404).json({ error: 'Student not found' });
      }

      return res.json({
        message: 'Student updated successfully',
        student: updatedStudent,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      return res.status(500).json({ error: 'Failed to update student' });
    }
  }

  // Receives delete request and invokes student removal service
  static async deleteOne(req: AuthenticatedRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      const deleted = await StudentService.removeStudent(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Student not found' });
      }
      return res.json({ message: 'Student deleted successfully' });
    } catch {
      return res.status(500).json({ error: 'Failed to delete student' });
    }
  }
}
