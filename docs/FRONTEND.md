# Frontend Architecture (src)

## Overview

The frontend is a **Next.js 16** application with App Router, using static export for deployment flexibility.

## Entry Points

### Layout (`src/app/layout.tsx`)
- Root providers (Theme, Clerk, tRPC, Toast)
- Global styles and fonts
- HTML structure

### Page (`src/app/page.tsx`)
- Single page app with hash router
- Routes: `/`, `/login`, `/resume/:id`

## Routing

### Hash Router (`src/lib/hash-router.tsx`)
Custom hash-based routing for static export:
```typescript
// Routes are defined in src/components/app-router.tsx
<HashRouter>
  <Route path="/" component={Dashboard} />
  <Route path="/login" component={Login} />
  <Route path="/resume/:id" component={ResumeEditor} />
</HashRouter>
```

### Navigation
```typescript
import { useHashNavigate } from '@/lib/hash-router';
const navigate = useHashNavigate();
navigate('/resume/123');
```

## State Management

### tRPC + React Query (`src/trpc/`)
Primary data fetching layer:
```typescript
// Query
const { data, isLoading } = trpc.resume.list.useQuery();

// Mutation
const mutation = trpc.resume.create.useMutation();
await mutation.mutateAsync({ name: 'My Resume' });
```

### Zustand Stores (`src/store/`)
Local UI state:
- `auth.store.ts` - Auth state (synced with Clerk)
- `resume.store.ts` - Current resume editing state

## Components Structure

### UI Components (`src/components/ui/`)
shadcn/ui primitives:
- `button.tsx`, `input.tsx`, `card.tsx`
- `accordion.tsx`, `dialog.tsx`, `select.tsx`
- `form-save-bar.tsx` - Unsaved changes indicator

### Section Forms (`src/components/sections-forms/`)
Resume section editors:
- `personal-info-form.tsx` - Name, contact, links
- `experience-form.tsx` - Work history
- `education-form.tsx` - Academic background
- `skills-form.tsx` - Skill categories
- `projects-form.tsx` - Project showcase
- Plus: certifications, awards, volunteer, publications, references, languages

#### Form Pattern
```typescript
function ExperienceForm({ data, onChange }) {
  // Local state for editing
  const [localData, setLocalData] = useState(data);
  
  // Track unsaved changes
  const hasChanges = JSON.stringify(localData) !== JSON.stringify(data);
  
  // Save handler
  const handleSave = () => onChange(localData);
  
  return (
    <div>
      <FormSaveBar hasChanges={hasChanges} onSave={handleSave} />
      {/* Form fields */}
    </div>
  );
}
```

#### Accordion Pattern (List Forms)
```typescript
<Accordion>
  {items.map((item, index) => (
    <AccordionItem key={item.id}>
      <div className="flex items-center">
        <AccordionTrigger>
          {/* Item summary */}
        </AccordionTrigger>
        {/* Action buttons OUTSIDE trigger (no nested buttons!) */}
        <div className="flex gap-1">
          <Button onClick={() => moveItem(index, 'up')}>↑</Button>
          <Button onClick={() => removeItem(item.id)}>🗑</Button>
        </div>
      </div>
      <AccordionContent>
        {/* Form fields */}
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

### Resume Editor (`src/components/resume-editor/`)
- `preview.tsx` - Live PDF preview
- `sections-manager.tsx` - Add/remove/reorder sections
- `template-selector.tsx` - Choose resume template
- `formatting-toolbar.tsx` - Style controls

### Export (`src/components/export/`)
- `pdf-document.tsx` - React PDF template
- `export-buttons.tsx` - Download PDF/DOCX

## Views (`src/views/`)

### Dashboard (`dashboard.tsx`)
- Lists user's resumes
- Create new resume
- Resume cards with quick actions

### Resume Editor (`resume-editor.tsx`)
Main editing interface:
```typescript
function ResumeEditor() {
  const { id } = useParams();
  const { data: resume } = trpc.resume.getById.useQuery({ id });
  
  // Section form rendering based on type
  const renderSectionForm = (section) => {
    switch (section.type) {
      case 'experience': return <ExperienceForm data={section.content} />;
      case 'education': return <EducationForm data={section.content} />;
      // ...
    }
  };
}
```

### Login (`login.tsx`)
- Clerk SignIn component
- Redirect after auth

## Providers (`src/components/providers/`)

### TRPCProvider
```typescript
// Configures tRPC client with:
// - API URL from env
// - Auth headers from Clerk
// - React Query integration
```

### ClerkProvider
```typescript
// Wraps app with Clerk auth context
// Handles sign-in redirects
```

### ThemeProvider
```typescript
// Dark/light mode support
// Persists to localStorage
```

## Hooks (`src/hooks/`)

### `use-confirm.tsx`
Confirmation dialog hook:
```typescript
const confirm = useConfirm();
const confirmed = await confirm('Delete?', 'Are you sure?');
if (confirmed) doDelete();
```

## Types (`src/types/`)

### `resume.ts`
TypeScript types for resume data:
```typescript
interface Resume {
  id: string;
  name: string;
  metadata: ResumeMetadata;
  sections: Section[];
}

interface ResumeMetadata {
  personalInfo: PersonalInfo;
  settings: ResumeSettings;
}
```

Includes factory functions:
```typescript
createDefaultExperience()
createDefaultEducation()
createDefaultSkillCategory()
// etc.
```

## Styling

### Tailwind CSS
- Config in `tailwind.config.js`
- Global styles in `src/styles/globals.css`
- CSS variables for theming

### Class Utilities (`src/lib/utils.ts`)
```typescript
import { cn } from '@/lib/utils';
<div className={cn('base-class', conditional && 'extra-class')} />
```

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_DEV_MODE=true
```

## Build & Deploy

```bash
# Development
npm run dev

# Build static export
npm run build

# Output in /out directory
```
