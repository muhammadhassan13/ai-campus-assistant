import type { Request, Response } from 'express';
import { StudentService } from '../services/student.service.js';
import { createStudentSchema, updateStudentSchema } from '../student.zod.js';

export class StudentController {
  static async patchStudent(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid student ID' });
      }

      const validatedData = updateStudentSchema.parse(req.body);
      const updatedStudent = await StudentService.updateStudent(
        id,
        validatedData
      );

      if (!updatedStudent) {
        return res.status(404).json({ error: 'Student not found' });
      }

      return res.status(200).json({
        message: 'Student partially updated successfully',
        student: updatedStudent,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';

      return res.status(400).json({
        error: 'Failed to patch student',
        details: errorMessage,
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const result = await StudentService.authenticateUser(
        String(email),
        String(password)
      );

      return res.status(200).json({ message: 'Login successful', ...result });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      return res.status(401).json({
        error: 'Invalid email or password',
        details: errorMessage,
      });
    }
  }

  static async getAll(_req: Request, res: Response) {
    try {
      const students = await StudentService.getAllStudents();
      return res.status(200).json(students);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch students' });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      const student = await StudentService.getStudentById(id);
      if (!student) return res.status(404).json({ error: 'Student not found' });
      return res.status(200).json(student);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch student' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const validatedData = createStudentSchema.parse(req.body);
      const newStudent = await StudentService.registerStudent(validatedData);
      return res
        .status(201)
        .json({ message: 'Student created', student: newStudent });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error';
      return res
        .status(400)
        .json({ error: 'Failed to create student', details: errorMessage });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      const validatedData = createStudentSchema.parse(req.body);
      const updatedStudent = await StudentService.updateStudent(
        id,
        validatedData
      );
      return res
        .status(200)
        .json({ message: 'Student updated', student: updatedStudent });
    } catch {
      return res.status(400).json({ error: 'Failed to update student' });
    }
  }

  static async deleteOne(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      await StudentService.removeStudent(id);
      return res.status(200).json({ message: 'Student deleted' });
    } catch {
      return res.status(500).json({ error: 'Failed to delete student' });
    }
  }
}
