import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { ZodError } from 'zod';
import { pool } from './config/db.js';
import {
  createStudentSchema,
  updateStudentSchema,
  patchStudentSchema,
} from './student.zod.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// GET /api/students - Fetch all students
app.get('/api/students', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM student ORDER BY student_id ASC'
    );
    res.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/students/:id - Fetch single student
app.get('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM student WHERE student_id = $1',
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
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/students - Create new student
app.post('/api/students', async (req: Request, res: Response) => {
  try {
    const validatedData = createStudentSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO student (name, email, degree, gpa, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING student_id, name, email, degree, gpa, status`,
      [
        validatedData.name,
        validatedData.email,
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
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// PUT /api/students/:id - Update student
app.put('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateStudentSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE student 
       SET name = $1, email = $2, degree = $3, gpa = $4, status = $5 
       WHERE student_id = $6 
       RETURNING *`,
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
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// DELETE /api/students/:id - Delete student
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
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// PATCH /api/students/:id - Partial update student
app.patch('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = patchStudentSchema.parse(req.body);

    const fields = Object.keys(validatedData);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    // Dynamically build SET clause for positional parameters ($1, $2, ...)
    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    const values = Object.values(validatedData);

    const result = await pool.query(
      `UPDATE student SET ${setClause} WHERE student_id = $${fields.length + 1} RETURNING *`,
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
    res.status(500).json({ error: 'Failed to patch student' });
  }
});

// DELETE /api/students - Delete ALL students
app.delete('/api/students', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM student RETURNING student_id');

    res.json({
      message: 'All students deleted successfully',
      deletedCount: result.rowCount,
    });
  } catch (error: unknown) {
    console.error('Error deleting all students:', error);
    res.status(500).json({ error: 'Failed to delete all students' });
  }
});

app.listen(PORT, () => {
  console.log(`Zod + PostgreSQL Server running on http://localhost:${PORT}`);
});
