import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './db/schema';
import path from 'path';
import fs from 'fs';

async function setup() {
  console.log('🚀 Setting up database...\n');

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
  }

  const dbPath = path.join(dataDir, 'resumes.db');
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });

  // Enable WAL mode
  sqlite.pragma('journal_mode = WAL');

  // Run migrations
  const migrationsDir = path.join(process.cwd(), 'drizzle');
  if (fs.existsSync(migrationsDir)) {
    console.log('📦 Running migrations...');
    migrate(db, { migrationsFolder: migrationsDir });
    console.log('✅ Migrations completed');
  } else {
    console.log('⚠️  No migrations folder found. Run `npm run db:generate` first.');
    
    // Create tables directly if no migrations
    console.log('📦 Creating tables directly...');
    
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        variation_type TEXT NOT NULL DEFAULT 'base',
        template TEXT NOT NULL DEFAULT 'modern',
        tags TEXT DEFAULT '[]',
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        content TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
      CREATE INDEX IF NOT EXISTS idx_sections_resume_id ON sections(resume_id);
    `);
    
    console.log('✅ Tables created');
  }

  sqlite.close();
  console.log(`\n✅ Database ready at: ${dbPath}`);
}

setup().catch(console.error);
