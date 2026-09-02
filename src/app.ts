import express from 'express';
import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from './config/db.js';

const app = express();

app.use(express.json());

// Fetch students live from MySQL
app.get('/api/students', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM Student;');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }
});

// Insert a new student into MySQL
app.post('/api/students', async (req: Request, res: Response) => {
  const { name, email, degree } = req.body;

  if (!name || !email) {
    res.status(400).json({ success: false, error: 'Name and email required' });
    return;
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO Student (name, email, degree, gpa, status) VALUES (?, ?, ?, 0.00, "Active");',
      [name, email, degree || 'BS Computer Science']
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully in MySQL',
      result,
    });
  } catch (error) {
    console.error('Database insert error:', error);
    res.status(500).json({ success: false, error: 'Failed to insert student' });
  }
});

export default app;
