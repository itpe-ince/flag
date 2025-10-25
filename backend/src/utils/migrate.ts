import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

// Migration tracking table
const createMigrationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
};

// Get executed migrations
const getExecutedMigrations = async (): Promise<string[]> => {
  const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
  return result.rows.map(row => row.filename);
};

// Execute a single migration
const executeMigration = async (filename: string, sql: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`✓ Executed migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Run all pending migrations
export const runMigrations = async () => {
  try {
    await createMigrationsTable();
    
    const migrationsDir = path.join(__dirname, '../../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    const executedMigrations = await getExecutedMigrations();
    
    for (const filename of migrationFiles) {
      if (!executedMigrations.includes(filename)) {
        const filePath = path.join(migrationsDir, filename);
        const sql = fs.readFileSync(filePath, 'utf8');
        await executeMigration(filename, sql);
      } else {
        console.log(`- Skipping already executed migration: ${filename}`);
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// CLI runner
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}