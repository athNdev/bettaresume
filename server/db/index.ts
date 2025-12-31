import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs, { Database } from 'sql.js';
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

// Initialize sql.js
const SQL = await initSqlJs();

// Load existing database or create new one
let sqlite: Database;
let isNewDatabase = false;
if (fs.existsSync(DB_PATH)) {
  const fileBuffer = fs.readFileSync(DB_PATH);
  sqlite = new SQL.Database(fileBuffer);
} else {
  sqlite = new SQL.Database();
  isNewDatabase = true;
}

// Create tables if new database
if (isNewDatabase) {
  console.log('📦 Creating database tables...');
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      variation_type TEXT NOT NULL DEFAULT 'base',
      base_resume_id TEXT,
      domain TEXT,
      template TEXT NOT NULL DEFAULT 'modern',
      tags TEXT DEFAULT '[]',
      is_archived INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      visible INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  // Save the new database immediately
  const data = sqlite.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  console.log('✅ Database tables created');
}

// Create drizzle instance with schema
export const db = drizzle(sqlite, { schema });

// Save database to file
export function saveDatabase() {
  const data = sqlite.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save on process exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => { saveDatabase(); process.exit(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

// Export schema types
export * from './schema';

// Export sqlite instance for direct access if needed
export { sqlite };
