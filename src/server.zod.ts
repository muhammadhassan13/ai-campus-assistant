import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { pool } from './config/db.js';
import {
  createStudentSchema,
  updateStudentSchema,
  patchStudentSchema,
} from './student.zod.js';
import {
  authenticateToken,
  type AuthenticatedRequest,
} from './middleware/auth.js';
import { checkOwnership } from './middleware/ownership.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

app.use(express.json());

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

    const token = jwt.sign(
      { student_id: student.student_id, email: student.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      student: {
        student_id: student.student_id,
        name: student.name,
        email: student.email,
        degree: student.degree,
        gpa: parseFloat(student.gpa),
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
// PUBLIC ROUTES
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

// ==========================================
// PROTECTED & OWNERSHIP-RESTRICTED ROUTES
// ==========================================

async function handleStudentUpdate(
  req: AuthenticatedRequest,
  res: Response,
  isPatch: boolean
) {
  try {
    const { id } = req.params;
    const schema = isPatch ? patchStudentSchema : updateStudentSchema;
    const validatedData = schema.parse(req.body);

    const updateFields: Record<string, unknown> = { ...validatedData };

    // Auto-hash password if provided in body
    if (typeof updateFields.password === 'string') {
      updateFields.password_hash = await bcrypt.hash(
        updateFields.password,
        SALT_ROUNDS
      );
      delete updateFields.password;
    }

    const keys = Object.keys(updateFields);
    if (keys.length === 0) {
      return res
        .status(400)
        .json({ error: 'No valid fields provided for update' });
    }

    const setClause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    const values = Object.values(updateFields);

    const result = await pool.query(
      `UPDATE student SET ${setClause} WHERE student_id = $${
        keys.length + 1
      } RETURNING student_id, name, email, degree, gpa, status`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      message: `Student ${isPatch ? 'patched' : 'updated'} successfully`,
      student: result.rows[0],
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error('Update error:', error);
    res.status(500).json({
      error: 'Failed to update student record',
      details: getErrorMessage(error),
    });
  }
}

app.put('/api/students/:id', authenticateToken, checkOwnership, (req, res) =>
  handleStudentUpdate(req, res, false)
);

app.patch('/api/students/:id', authenticateToken, checkOwnership, (req, res) =>
  handleStudentUpdate(req, res, true)
);

app.delete(
  '/api/students/:id',
  authenticateToken,
  checkOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
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
  }
);

// DELETE /api/students (Bulk Delete & ID Reset)
app.delete(
  '/api/students',
  authenticateToken,
  async (_req: Request, res: Response) => {
    try {
      // TRUNCATE empties the table and resets the SERIAL ID counter to 1
      await pool.query('TRUNCATE TABLE student RESTART IDENTITY CASCADE;');

      res.json({
        message: 'All student records cleared and ID sequence reset to 1.',
      });
    } catch (error: unknown) {
      console.error('Error clearing student table:', error);
      res.status(500).json({
        error: 'Failed to clear students',
        details: getErrorMessage(error),
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
