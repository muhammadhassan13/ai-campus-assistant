import { pool } from '../config/db.js';

async function runMigration() {
  try {
    console.log('Resetting database: dropping existing structures...');

    // Drop table if it exists to wipe all old structure and entries
    await pool.query(`DROP TABLE IF EXISTS student CASCADE;`);

    console.log('Creating fresh table schema...');

    // Recreate the student table structure from scratch
    await pool.query(`
      CREATE TABLE student (
        student_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        degree VARCHAR(100) NOT NULL,
        gpa NUMERIC(3, 2) NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database successfully reset and schema migrated!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
