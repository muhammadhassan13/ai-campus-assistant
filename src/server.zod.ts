import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import {
  Student,
  Degree,
  StudentStatus,
  createStudentSchema,
  updateStudentSchema,
  patchStudentSchema,
} from './student.zod.js';
import { Repository } from './repository.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

const studentRepo = new Repository<Student>();

function mapDegree(degreeStr: string): Degree {
  if (degreeStr === 'Computer Science') return Degree.ComputerScience;
  if (degreeStr === 'Software Engineering') return Degree.SoftwareEngineering;
  if (degreeStr === 'Data Science') return Degree.DataScience;
  if (degreeStr === 'Artificial Intelligence')
    return Degree.ArtificialIntelligence;
  return Degree.Null;
}

// POST /api/students
app.post('/api/students', (req, res, next) => {
  try {
    const validatedData = createStudentSchema.parse(req.body);

    const mappedDegree = mapDegree(validatedData.degree);

    const newStudent = new Student(
      validatedData.id,
      validatedData.name,
      validatedData.email,
      mappedDegree,
      validatedData.gpa,
      StudentStatus.Active
    );

    studentRepo.add(newStudent);

    return res.status(201).json({
      message: 'Student created successfully',
      student: newStudent,
    });
  } catch (error) {
    next(error);
  }
});

// GET all
app.get('/api/students', (_req, res) => {
  const students = studentRepo.getAll();
  return res.status(200).json({
    count: students.length,
    students: students,
  });
});

// GET by ID
app.get('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const student = studentRepo.getById(id);
  if (!student) {
    return res.status(404).json({ error: 'Student with this ID not found' });
  }

  return res.status(200).json(student);
});

// PUT /api/students/:id
app.put('/api/students/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid Student ID parameter' });
    }

    const existingStudent = studentRepo.getById(id);
    if (!existingStudent) {
      return res.status(404).json({ error: 'Student with this ID not found' });
    }

    const validatedData = updateStudentSchema.parse(req.body);
    const mappedDegree = mapDegree(validatedData.degree);

    const updatedStudent = studentRepo.update(id, {
      name: validatedData.name,
      email: validatedData.email,
      degree: mappedDegree,
      gpa: validatedData.gpa,
      status: existingStudent.status,
    });

    return res.status(200).json({
      message: 'Student updated successfully',
      student: updatedStudent,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/students/:id
app.patch('/api/students/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid Student ID parameter' });
    }

    const existingStudent = studentRepo.getById(id);
    if (!existingStudent) {
      return res.status(404).json({ error: 'Student with this ID not found' });
    }

    const validatedData = patchStudentSchema.parse(req.body);

    const updates: Partial<Student> = {};
    if (validatedData.name !== undefined) updates.name = validatedData.name;
    if (validatedData.email !== undefined) updates.email = validatedData.email;
    if (validatedData.gpa !== undefined) updates.gpa = validatedData.gpa;
    if (validatedData.degree !== undefined) {
      updates.degree = mapDegree(validatedData.degree);
    }

    const updatedStudent = studentRepo.update(id, updates);

    return res.status(200).json({
      message: 'Student partially updated successfully',
      student: updatedStudent,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE
app.delete('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const deleted = studentRepo.deleteById(id);
  if (!deleted) {
    return res.status(404).json({ error: `Student with ID ${id} not found` });
  }

  return res.sendStatus(204);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Centralized Error Handler:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err instanceof Error) {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message,
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred on the server.',
  });
});

app.listen(PORT, () => {
  console.log(`Zod Server running on http://localhost:${PORT}`);
});
