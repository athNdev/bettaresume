# CLAUDE.md — BettaResume AI Agent Guide

This file is the single source of truth for AI agents working on this repository. Read it before making any changes.

---

## Project Overview

**BettaResume** is a professional resume builder SPA (Single Page Application). Users can create, edit, and manage multiple resumes with real-time formatting, multiple templates, section management, and PDF export.

- **Frontend**: Next.js 16 static export, deployed to GitHub Pages
- **Backend**: Cloudflare Worker exposing a tRPC API
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Auth**: Clerk (hosted sign-in, JWT verification)

---

## Monorepo Structure

```
bettaresume/
├── src/                    # Next.js frontend (root workspace)
├── api/                    # Cloudflare Worker backend (npm workspace: bettaresume-api)
├── packages/
│   └── types/              # Shared Zod schemas + TypeScript types (npm workspace: @bettaresume/types)
├── docs/                   # Architecture documentation (BACKEND.md, FRONTEND.md, etc.)
├── bruno/                  # Bruno API test collection
├── scripts/                # Build scripts (postbuild.js)
├── public/                 # Static assets
├── package.json            # Root workspace config + frontend deps
├── biome.jsonc             # Linter/formatter config (Biome)
├── tsconfig.json           # Root TypeScript config (frontend + types)
├── next.config.js          # Next.js config (static export)
└── .env.example            # Frontend env var template
```

---

## Tech Stack

### Frontend (`src/`)
| Tool | Purpose |
|---|---|
| Next.js 16 (App Router) | Framework, static export (`output: "export"`) |
| React 19 | UI library |
| TypeScript 5 | Type safety |
| Tailwind CSS v4 | Styling |
| shadcn/ui + Radix UI | Accessible UI primitives |
| tRPC v11 + React Query v5 | Type-safe API calls + data fetching |
| Clerk (`@clerk/nextjs`, `@clerk/react`) | Authentication |
| Zustand v5 | Local UI state management |
| TipTap v3 | Rich text editor |
| React PDF (`@react-pdf/renderer`) | PDF export |
| dnd-kit | Drag-and-drop section reordering |
| Biome | Linting + formatting |

### Backend (`api/`)
| Tool | Purpose |
|---|---|
| Cloudflare Workers | Serverless runtime |
| tRPC v11 | Type-safe API |
| Drizzle ORM | Database ORM |
| Cloudflare D1 (SQLite) | Database |
| Clerk (`@clerk/backend`) | Auth token verification |
| Wrangler | Dev server + deployment |
| Zod v3 | Input validation |

### Shared (`packages/types/`)
| Tool | Purpose |
|---|---|
| Zod v4 | Schema definitions |
| TypeScript | Type generation from schemas |

---

## Development Setup

### Prerequisites
- **Node.js 20+**
- **npm 11** (see `packageManager` in `package.json`)
- **Wrangler CLI** (installed locally in `api/` devDeps — no global install needed)
- **Clerk account** — get free API keys at https://dashboard.clerk.com

### Environment Variables

**Frontend** — create `.env.local` in the repository root:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
NEXT_PUBLIC_DEV_MODE=true
```

**Backend** — create `api/.dev.vars`:
```bash
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Initial Setup
```bash
# 1. Install all workspace dependencies
npm install

# 2. Apply DB migrations and seed local D1 database
npm run db:reset-seed

# 3. Start both servers (frontend + API) concurrently
npm run dev
```

`npm run dev` runs `build:types → db:reset-seed → dev:all` (frontend on :3000, API on :4000).

---

## Key Commands

```bash
# Development
npm run dev              # Start everything (types + DB + frontend + API)
npm run dev:frontend     # Next.js only (port 3000, Turbopack)
npm run dev:api          # Wrangler Worker only (port 4000)

# Code quality
npm run check            # Biome lint + format check
npm run check:write      # Biome auto-fix (safe)
npm run check:unsafe     # Biome auto-fix (unsafe)
npm run typecheck        # TypeScript type check (no emit)

# Build
npm run build            # build:types + next build + postbuild
npm run build:types      # Build @bettaresume/types package only

# Database (delegates to api/ workspace)
npm run db:migrate       # Apply migrations to local D1
npm run db:reset         # Re-apply all migrations
npm run db:seed          # Seed local D1 with dummy data
npm run db:reset-seed    # Reset + migrate + seed (combined)
npm run db:studio        # Open Drizzle Studio (visual DB editor)

# Clean
npm run clean            # Remove .next, api/.wrangler, packages/types/dist
```

---

## Frontend Architecture (`src/`)

### Routing
Custom **hash-based router** (`src/lib/hash-router.tsx`) for GitHub Pages compatibility. All routes use `#/path` fragments.

Routes defined in `src/app/router.tsx`:
- `#/` → redirects to `#/dashboard` if signed in, else Clerk sign-in
- `#/login` → Clerk redirect
- `#/dashboard` → Dashboard (protected)
- `#/resume-editor/:id` → Resume editor (protected)

### Directory Structure
```
src/
├── app/
│   ├── layout.tsx          # Root providers (Theme, Clerk, tRPC, Toasts)
│   ├── page.tsx            # Single entry: mounts HashRouterProvider + AppRouter
│   ├── router.tsx          # Route matching + auth guard
│   ├── protected-route.tsx # Auth guard component
│   ├── provider.tsx        # tRPC provider
│   └── splash-screen.tsx   # Loading screen
├── features/
│   ├── auth/               # Auth store + login view
│   ├── dashboard/          # Dashboard view + components
│   └── resume-editor/      # Resume editor view, store, types, utils
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── export/             # PDF export (pdf-document.tsx, export-buttons.tsx)
│   ├── providers/          # App-level React providers
│   ├── rich-text-editor/   # TipTap rich text editor
│   └── sections-forms/     # Per-section form components
├── hooks/                  # Custom React hooks
├── lib/
│   ├── hash-router.tsx     # Hash router implementation
│   ├── api.ts              # Sync manager + backend status
│   ├── trpc/               # tRPC client setup
│   ├── fonts.ts            # Font definitions for PDF
│   └── utils.ts            # Utility functions (cn, etc.)
└── styles/                 # Global CSS
```

### State Management
- **tRPC + React Query**: All server state (resumes, sections, user). Use `trpc.<router>.<procedure>.useQuery()` / `.useMutation()`.
- **Zustand** (`features/*/**.store.ts`): Local UI state — `auth.store.ts` (auth), `resume.store.ts` (current resume being edited).

### Path Aliases
| Alias | Resolves to |
|---|---|
| `@/*` | `src/*` |
| `@bettaresume/types` | `packages/types/src/index.ts` |

### Key Conventions

**Component pattern (section forms)**:
```tsx
function ExperienceForm({ data, onChange }) {
  const [localData, setLocalData] = useState(data);
  const hasChanges = JSON.stringify(localData) !== JSON.stringify(data);
  return (
    <>
      <FormSaveBar hasChanges={hasChanges} onSave={() => onChange(localData)} />
      {/* form fields */}
    </>
  );
}
```

**No nested buttons in Accordion** (causes React hydration error):
```tsx
// ❌ Wrong
<AccordionTrigger><Button>Click</Button></AccordionTrigger>

// ✅ Correct
<div className="flex"><AccordionTrigger>Title</AccordionTrigger><Button>Action</Button></div>
```

**Navigation**:
```tsx
import { useHashNavigate } from '@/lib/hash-router';
const navigate = useHashNavigate();
navigate('/resume-editor/123');
```

---

## Backend Architecture (`api/`)

### Entry Point: `api/src/server.ts`
Cloudflare Worker `fetch` handler:
- `OPTIONS *` → CORS preflight
- `GET/POST /trpc/*` → tRPC handler (adds CORS headers to response)
- `GET /health` → JSON health check
- Everything else → 404

### tRPC Router: `api/src/root.ts`
```typescript
export const appRouter = router({
  user: userRouter,
  resume: resumeRouter,
  section: sectionRouter,
  auth: authRouter,
});
export type AppRouter = typeof appRouter;  // imported by frontend for type safety
```

### Context: `api/src/trpc/context.ts`
Created for every request. Contains:
- `db` — Drizzle DB instance
- `user` — Clerk user object (or `null`)
- `userId` — Clerk user ID string (or `null`)
- `env` — Cloudflare bindings (`bettaresume_d1`, `CLERK_SECRET_KEY`, etc.)
- `clerkClient` — Clerk backend SDK

### Procedure Types
- `publicProcedure` — No auth required
- `protectedProcedure` — Throws `UNAUTHORIZED` if no user in context

### Procedure Files
```
api/src/trpc/procedures/
├── auth.ts           # auth.getUser
├── user.ts           # user.get, user.upsert
├── resume.ts         # resume.list, resume.getById, resume.create, resume.update, resume.delete
├── resume-section.ts # section operations on resumes
└── section.ts        # section.upsert, section.reorder, section.delete
```

### Database: `api/src/db/`
- **Schema** (`schema.ts`): `users`, `resumes`, `sections`, `accounts`, `sessions`, `verificationTokens`
- **Migrations** (`api/drizzle/`): SQL files applied by Wrangler
- **Seed** (`api/src/db/seed.sql`): Dummy data for local dev

### Wrangler Config: `api/wrangler.jsonc`
- Worker name: `bettaresume-api-server`
- Custom domain: `api.bettaresume.com`
- D1 binding: `bettaresume_d1` → database `bettaresume`
- Dev port: `4000`

### Adding a New tRPC Procedure
1. Create or edit a file in `api/src/trpc/procedures/`
2. Define the procedure with `publicProcedure` or `protectedProcedure`
3. Add it to the router in `api/src/root.ts`
4. TypeScript inference automatically propagates to the frontend

---

## Shared Types (`packages/types/`)

All types and Zod schemas shared between frontend and backend.

**Key exports** (`packages/types/src/schemas.ts`):
- `sectionTypeSchema` → `"personal-info" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "awards" | "languages" | "publications" | "volunteer" | "references" | "custom"`
- `templateTypeSchema` → `"minimal" | "modern" | "classic" | "professional" | "creative" | "executive" | "tech"`
- Per-section content schemas: `personalInfoSchema`, `experienceSchema`, `educationSchema`, `skillCategorySchema`, `projectSchema`, `certificationSchema`, `awardSchema`, `languageSchema`, `publicationSchema`, `volunteerSchema`, `referenceSchema`
- Resume schemas: `createResumeSchema`, `updateResumeSchema`, `resumeSettingsSchema`

**Key exports** (`packages/types/src/types.ts`):
- `SectionType`, `TemplateType`, `Resume`, `ResumeSection`, `ResumeWithSections`, `User`, `SyncStatus`, `SyncState`

Always add new section types or templates to this package first — both API and frontend depend on it.

---

## Adding a New Section Type

1. Add the new type string to `sectionTypeSchema` in `packages/types/src/schemas.ts`
2. Add a content schema for it in the same file
3. Export the new type from `packages/types/src/types.ts`
4. Add a `SECTION_CONFIGS` entry in `src/features/resume-editor/types.ts` (default title, icon, etc.)
5. Create a form component in `src/components/sections-forms/`
6. Register it in `src/features/resume-editor/resume-editor.tsx` (section renderer)
7. Update PDF preview in `src/components/export/pdf-document.tsx`

---

## Database Schema (SQLite via Drizzle)

| Table | Purpose |
|---|---|
| `User` | User accounts (Clerk user IDs) |
| `Resume` | Resume documents (name, template, metadata JSON, archived flag) |
| `Section` | Resume sections (type, order, visible, content JSON) |
| `Account` | OAuth accounts (NextAuth legacy) |
| `Session` | Auth sessions (NextAuth legacy) |
| `VerificationToken` | Email verification (NextAuth legacy) |

**Section content** is stored as serialized JSON in the `content` column. The schema matches the Zod schemas in `@bettaresume/types`.

**Migrations**: `api/drizzle/*.sql` — generated by `drizzle-kit generate`, applied by `wrangler d1 migrations apply`.

To change the schema:
```bash
# 1. Edit api/src/db/schema.ts
# 2. Generate migration
npm run db:generate  # (runs drizzle-kit generate in api/)
# 3. Apply locally
npm run db:migrate
```

---

## Authentication Flow

1. User visits app → redirected to Clerk hosted sign-in (`<RedirectToSignIn />`)
2. After Clerk sign-in → JWT token stored by Clerk SDK in browser
3. Frontend attaches `Authorization: Bearer <token>` header to all tRPC requests
4. Backend (`api/src/trpc/context.ts`) verifies JWT using `@clerk/backend`
5. On first sign-in, `user.upsert` procedure creates the user record in D1

**Dev bypass**: In `NODE_ENV=development`, `isDevBypass = true` in `router.tsx` skips Clerk auth checks. The frontend still needs valid Clerk keys for auth-dependent features, but routing works without signing in.

---

## Code Style

**Linter/Formatter**: [Biome](https://biomejs.dev/) (configured in `biome.jsonc`).

```bash
npm run check           # Check all files
npm run check:write     # Auto-fix safe issues
```

**Rules**:
- Sorted imports (Biome `organizeImports`)
- Sorted Tailwind classes (`useSortedClasses` for `clsx`, `cva`, `cn`)
- TypeScript strict mode + `noUncheckedIndexedAccess`
- `verbatimModuleSyntax` — use `import type` for type-only imports

**Indentation**: Tabs (Biome default).

---

## Deployment

### Frontend → GitHub Pages
- `npm run build` produces `./out/` (static export)
- CI (`.github/workflows/cd.yml`) deploys `./out/` to GitHub Pages on `main` push
- Required GitHub Actions vars: `CLERK_PUBLISHABLE_KEY`, `API_URL`

### Backend → Cloudflare Workers
- `cd api && npx wrangler deploy`
- CI deploys on `main` push alongside frontend
- Required Cloudflare secrets: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`
- Required GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLERK_SECRET_KEY`

---

## API Testing

Bruno collection at `./bruno/` — open with [Bruno](https://www.usebruno.com/):
```bash
# Health check
curl http://localhost:4000/health

# tRPC (needs Bearer token from Clerk)
curl http://localhost:4000/trpc/resume.list \
  -H "Authorization: Bearer <clerk-token>"
```

---

## Common Pitfalls

| Problem | Solution |
|---|---|
| CORS errors | Backend adds `Access-Control-Allow-*` headers to all responses, including `x-dev-mode` header |
| "Publishable key not valid" | Check `api/.dev.vars` — `pk_test_...` → `CLERK_PUBLISHABLE_KEY`, `sk_test_...` → `CLERK_SECRET_KEY` |
| Foreign key constraint on resume create | `user.upsert` must be called first (happens on login). Run `npm run db:reset-seed` locally |
| Nested button hydration error | Never put `<Button>` inside `<AccordionTrigger>` — place action buttons outside the trigger |
| Port mismatch | `NEXT_PUBLIC_API_URL` must match Wrangler dev port (default `4000`) |
| Type errors in build | Build uses `ignoreBuildErrors: true`; run `npm run typecheck` separately |
| Stale D1 state | `npm run db:reset` or `npm run clean && npm run db:reset-seed` |

---

## Further Reading

All architecture docs are in `docs/`:
- `docs/DEVELOPMENT.md` — full setup walkthrough
- `docs/FRONTEND.md` — detailed frontend architecture
- `docs/BACKEND.md` — detailed backend architecture
- `docs/DATABASE.md` — schema + migration details
- `docs/API.md` — tRPC procedure reference
- `docs/TYPES.md` — shared types reference
