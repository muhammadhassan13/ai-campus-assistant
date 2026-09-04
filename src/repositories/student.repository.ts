import { pool } from '../config/db.js';

export interface StudentRecord {
  student_id: number;
  name: string;
  email: string;
  password_hash: string;
  degree: string;
  gpa: number;
  status: string;
}

export type CreateStudentDTO = Omit<StudentRecord, 'student_id'>;
export type UpdateStudentDTO = Record<string, unknown>;

export class StudentRepository {
  static async findByEmail(email: string): Promise<StudentRecord | null> {
    const result = await pool.query('SELECT * FROM student WHERE email = $1', [
      email,
    ]);
    return result.rows[0] || null;
  }

  static async findById(
    id: number
  ): Promise<Omit<StudentRecord, 'password_hash'> | null> {
    const result = await pool.query(
      'SELECT student_id, name, email, degree, gpa, status FROM student WHERE student_id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findAll(): Promise<Omit<StudentRecord, 'password_hash'>[]> {
    const result = await pool.query(
      'SELECT student_id, name, email, degree, gpa, status FROM student ORDER BY student_id ASC'
    );
    return result.rows;
  }

  static async create(data: CreateStudentDTO) {
    const result = await pool.query(
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

  static async update(id: number, data: UpdateStudentDTO) {
    // Safety purge: Never allow 'password' key to reach the SQL string builder
    const cleanData = { ...data };
    delete cleanData.password;

    const fields: string[] = [];
    const values: unknown[] = [];
    let queryIndex = 1;

    // Explicit Whitelist for Database Columns ONLY
    if (cleanData.name !== undefined) {
      fields.push(`name = $${queryIndex++}`);
      values.push(cleanData.name);
    }
    if (cleanData.email !== undefined) {
      fields.push(`email = $${queryIndex++}`);
      values.push(cleanData.email);
    }
    if (cleanData.password_hash !== undefined) {
      fields.push(`password_hash = $${queryIndex++}`);
      values.push(cleanData.password_hash);
    }
    if (cleanData.degree !== undefined) {
      fields.push(`degree = $${queryIndex++}`);
      values.push(cleanData.degree);
    }
    if (cleanData.gpa !== undefined) {
      fields.push(`gpa = $${queryIndex++}`);
      values.push(cleanData.gpa);
    }
    if (cleanData.status !== undefined) {
      fields.push(`status = $${queryIndex++}`);
      values.push(cleanData.status);
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

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteById(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM student WHERE student_id = $1 RETURNING student_id',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
