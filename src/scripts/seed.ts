import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';

async function seedDatabase() {
  let connection;
  try {
    console.log('Starting database seeding...');
    connection = await pool.getConnection();

    // Disable foreign key checks for clean truncation
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    console.log('Clearing existing table data...');
    await connection.query('TRUNCATE TABLE Query_Log;');
    await connection.query('TRUNCATE TABLE Enrollment;');
    await connection.query('TRUNCATE TABLE Assignment;');
    await connection.query('TRUNCATE TABLE Course;');
    await connection.query('TRUNCATE TABLE Student;');
    await connection.query('TRUNCATE TABLE Instructor;');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('Inserting seed data...');

    // 1. Insert Instructors
    const [instructorResult] = await connection.query<ResultSetHeader>(`
      INSERT INTO Instructor (name, email, department) VALUES
      ('Dr. Sarah Ahmed', 'sarah.ahmed@campus.edu', 'Computer Science'),
      ('Prof. Usman Khan', 'usman.khan@campus.edu', 'Software Engineering');
    `);
    const sarahId = instructorResult.insertId;
    const usmanId = sarahId + 1;

    // 2. Insert Students
    const [studentResult] = await connection.query<ResultSetHeader>(`
      INSERT INTO Student (name, email, degree, gpa, status) VALUES
      ('Muhammad Hassan Naeem', 'hassan.naeem@student.campus.edu', 'BS Computer Science', 3.85, 'Active'),
      ('Syed Shabih Haider', 'shabih.haider@student.campus.edu', 'BS Software Engineering', 3.70, 'Active');
    `);
    const hassanId = studentResult.insertId;
    const shabihId = hassanId + 1;

    // 3. Insert Courses
    await connection.query(
      `
      INSERT INTO Course (course_code, title, credits, instructor_id) VALUES
      ('CS-201', 'Database Systems', 3, ?),
      ('SE-302', 'Software Architecture', 3, ?);
    `,
      [sarahId, usmanId]
    );

    // Fetch inserted course IDs with typed RowDataPacket
    interface CourseRow extends RowDataPacket {
      course_id: number;
      course_code: string;
    }

    const [courses] = await connection.query<CourseRow[]>(
      'SELECT course_id, course_code FROM Course;'
    );

    const dbCourse = courses.find((c) => c.course_code === 'CS-201');
    const saCourse = courses.find((c) => c.course_code === 'SE-302');

    if (!dbCourse || !saCourse) {
      throw new Error('Failed to retrieve inserted course IDs');
    }

    const dbCourseId = dbCourse.course_id;
    const saCourseId = saCourse.course_id;

    // 4. Insert Assignments
    await connection.query(
      `
      INSERT INTO Assignment (title, max_score, due_date, course_id) VALUES
      ('Assignment 1: ERD & Relational Schema', 100, '2026-09-15', ?),
      ('Quiz 1: Architectural Patterns', 50, '2026-09-20', ?);
    `,
      [dbCourseId, saCourseId]
    );

    // 5. Insert Enrollments
    await connection.query(
      `
      INSERT INTO Enrollment (enrollment_date, grade, student_id, course_id) VALUES
      ('2026-08-25', 'A', ?, ?),
      ('2026-08-25', 'A-', ?, ?);
    `,
      [hassanId, dbCourseId, shabihId, saCourseId]
    );

    // 6. Insert Query Logs
    await connection.query(
      `
      INSERT INTO Query_Log (prompt, response, student_id) VALUES
      ('When is Assignment 1 for Database Systems due?', 'Assignment 1: ERD & Relational Schema is due on September 15, 2026.', ?);
    `,
      [hassanId]
    );

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

seedDatabase();
