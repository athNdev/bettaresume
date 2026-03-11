<div align="center">

# bettaresume

**A modern, open-source resume builder with real-time preview, rich text editing, and PDF export.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)](https://workers.cloudflare.com/)

[Features](#features) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Deployment](#deployment) · [Contributing](#contributing)

</div>

---

## Overview

BettaResume is a full-stack resume builder that lets you create, manage, and export professional resumes with ease. It features a split-panel editor with live PDF preview, 12 section types, 7 templates, rich text formatting, auto-save, and offline-first sync.

The frontend is a statically exported Next.js app that can be hosted on any CDN or static host. The backend runs on Cloudflare Workers with a Cloudflare D1 (SQLite) database, making it extremely cheap to self-host or deploy globally.

## Features

- **Multi-resume management** — Create and manage as many resumes as you need
- **Rich text editor** — Powered by Tiptap with support for bold/italic/underline, colors, fonts, highlights, links, and text alignment
- **Live PDF preview** — See exactly how your resume will look as you type
- **12 section types** — Work experience, education, skills, projects, certifications, awards, languages, publications, volunteer work, references, and more
- **7 resume templates** — Minimal, modern, classic, professional, creative, executive, and tech
- **Resume variations** — Branch a base resume into targeted variations for different job applications without duplicating content
- **Customizable styling** — Full control over fonts, colors, margins, spacing, and typography
- **PDF & DOCX export** — Download your resume in standard formats
- **Auto-save with offline support** — Writes happen immediately to local state; a background sync queue persists changes to the backend when online
- **Drag-and-drop section reordering** — Rearrange resume sections with dnd-kit
- **Dark/light mode** — System-aware theming
- **Authentication via Clerk** — Secure sign-in with email/social login

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (static export), React, Tailwind CSS 4, shadcn/ui, Radix UI |
| Rich Text | Tiptap 3 |
| State | Zustand (UI), TanStack Query via tRPC (server) |
| API | tRPC 11 (end-to-end type-safe RPC) |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite), Drizzle ORM |
| Auth | Clerk |
| Validation | Zod (shared between frontend and backend) |
| Export | @react-pdf/renderer |
| Drag & Drop | dnd-kit |
| Linting | Biome |
| Monorepo | npm workspaces |

## Project Structure

```
bettaresume/
├── api/                    # Cloudflare Workers backend
│   ├── drizzle/            # SQL migration files
│   ├── src/
│   │   ├── server.ts       # Worker entry point (CORS, routing)
│   │   ├── db/
│   │   │   ├── schema.ts   # Drizzle ORM schema
│   │   │   └── seed.sql    # Seed data for local development
│   │   └── trpc/
│   │       ├── context.ts  # Request context (auth, db)
│   │       ├── middleware/  # Auth middleware
│   │       └── procedures/ # tRPC routers (resume, section, auth, user)
│   ├── wrangler.jsonc      # Cloudflare Workers config
│   └── drizzle.config.ts   # Drizzle Kit config
│
├── packages/
│   └── types/              # Shared Zod schemas & TypeScript types
│       └── src/
│           ├── schemas.ts  # Zod validation schemas
│           └── types.ts    # Inferred TypeScript types
│
├── src/                    # Next.js frontend
│   ├── app/                # App entry, routing, providers
│   ├── components/
│   │   ├── sections-forms/ # One form component per section type (12 total)
│   │   ├── rich-text-editor/
│   │   ├── export/         # PDF/DOCX export UI
│   │   └── ui/             # shadcn/Radix UI primitives
│   ├── features/
│   │   ├── auth/           # Auth UI + Zustand store
│   │   ├── dashboard/      # Resume list page
│   │   └── resume-editor/  # Main editor (preview, sections, templates, variations)
│   ├── hooks/              # Shared React hooks
│   └── lib/                # tRPC client, hash router, utils
│
└── docs/                   # In-depth documentation
    ├── API.md
    ├── BACKEND.md
    ├── DATABASE.md
    ├── DEVELOPMENT.md
    ├── FRONTEND.md
    └── TYPES.md
```

## Getting Started

### Prerequisites

- **Node.js 20+**
- **npm** (comes with Node.js)
- A free [Clerk](https://clerk.com) account for authentication keys

### 1. Clone & Install

```bash
git clone https://github.com/your-username/bettaresume.git
cd bettaresume
npm install
```

### 2. Configure Environment Variables

**Frontend** — create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
NEXT_PUBLIC_DEV_MODE=true
```

**Backend** — create `api/.dev.vars`:

```env
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

Get your Clerk API keys from the [Clerk Dashboard](https://dashboard.clerk.com) → **API Keys**.

### 3. Set Up the Database

```bash
# Apply migrations to the local Cloudflare D1 database
npm run db:migrate
```

### 4. Start Development Servers

```bash
# Recommended: resets the DB, seeds dummy data, and starts both servers
npm run dev:seed

# Or, if the database is already initialized:
npm run dev
```

This starts:
- **Frontend** at `http://localhost:3000`
- **Backend API** at `http://localhost:4000`

> **Tip:** Set `NEXT_PUBLIC_DEV_MODE=true` in `.env.local` to bypass Clerk authentication during local development.

## Development

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start full dev environment (resets DB + seeds + starts servers) |
| `npm run dev:seed` | Same as above with explicit seed step |
| `npm run dev:frontend` | Start only the Next.js dev server |
| `npm run dev:api` | Start only the Cloudflare Worker dev server |
| `npm run build` | Build types, then Next.js static export |
| `npm run check` | Run Biome linter/formatter checks |
| `npm run check:write` | Auto-fix lint/format issues |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run clean` | Remove build artifacts |

### Database Commands

| Command | Description |
|---|---|
| `npm run db:migrate` | Apply migrations to the local D1 database |
| `npm run db:seed` | Seed the local database with dummy data |
| `npm run db:reset` | Reset the local database |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |

### Adding a New Resume Section Type

1. Add the new type to `sectionTypeSchema` in `packages/types/src/schemas.ts`
2. Add a Zod content schema for the new type
3. Create a form component in `src/components/sections-forms/`
4. Register the component in the section renderer
5. Update the backend section procedures if needed

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full walkthrough.

## Deployment

### Frontend

The Next.js app builds to a fully static output (`out/`) compatible with any static host.

**Cloudflare Pages:**
```bash
npm run build
# Deploy the `out/` directory to Cloudflare Pages
```

**GitHub Pages:** The `postbuild` script handles any necessary file transformations for GitHub Pages compatibility.

Set the following environment variables in your hosting provider:
```env
NEXT_PUBLIC_API_URL=https://api.bettaresume.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
```

### Backend (Cloudflare Workers)

```bash
cd api
npx wrangler deploy
```

Make sure you have set the following secrets in Wrangler/Cloudflare before deploying:
```bash
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_PUBLISHABLE_KEY
```

For production database migrations:
```bash
# Requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN in environment
npm run db:migrate
```

See [docs/BACKEND.md](docs/BACKEND.md) and [docs/DATABASE.md](docs/DATABASE.md) for detailed deployment instructions.

## Documentation

| Doc | Description |
|---|---|
| [API.md](docs/API.md) | tRPC procedures, request format, and authentication |
| [BACKEND.md](docs/BACKEND.md) | Cloudflare Workers setup, CORS, routing, error handling |
| [DATABASE.md](docs/DATABASE.md) | Schema overview, migrations, D1 configuration |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Full setup guide, troubleshooting, and workflow reference |
| [FRONTEND.md](docs/FRONTEND.md) | Next.js architecture, state management, component patterns |
| [TYPES.md](docs/TYPES.md) | Shared Zod schemas and TypeScript type system |

## API Testing

A [Bruno](https://www.usebruno.com/) collection is included in the `bruno/` directory for testing API endpoints directly. Open the collection in Bruno and point it at `http://localhost:4000`.

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and ensure everything passes:
   ```bash
   npm run check
   npm run typecheck
   ```
4. Commit your changes: `git commit -m 'feat: add my feature'`
5. Push and open a Pull Request

Please follow the existing code style (enforced by Biome) and keep PRs focused on a single concern.

## License

[MIT](LICENSE) — free to use, modify, and distribute.
