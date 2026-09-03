import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { ZodError } from 'zod';
import { pool } from './config/db.js';
import {
  createStudentSchema,
  updateStudentSchema,
  patchStudentSchema,
} from './student.zod.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const SALT_ROUNDS = 10;

app.use(express.json());

// Helper function to extract type-safe error messages
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// ==========================================
// AUTHENTICATION
// ==========================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM student WHERE email = $1', [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const student = result.rows[0];
    const isPasswordValid = await bcrypt.compare(
      password,
      student.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      student: {
        student_id: student.student_id,
        name: student.name,
        email: student.email,
        degree: student.degree,
        gpa: student.gpa,
        status: student.status,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Failed to authenticate user',
      details: getErrorMessage(error),
    });
  }
});

// ==========================================
// RESTful CRUD ENDPOINTS
// ==========================================

app.get('/api/students', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT student_id, name, email, degree, gpa, status FROM student ORDER BY student_id ASC'
    );
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      details: getErrorMessage(error),
    });
  }
});

app.get('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT student_id, name, email, degree, gpa, status FROM student WHERE student_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      error: 'Failed to fetch student',
      details: getErrorMessage(error),
    });
  }
});

app.post('/api/students', async (req: Request, res: Response) => {
  try {
    const validatedData = createStudentSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(
      validatedData.password,
      SALT_ROUNDS
    );

    const result = await pool.query(
      `INSERT INTO student (name, email, password_hash, degree, gpa, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING student_id, name, email, degree, gpa, status`,
      [
        validatedData.name,
        validatedData.email,
        hashedPassword,
        validatedData.degree,
        validatedData.gpa,
        validatedData.status,
      ]
    );

    res.status(201).json({
      message: 'Student created successfully',
      student: result.rows[0],
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error('Error creating student:', error);
    res.status(500).json({
      error: 'Failed to create student',
      details: getErrorMessage(error),
    });
  }
});

app.put('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateStudentSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE student 
       SET name = $1, email = $2, degree = $3, gpa = $4, status = $5 
       WHERE student_id = $6 
       RETURNING student_id, name, email, degree, gpa, status`,
      [
        validatedData.name,
        validatedData.email,
        validatedData.degree,
        validatedData.gpa,
        validatedData.status,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      message: 'Student updated successfully',
      student: result.rows[0],
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error('Error updating student:', error);
    res.status(500).json({
      error: 'Failed to update student',
      details: getErrorMessage(error),
    });
  }
});

app.patch('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = patchStudentSchema.parse(req.body);

    const fields = Object.keys(validatedData);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    const values = Object.values(validatedData);

    const result = await pool.query(
      `UPDATE student SET ${setClause} WHERE student_id = $${
        fields.length + 1
      } RETURNING student_id, name, email, degree, gpa, status`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      message: 'Student partially updated successfully',
      student: result.rows[0],
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error('Error patching student:', error);
    res.status(500).json({
      error: 'Failed to patch student',
      details: getErrorMessage(error),
    });
  }
});

app.delete('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM student WHERE student_id = $1 RETURNING student_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      error: 'Failed to delete student',
      details: getErrorMessage(error),
    });
  }
});

app.delete('/api/students', async (_req: Request, res: Response) => {
  try {
    // TRUNCATE wipes all rows AND resets student_id back to 1 automatically
    await pool.query('TRUNCATE TABLE student RESTART IDENTITY');

    res.json({
      message: 'All students deleted and ID sequence reset to 1 successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting all students:', error);
    res.status(500).json({
      error: 'Failed to delete all students',
      details: getErrorMessage(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
