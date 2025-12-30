import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path - relative to server folder
const dataDir = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(dataDir, 'resumes.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create better-sqlite3 connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Create drizzle instance with schema
export const db = drizzle(sqlite, { schema });

// Export schema types
export * from './schema';

// Export sqlite instance for direct access if needed
export { sqlite };
