# Shared Types (packages/types)

## Overview

This package contains **Zod schemas** and **TypeScript types** shared between frontend and backend.

## Installation

```bash
cd packages/types
npm install
```

## Files

### `src/schemas.ts` - Zod Validation Schemas

#### Personal Info Schema
```typescript
export const personalInfoSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  location: z.string().optional(),
  professionalTitle: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  github: z.string().optional(),
  portfolio: z.string().url().optional().or(z.literal('')),
});
```

#### Resume Settings Schema
```typescript
export const resumeSettingsSchema = z.object({
  pageSize: z.enum(['Letter', 'A4']),
  margins: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
  }),
  fontSize: z.number(),
  fontScale: z.number(),
  typography: z.object({
    name: z.number(),
    title: z.number(),
    sectionHeading: z.number(),
    itemTitle: z.number(),
    body: z.number(),
    small: z.number(),
  }),
  lineHeight: z.number(),
  fontFamily: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    text: z.string(),
    heading: z.string(),
    accent: z.string(),
    background: z.string(),
    divider: z.string(),
  }),
  sectionSpacing: z.enum(['compact', 'normal', 'relaxed']),
  showIcons: z.boolean(),
  dateFormat: z.string(),
  accentStyle: z.enum(['none', 'underline', 'background', 'border']),
});
```

#### Resume Metadata Schema
```typescript
export const resumeMetadataSchema = z.object({
  personalInfo: personalInfoSchema,
  settings: resumeSettingsSchema,
});
```

### `src/types.ts` - TypeScript Types

```typescript
// Inferred from Zod schemas
export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type ResumeSettings = z.infer<typeof resumeSettingsSchema>;
export type ResumeMetadata = z.infer<typeof resumeMetadataSchema>;

// Section types
export type SectionType = 
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'volunteer'
  | 'publications'
  | 'references'
  | 'languages';
```

### `src/index.ts` - Exports

```typescript
export * from './schemas';
export * from './types';
```

## Usage

### In Backend (api-server)
```typescript
import { resumeMetadataSchema, type ResumeMetadata } from '@bettaresume/types';

// Validate input
const metadata = resumeMetadataSchema.parse(input.metadata);
```

### In Frontend (src)
```typescript
import { resumeMetadataSchema, type PersonalInfo } from '@bettaresume/types';

// Form validation
const result = resumeMetadataSchema.safeParse(formData);
if (!result.success) {
  // Handle validation errors
}
```

## Adding New Schemas

1. Define Zod schema in `src/schemas.ts`
2. Export type in `src/types.ts`
3. Re-export in `src/index.ts`
4. Run `npm run build` in packages/types

## Default Values

Default metadata values used when creating resumes:

```typescript
const DEFAULT_METADATA = {
  personalInfo: {
    fullName: 'Your Name',
    email: '',
    phone: '',
    location: '',
    professionalTitle: '',
    linkedin: '',
    website: '',
    github: '',
    portfolio: '',
  },
  settings: {
    pageSize: 'Letter',
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    fontSize: 11,
    fontScale: 1,
    typography: {
      name: 24,
      title: 14,
      sectionHeading: 14,
      itemTitle: 12,
      body: 11,
      small: 9,
    },
    lineHeight: 1.5,
    fontFamily: 'Inter',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      text: '#1e293b',
      heading: '#1e293b',
      accent: '#0891b2',
      background: '#ffffff',
      divider: '#e2e8f0',
    },
    sectionSpacing: 'normal',
    showIcons: true,
    dateFormat: 'MMM YYYY',
    accentStyle: 'underline',
  },
};
```
