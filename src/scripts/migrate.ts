import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let connection;
  try {
    console.log('Starting migration lifecycle...');

    const sqlFilePath = path.join(__dirname, '../../sql/database.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Remove single-line comments and clean up SQL statements
    const cleanScript = sqlScript
      .replace(/--.*$/gm, '') // Strip inline/block -- comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Strip /* */ comments

    const sqlStatements = cleanScript
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    connection = await pool.getConnection();
    console.log('Connected to MySQL. Executing Migrate Down & Up...');

    // Disable foreign key constraints for session safety during drops
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    for (const statement of sqlStatements) {
      await connection.query(statement);
    }

    // Re-enable foreign key constraints
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('Migration completed successfully! (Schema reset & rebuilt)');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

runMigration();
