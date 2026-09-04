import { pool } from '../config/db.js';
import type {
  StudentRecord,
  StudentResponseDTO,
  CreateStudentRepoPayload,
  UpdateStudentRepoPayload,
} from '../student.zod.js';

export class StudentRepository {
  static async findByEmail(email: string): Promise<StudentRecord | null> {
    const result = await pool.query<StudentRecord>(
      'SELECT * FROM student WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<StudentResponseDTO | null> {
    const result = await pool.query<StudentResponseDTO>(
      'SELECT student_id, name, email, degree, gpa, status FROM student WHERE student_id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findAll(): Promise<StudentResponseDTO[]> {
    const result = await pool.query<StudentResponseDTO>(
      'SELECT student_id, name, email, degree, gpa, status FROM student ORDER BY student_id ASC'
    );
    return result.rows;
  }

  static async create(
    data: CreateStudentRepoPayload
  ): Promise<StudentResponseDTO> {
    const result = await pool.query<StudentResponseDTO>(
      `INSERT INTO student (name, email, password_hash, degree, gpa, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING student_id, name, email, degree, gpa, status`,
      [
        data.name,
        data.email,
        data.password_hash,
        data.degree,
        data.gpa,
        data.status,
      ]
    );
    return result.rows[0];
  }

  static async update(
    id: number,
    data: UpdateStudentRepoPayload
  ): Promise<StudentResponseDTO | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let queryIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${queryIndex++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${queryIndex++}`);
      values.push(data.email);
    }
    if (data.password_hash !== undefined) {
      fields.push(`password_hash = $${queryIndex++}`);
      values.push(data.password_hash);
    }
    if (data.degree !== undefined) {
      fields.push(`degree = $${queryIndex++}`);
      values.push(data.degree);
    }
    if (data.gpa !== undefined) {
      fields.push(`gpa = $${queryIndex++}`);
      values.push(data.gpa);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${queryIndex++}`);
      values.push(data.status);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE student 
      SET ${fields.join(', ')} 
      WHERE student_id = $${queryIndex} 
      RETURNING student_id, name, email, degree, gpa, status
    `;

    const result = await pool.query<StudentResponseDTO>(query, values);
    return result.rows[0] || null;
  }

  static async deleteById(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM student WHERE student_id = $1 RETURNING student_id',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async deleteAll(): Promise<void> {
    await pool.query('TRUNCATE TABLE student RESTART IDENTITY CASCADE;');
  }
}
