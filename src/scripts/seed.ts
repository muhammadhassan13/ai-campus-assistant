import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

async function seedDatabase() {
  try {
    console.log('Starting PostgreSQL database seeding...');

    await pool.query('TRUNCATE TABLE student RESTART IDENTITY CASCADE;');

    const defaultPasswordHash = await bcrypt.hash('Password123', 10);

    await pool.query(
      `
      INSERT INTO student (name, email, password_hash, degree, gpa, status)
      VALUES 
      ($1, $2, $3, $4, $5, $6),
      ($7, $8, $9, $10, $11, $12);
    `,
      [
        'Muhammad Hassan Naeem',
        'hassan.naeem@student.campus.edu',
        defaultPasswordHash,
        'BS Computer Science',
        3.85,
        'Active',
        'Syed Shabih Haider',
        'shabih.haider@student.campus.edu',
        defaultPasswordHash,
        'BS Software Engineering',
        3.7,
        'Active',
      ]
    );

    console.log('Database seeded successfully with default student accounts!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
