import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Starting migration lifecycle...');

    const sqlFilePath = path.join(__dirname, '../../sql/database.sql');
    if (!fs.existsSync(sqlFilePath)) {
      console.warn(
        `SQL schema file not found at ${sqlFilePath}. Executing direct Postgres fallback creation...`
      );
      await pool.query(`
        CREATE TABLE IF NOT EXISTS student (
          student_id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          degree VARCHAR(100) DEFAULT 'Not specified',
          gpa NUMERIC(3,2) DEFAULT 0.00,
          status VARCHAR(50) DEFAULT 'Active'
        );
      `);
    } else {
      const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
      await pool.query(sqlScript);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
