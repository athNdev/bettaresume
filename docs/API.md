# API Reference

## Overview

BettaResume uses **tRPC v11** with React Query integration. The API runs as a Cloudflare Worker on port 4000.

## Base URL

- **Development**: `http://localhost:4000/trpc`
- **Production**: Configured via `NEXT_PUBLIC_API_URL`

## Authentication

All protected endpoints require a valid Clerk JWT in the `Authorization` header:

```
Authorization: Bearer <clerk_session_token>
```

The frontend automatically includes this header via the tRPC client configuration.

---

## Auth Router (`auth.*`)

### `auth.syncUser`

Syncs the currently authenticated Clerk user to the database.

**Type**: Mutation (protected)

**Input**: None

**Output**:
```typescript
{
  id: string;          // Clerk user ID
  email: string;       // User's email
  createdAt: Date;
  updatedAt: Date;
}
```

**Frontend Usage**:
```typescript
const syncMutation = trpc.auth.syncUser.useMutation();
await syncMutation.mutateAsync();
```

---

## Resume Router (`resume.*`)

### `resume.list`

Get all resumes for the authenticated user.

**Type**: Query (protected)

**Input**: None

**Output**:
```typescript
Array<{
  id: string;
  title: string;
  metadata: ResumeMetadata;
  createdAt: Date;
  updatedAt: Date;
}>
```

**Frontend Usage**:
```typescript
const { data: resumes, isLoading } = trpc.resume.list.useQuery();
```

---

### `resume.getById`

Get a single resume with all its sections.

**Type**: Query (protected)

**Input**:
```typescript
{ id: string }
```

**Output**:
```typescript
{
  id: string;
  title: string;
  metadata: ResumeMetadata;
  sections: Array<{
    id: string;
    type: SectionType;
    content: object;
    displayOrder: number;
    isVisible: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Frontend Usage**:
```typescript
const { data: resume } = trpc.resume.getById.useQuery({ id: resumeId });
```

---

### `resume.create`

Create a new resume.

**Type**: Mutation (protected)

**Input**:
```typescript
{
  title: string;
  metadata?: ResumeMetadata;  // Optional, uses defaults
}
```

**Output**:
```typescript
{
  id: string;
  title: string;
  metadata: ResumeMetadata;
  createdAt: Date;
  updatedAt: Date;
}
```

**Frontend Usage**:
```typescript
const createMutation = trpc.resume.create.useMutation({
  onSuccess: () => {
    utils.resume.list.invalidate();
  },
});
await createMutation.mutateAsync({ title: 'My Resume' });
```

---

### `resume.update`

Update an existing resume's metadata or title.

**Type**: Mutation (protected)

**Input**:
```typescript
{
  id: string;
  title?: string;
  metadata?: Partial<ResumeMetadata>;
}
```

**Output**:
```typescript
{
  id: string;
  title: string;
  metadata: ResumeMetadata;
  updatedAt: Date;
}
```

**Frontend Usage**:
```typescript
const updateMutation = trpc.resume.update.useMutation({
  onSuccess: () => {
    utils.resume.getById.invalidate({ id: resumeId });
  },
});
await updateMutation.mutateAsync({
  id: resumeId,
  metadata: { personalInfo: { fullName: 'John Doe' } },
});
```

---

### `resume.delete`

Delete a resume and all its sections.

**Type**: Mutation (protected)

**Input**:
```typescript
{ id: string }
```

**Output**:
```typescript
{ success: boolean }
```

**Frontend Usage**:
```typescript
const deleteMutation = trpc.resume.delete.useMutation({
  onSuccess: () => {
    utils.resume.list.invalidate();
  },
});
await deleteMutation.mutateAsync({ id: resumeId });
```

---

## Section Router (`section.*`)

### `section.upsert`

Create or update a section. Uses the section ID to determine insert vs update.

**Type**: Mutation (protected)

**Input**:
```typescript
{
  id?: string;           // Omit for new section
  resumeId: string;
  type: SectionType;
  content: object;       // Type-specific content
  displayOrder?: number;
  isVisible?: boolean;
}
```

**Output**:
```typescript
{
  id: string;
  resumeId: string;
  type: SectionType;
  content: object;
  displayOrder: number;
  isVisible: boolean;
  updatedAt: Date;
}
```

**Frontend Usage**:
```typescript
const upsertMutation = trpc.section.upsert.useMutation({
  onSuccess: () => {
    utils.resume.getById.invalidate({ id: resumeId });
  },
});
await upsertMutation.mutateAsync({
  resumeId,
  type: 'experience',
  content: { items: [...] },
});
```

---

### `section.delete`

Delete a section.

**Type**: Mutation (protected)

**Input**:
```typescript
{ id: string }
```

**Output**:
```typescript
{ success: boolean }
```

---

### `section.reorder`

Reorder sections within a resume.

**Type**: Mutation (protected)

**Input**:
```typescript
{
  resumeId: string;
  sectionIds: string[];  // Ordered list of section IDs
}
```

**Output**:
```typescript
{ success: boolean }
```

---

## Section Content Schemas

### Experience Section
```typescript
{
  items: Array<{
    id: string;
    company: string;
    position: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;  // HTML rich text
    highlights?: string[];
  }>;
}
```

### Education Section
```typescript
{
  items: Array<{
    id: string;
    institution: string;
    degree: string;
    field?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
    description?: string;
    honors?: string[];
  }>;
}
```

### Skills Section
```typescript
{
  categories: Array<{
    id: string;
    name: string;
    skills: string[];
  }>;
}
```

### Projects Section
```typescript
{
  items: Array<{
    id: string;
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
}
```

### Certifications Section
```typescript
{
  items: Array<{
    id: string;
    name: string;
    issuer: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
    url?: string;
  }>;
}
```

### Awards Section
```typescript
{
  items: Array<{
    id: string;
    title: string;
    issuer: string;
    date?: string;
    description?: string;
  }>;
}
```

### Languages Section
```typescript
{
  items: Array<{
    id: string;
    language: string;
    proficiency: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';
  }>;
}
```

### Volunteer Section
```typescript
{
  items: Array<{
    id: string;
    organization: string;
    role: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
}
```

### Publications Section
```typescript
{
  items: Array<{
    id: string;
    title: string;
    publisher: string;
    date?: string;
    url?: string;
    description?: string;
  }>;
}
```

### References Section
```typescript
{
  items: Array<{
    id: string;
    name: string;
    title: string;
    company: string;
    email?: string;
    phone?: string;
    relationship?: string;
  }>;
}
```

---

## Error Handling

tRPC errors are typed and include:

```typescript
{
  code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR';
  message: string;
}
```

**Frontend Error Handling**:
```typescript
const mutation = trpc.resume.create.useMutation({
  onError: (error) => {
    if (error.data?.code === 'UNAUTHORIZED') {
      // Redirect to login
    } else {
      toast.error(error.message);
    }
  },
});
```

---

## React Query Utils

Access React Query utils via `trpc.useUtils()`:

```typescript
const utils = trpc.useUtils();

// Invalidate queries
utils.resume.list.invalidate();
utils.resume.getById.invalidate({ id: resumeId });

// Prefetch
utils.resume.getById.prefetch({ id: resumeId });

// Set query data directly
utils.resume.getById.setData({ id: resumeId }, (old) => ({
  ...old,
  title: 'New Title',
}));
```
