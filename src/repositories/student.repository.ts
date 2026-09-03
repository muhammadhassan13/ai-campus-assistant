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
export type UpdateStudentDTO = Omit<
  StudentRecord,
  'student_id' | 'password_hash'
>;

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
    const result = await pool.query(
      `UPDATE student 
       SET name = $1, email = $2, degree = $3, gpa = $4, status = $5 
       WHERE student_id = $6 
       RETURNING student_id, name, email, degree, gpa, status`,
      [data.name, data.email, data.degree, data.gpa, data.status, id]
    );
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
