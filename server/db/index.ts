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
if (fs.existsSync(DB_PATH)) {
  const fileBuffer = fs.readFileSync(DB_PATH);
  sqlite = new SQL.Database(fileBuffer);
} else {
  sqlite = new SQL.Database();
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
