# Development Setup

## Prerequisites

- Node.js 20+
- npm or pnpm
- Wrangler CLI (`npm install -g wrangler`)
- Clerk account (for authentication)

## Initial Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd bettaresume
npm install

cd api-server
npm install
```

### 2. Environment Variables

#### Frontend (`.env.local` in root)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
NEXT_PUBLIC_DEV_MODE=true
```

#### Backend (`api-server/.dev.vars`)
```bash
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

Get Clerk keys from: https://dashboard.clerk.com → API Keys

### 3. Database Setup

```bash
cd api-server

# Generate migrations (if schema changed)
npx drizzle-kit generate

# Apply migrations to local D1
npx wrangler d1 migrations apply bettaresume --local
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd api-server
npx wrangler dev
# Runs on http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
# From root
npm run dev
# Runs on http://localhost:3000
```

## Development Workflow

### Making Backend Changes

1. Edit files in `api-server/src/`
2. Wrangler auto-reloads on save
3. Test via frontend or API client (Bruno collection in `/bruno`)

### Making Frontend Changes

1. Edit files in `src/`
2. Next.js hot reloads
3. Changes appear immediately

### Database Schema Changes

1. Edit `api-server/src/db/schema.ts`
2. Generate migration:
   ```bash
   cd api-server
   npx drizzle-kit generate
   ```
3. Apply migration:
   ```bash
   npx wrangler d1 migrations apply bettaresume --local
   ```

### Adding New Section Types

1. Add type to `packages/types/src/schemas.ts`
2. Add default factory in `src/types/resume.ts`
3. Create form component in `src/components/sections-forms/`
4. Add to section renderer in `src/views/resume-editor.tsx`
5. Update preview in `src/components/resume-editor/preview.tsx`

## Common Issues

### CORS Errors
Backend must include these headers:
```typescript
'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-trpc-source, trpc-accept'
```

### "Publishable key not valid"
- Check `.dev.vars` has correct Clerk keys
- `pk_test_` goes in `CLERK_PUBLISHABLE_KEY`
- `sk_test_` goes in `CLERK_SECRET_KEY`

### Foreign Key Constraint Failed
- User doesn't exist in database
- First login creates user, then operations work
- Or manually insert user via Drizzle Studio:
  ```bash
  npx drizzle-kit studio
  ```

### Nested Button Hydration Error
Don't put `<Button>` inside `<AccordionTrigger>`:
```tsx
// ❌ Wrong
<AccordionTrigger>
  <Button>Click</Button>
</AccordionTrigger>

// ✅ Correct
<div className="flex">
  <AccordionTrigger>Content</AccordionTrigger>
  <Button>Click</Button>
</div>
```

### Port Mismatch
Ensure `NEXT_PUBLIC_API_URL` matches Wrangler port (default 4000).

## Testing API

### Bruno Collection
API test collection in `/bruno`:
```bash
# Open with Bruno app
bruno run bruno/
```

### Manual Testing
```bash
# Health check
curl http://localhost:4000/health

# tRPC endpoint (needs auth)
curl http://localhost:4000/trpc/resume.list \
  -H "Authorization: Bearer <clerk-token>"
```

## Deployment

### Frontend (Vercel/Cloudflare Pages)
```bash
npm run build
# Deploy /out directory
```

### Backend (Cloudflare Workers)
```bash
cd api-server
npx wrangler deploy
```

Set secrets in Cloudflare dashboard:
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`

## Useful Commands

```bash
# Lint
npm run lint

# Type check
npm run type-check

# Format
npm run format

# Database studio (visual editor)
cd api-server && npx drizzle-kit studio

# Reset local database
rm -rf api-server/.wrangler/state
npx wrangler d1 migrations apply bettaresume --local
```
