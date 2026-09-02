import { pool } from '../config/db.js';

async function verifyData() {
  try {
    const [students] = await pool.query('SELECT * FROM Student;');
    const [courses] = await pool.query('SELECT * FROM Course;');

    console.log('--- STUDENTS TABLE ---');
    console.table(students);

    console.log('--- COURSES TABLE ---');
    console.table(courses);

    process.exit(0);
  } catch (error) {
    console.error('Verification query failed:', error);
    process.exit(1);
  }
}

verifyData();
