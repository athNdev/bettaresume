# Better Resume - Development Guide

## Quick Start

The application is fully set up and ready to use. Access it at:
**http://localhost:3000**

## Current Status

✅ **All core features implemented and working:**
- Resume creation and management
- Dashboard with resume listing
- Editor interface
- State persistence (localStorage)
- Import/Export functionality
- WYSIWYG editor (Tiptap)
- PDF export capability
- JSON export/import

## Architecture Overview

### State Management
- **Zustand** store with persistence
- Auto-saves to localStorage
- Supports multiple resumes, versions, and variations

### Data Structure
```typescript
Resume {
  id: string
  name: string
  version: number
  variationType: 'base' | 'variation'
  sections: ResumeSection[]
  metadata: {
    personalInfo: {...}
    settings: {...}
  }
  template: 'minimal' | 'modern' | 'classic' | 'professional'
}
```

### Key Files

**Core Logic:**
- `src/store/resume-store.ts` - Zustand state management
- `src/types/resume.ts` - TypeScript type definitions

**Pages:**
- `src/app/page.tsx` - Home (redirects to dashboard)
- `src/app/dashboard/page.tsx` - Resume listing
- `src/app/editor/[id]/page.tsx` - Resume editor

**Components:**
- `src/components/ui/` - shadcn/ui components
- `src/components/editor/rich-text-editor.tsx` - WYSIWYG editor
- `src/components/export/export-buttons.tsx` - Export functionality
- `src/components/import/import-resume.tsx` - Import functionality

## Features to Implement Next

### Priority 1 - Essential Features
1. **Section Editing Forms**
   - Personal info form
   - Experience/education item editors
   - Skills management
   - Project details

2. **Drag & Drop Reordering**
   - Implement using @dnd-kit (already installed)
   - Update `reorderSections` in store

3. **Template Switching**
   - UI to switch between templates
   - Visual template previews

### Priority 2 - Enhanced Functionality
1. **Resume Variations**
   - UI to create variations
   - Domain-specific customizations
   - Variation comparison view

2. **More WYSIWYG Features**
   - Font size controls
   - Color picker
   - Link insertion
   - Tables support

3. **PDF Improvements**
   - Better formatting preservation
   - Page break control
   - Print preview mode

### Priority 3 - Polish
1. **UI Enhancements**
   - Loading states
   - Success/error notifications
   - Confirmation dialogs
   - Keyboard shortcuts

2. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

3. **Additional Features**
   - Dark mode toggle
   - Resume duplication
   - Search/filter resumes
   - Export to Word (.docx)

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

## File Structure Guide

```
src/
├── app/                      # Next.js App Router
│   ├── dashboard/           # Resume list page
│   ├── editor/[id]/         # Resume editor (dynamic route)
│   ├── layout.tsx           # Root layout
│   ├── page.tsx            # Home page (redirects)
│   └── globals.css         # Global styles + Tailwind
│
├── components/              # React components
│   ├── ui/                 # shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── textarea.tsx
│   ├── editor/             # Editor-specific
│   │   └── rich-text-editor.tsx
│   ├── export/             # Export functionality
│   │   └── export-buttons.tsx
│   └── import/             # Import functionality
│       └── import-resume.tsx
│
├── lib/                     # Utilities
│   └── utils.ts            # Helper functions
│
├── store/                   # State management
│   └── resume-store.ts     # Zustand store
│
└── types/                   # TypeScript definitions
    └── resume.ts           # Type definitions
```

## Adding New Components

### Install shadcn component:
```bash
npx shadcn@latest add [component-name]
```

Examples:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
```

## Customizing Templates

Templates are defined in the resume data. To add a new template:

1. Add template type to `src/types/resume.ts`:
```typescript
export type TemplateType = 'minimal' | 'modern' | 'classic' | 'professional' | 'creative';
```

2. Create template component in `src/components/templates/`

3. Update editor to use template-specific rendering

## Storage & Persistence

- **localStorage** key: `better-resume-storage`
- Automatic persistence via Zustand middleware
- Data persists across browser sessions
- Clear data: `localStorage.removeItem('better-resume-storage')`

## Troubleshooting

### Build fails
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Type errors
```bash
# Regenerate types
npx tsc --noEmit
```

### Port already in use
```bash
# Use different port
npm run dev -- -p 3001
```

## Environment Variables

Create `.env.local` for environment variables:
```
# Future: API endpoints, authentication, etc.
# NEXT_PUBLIC_API_URL=...
```

## Contributing Guidelines

1. Follow existing code style
2. Use TypeScript strictly
3. Add types for all new features
4. Test in both dev and production builds
5. Update README.md for new features

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tiptap Editor](https://tiptap.dev)
- [Zustand](https://zustand-demo.pmnd.rs)
- [Tailwind CSS](https://tailwindcss.com)
