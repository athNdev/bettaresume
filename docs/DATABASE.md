# Database Schema

## Overview

BettaResume uses **Cloudflare D1** (SQLite) with **Drizzle ORM**.

- Schema defined in: `api-server/src/db/schema.ts`
- Migrations in: `api-server/drizzle/`

## Tables

### User
Stores user accounts synced from Clerk.

```sql
CREATE TABLE User (
  id TEXT PRIMARY KEY,           -- Clerk user ID
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  emailVerified INTEGER,         -- Timestamp
  image TEXT,
  createdAt INTEGER NOT NULL,    -- Timestamp
  updatedAt INTEGER NOT NULL     -- Timestamp
);
```

### Resume
Main resume document entity.

```sql
CREATE TABLE Resume (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variationType TEXT NOT NULL DEFAULT 'base',  -- 'base' | 'variation'
  baseResumeId TEXT,             -- FK to parent resume (for variations)
  domain TEXT,                   -- Job domain (tech, finance, etc.)
  template TEXT NOT NULL DEFAULT 'modern',
  tags TEXT NOT NULL DEFAULT '[]',  -- JSON array
  isArchived INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,                 -- JSON: { personalInfo, settings }
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Indexes
CREATE INDEX Resume_userId_idx ON Resume(userId);
CREATE INDEX Resume_baseResumeId_idx ON Resume(baseResumeId);
```

### Section
Resume sections (experience, education, skills, etc.).

```sql
CREATE TABLE Section (
  id TEXT PRIMARY KEY,
  resumeId TEXT NOT NULL REFERENCES Resume(id) ON DELETE CASCADE,
  type TEXT NOT NULL,            -- 'experience' | 'education' | etc.
  order INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,         -- JSON: section-specific data
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Indexes
CREATE INDEX Section_resumeId_idx ON Section(resumeId);
```

### Account (NextAuth compatibility)
```sql
CREATE TABLE Account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);
```

### Session (NextAuth compatibility)
```sql
CREATE TABLE Session (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
```

## JSON Schemas

### Resume.metadata

```typescript
{
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    professionalTitle: string;
    linkedin: string;
    website: string;
    github: string;
    portfolio: string;
  };
  settings: {
    pageSize: 'Letter' | 'A4';
    margins: { top: number; right: number; bottom: number; left: number };
    fontSize: number;
    fontScale: number;
    typography: {
      name: number;
      title: number;
      sectionHeading: number;
      itemTitle: number;
      body: number;
      small: number;
    };
    lineHeight: number;
    fontFamily: string;
    colors: {
      primary: string;
      secondary: string;
      text: string;
      heading: string;
      accent: string;
      background: string;
      divider: string;
    };
    sectionSpacing: 'compact' | 'normal' | 'relaxed';
    showIcons: boolean;
    dateFormat: string;
    accentStyle: 'none' | 'underline' | 'background' | 'border';
  };
}
```

### Section.content (by type)

#### experience
```typescript
[{
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;      // YYYY-MM
  endDate: string;
  current: boolean;
  description: string;
  highlights: string[];
  technologies: string[];
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
}]
```

#### education
```typescript
[{
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  graduationDate: string;
  startDate: string;
  current: boolean;
  gpa: string;
  achievements: string[];
  coursework: string[];
  honors: string[];
}]
```

#### skills
```typescript
[{
  id: string;
  name: string;          // Category name
  order: number;
  skills: [{
    id: string;
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }];
}]
```

#### projects
```typescript
[{
  id: string;
  name: string;
  description: string;
  role: string;
  url: string;
  repoUrl: string;
  startDate: string;
  endDate: string;
  current: boolean;
  highlights: string[];
  technologies: string[];
}]
```

#### certifications
```typescript
[{
  id: string;
  name: string;
  issuer: string;
  date: string;
  expirationDate: string;
  noExpiration: boolean;
  credentialId: string;
  url: string;
  description: string;
}]
```

## Drizzle ORM Usage

### Schema Definition
```typescript
// api-server/src/db/schema.ts
export const resumes = sqliteTable('Resume', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // ...
});
```

### Queries
```typescript
// Find all resumes for user
const resumes = await db.query.resumes.findMany({
  where: eq(resumes.userId, userId),
  orderBy: desc(resumes.updatedAt),
});

// Find resume with sections
const resume = await db.query.resumes.findFirst({
  where: eq(resumes.id, id),
  with: { sections: true },
});

// Insert
await db.insert(resumes).values({ ... });

// Update
await db.update(resumes)
  .set({ name: 'New Name', updatedAt: new Date() })
  .where(eq(resumes.id, id));

// Delete
await db.delete(resumes).where(eq(resumes.id, id));
```

## Migrations

### Generate Migration
```bash
cd api-server
npx drizzle-kit generate
```

### Apply Migration (Local)
```bash
npx wrangler d1 migrations apply bettaresume --local
```

### Apply Migration (Production)
```bash
npx wrangler d1 migrations apply bettaresume --remote
```

## Local Database Location

Development data stored at:
```
api-server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/
```

To reset local database, delete this folder and re-run migrations.
