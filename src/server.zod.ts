import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { ZodError } from 'zod';
import { pool } from './config/db.js';
import {
  createStudentSchema,
  updateStudentSchema,
  patchStudentSchema,
} from './student.zod.js';

const app = express();
const PORT = 3001;

app.use(express.json());

// Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

interface StudentRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  degree: string;
  gpa: number;
  status: string;
}

// POST /api/students — MySQL auto-increments the ID
app.post(
  '/api/students',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createStudentSchema.parse(req.body);

      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO Student (name, email, degree, gpa, status) VALUES (?, ?, ?, ?, ?)`,
        [
          validatedData.name,
          validatedData.email,
          validatedData.degree,
          validatedData.gpa,
          validatedData.status,
        ]
      );

      const autoIncrementedId = result.insertId;

      return res.status(201).json({
        message: 'Student created successfully',
        student: {
          id: autoIncrementedId,
          ...validatedData,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/students — Fetch all from MySQL
app.get(
  '/api/students',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [rows] = await pool.query<StudentRow[]>(
        `SELECT student_id AS id, name, email, degree, gpa, status FROM Student`
      );

      return res.status(200).json({
        count: rows.length,
        students: rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/students/:id — Fetch single student by auto-increment ID
app.get(
  '/api/students/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid Student ID parameter' });
      }

      const [rows] = await pool.query<StudentRow[]>(
        `SELECT student_id AS id, name, email, degree, gpa, status FROM Student WHERE student_id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: `Student with ID ${id} not found` });
      }

      return res.status(200).json(rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/students/:id — Full update by auto-increment ID
app.put(
  '/api/students/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid Student ID parameter' });
      }

      const validatedData = updateStudentSchema.parse(req.body);

      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE Student SET name = ?, email = ?, degree = ?, gpa = ?, status = ? WHERE student_id = ?`,
        [
          validatedData.name,
          validatedData.email,
          validatedData.degree,
          validatedData.gpa,
          validatedData.status,
          id,
        ]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: `Student with ID ${id} not found` });
      }

      return res.status(200).json({
        message: 'Student updated successfully',
        student: { id, ...validatedData },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/students/:id — Partial update
app.patch(
  '/api/students/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid Student ID parameter' });
      }

      const validatedData = patchStudentSchema.parse(req.body);
      const fieldsToUpdate: string[] = [];
      const queryParams: (string | number)[] = [];

      if (validatedData.name !== undefined) {
        fieldsToUpdate.push('name = ?');
        queryParams.push(validatedData.name);
      }
      if (validatedData.email !== undefined) {
        fieldsToUpdate.push('email = ?');
        queryParams.push(validatedData.email);
      }
      if (validatedData.degree !== undefined) {
        fieldsToUpdate.push('degree = ?');
        queryParams.push(validatedData.degree);
      }
      if (validatedData.gpa !== undefined) {
        fieldsToUpdate.push('gpa = ?');
        queryParams.push(validatedData.gpa);
      }
      if (validatedData.status !== undefined) {
        fieldsToUpdate.push('status = ?');
        queryParams.push(validatedData.status);
      }

      if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
      }

      queryParams.push(id);
      const sql = `UPDATE Student SET ${fieldsToUpdate.join(', ')} WHERE student_id = ?`;

      const [result] = await pool.query<ResultSetHeader>(sql, queryParams);

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: `Student with ID ${id} not found` });
      }

      // Return updated record
      const [rows] = await pool.query<StudentRow[]>(
        `SELECT student_id AS id, name, email, degree, gpa, status FROM Student WHERE student_id = ?`,
        [id]
      );

      return res.status(200).json({
        message: 'Student partially updated successfully',
        student: rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/students/:id — Delete from MySQL by auto-increment ID
app.delete(
  '/api/students/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid Student ID parameter' });
      }

      const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM Student WHERE student_id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: `Student with ID ${id} not found` });
      }

      return res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  }
);

// Centralized Error Handler
app.use((err: unknown, _req: Request, res: Response) => {
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
  console.log(`Zod + MySQL Server running on http://localhost:${PORT}`);
});
