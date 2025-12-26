# Better Resume - Project Instructions

## Project Overview
A professional, feature-rich resume builder SPA using Next.js 15+, shadcn/ui, and TypeScript with a VSCode-like editing interface.

## ✅ Completed Features

### Core Features
- [x] **Comprehensive Type System** - 13+ section types with full data models
- [x] **Zustand State Management** - Version/variation support, activity logging, persistence
- [x] **11 Section Editor Forms** - Personal, Experience, Education, Skills, Projects, Certifications, Awards, Languages, Volunteer, Publications, References
- [x] **Version Management** - Save, restore, and manage resume versions with descriptions
- [x] **Variation Management** - Create job-domain-specific variations (software, data, product, etc.)
- [x] **Template System** - 7 templates with visual previews (minimal, modern, classic, professional, creative, executive, tech)
- [x] **Settings Panel** - Typography, colors, and layout customization
- [x] **Enhanced Dashboard** - Search, filter, grid/list views, archive, stats
- [x] **Professional Editor UI** - VSCode-like 3-panel layout with all features integrated
- [x] **PDF & JSON Export** - Full backup/restore capabilities
- [x] **Dark Mode** - Full theme support with persistence

### Section Types Supported
1. Personal Info - Contact details, social links
2. Summary - Rich text professional summary
3. Experience - Position, company, highlights, technologies
4. Education - Degree, achievements, coursework, honors
5. Skills - Categories with skill levels and progress bars
6. Projects - URLs, GitHub, technologies
7. Certifications - Credential ID, URLs, expiry dates
8. Awards - Title, issuer, description
9. Languages - Proficiency levels with quick-add
10. Volunteer - Role, organization, highlights
11. Publications - Co-authors, URLs
12. References - Contact info with hide option
13. Custom - Rich text for additional sections

### Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Access at: **http://localhost:3000**

### Architecture

```
Editor Layout (VSCode-style):
┌─────────────────────────────────────────────────────────┐
│  Header (Name, Version, Variation, Template, Settings)  │
├──────────┬────────────────────────┬─────────────────────┤
│          │                        │                     │
│ Sections │   Editor Panel         │   Live Preview      │
│  Panel   │   (11 Forms + Rich     │   Panel             │
│          │    Text Editor)        │                     │
│ [Drag]   │                        │   [Collapsible]     │
│  👤 📝   │   <PersonalInfoForm>   │   Resume Preview    │
│  💼 🎓   │   <ExperienceForm>     │   with Template     │
│  ⚡ 🚀   │   <EducationForm>      │   Styling           │
│  📜 🏆   │   <SkillsForm>         │                     │
│  🌍 📚   │   etc.                 │                     │
│          │                        │                     │
└──────────┴────────────────────────┴─────────────────────┘
```

### Files Structure

```
src/
├── app/
│   ├── dashboard/page.tsx        # Enhanced resume list
│   ├── editor/[id]/page.tsx      # Professional editor
│   └── layout.tsx                # Dark mode provider
├── components/
│   ├── sections/                 # 11 section forms
│   │   ├── personal-info-form.tsx
│   │   ├── experience-form.tsx
│   │   ├── education-form.tsx
│   │   ├── skills-form.tsx
│   │   ├── projects-form.tsx
│   │   ├── certifications-form.tsx
│   │   ├── awards-form.tsx
│   │   ├── languages-form.tsx
│   │   ├── volunteer-form.tsx
│   │   ├── publications-form.tsx
│   │   ├── references-form.tsx
│   │   └── index.ts
│   ├── editor/
│   │   └── rich-text-editor.tsx  # Tiptap WYSIWYG
│   ├── export/
│   │   └── export-buttons.tsx    # PDF/JSON export
│   ├── import/
│   │   └── import-resume.tsx     # JSON import
│   ├── version-manager.tsx       # Version history UI
│   ├── variation-manager.tsx     # Variation management
│   ├── template-selector.tsx     # Template chooser
│   ├── settings-panel.tsx        # Customization
│   ├── theme-provider.tsx        # next-themes
│   └── theme-toggle.tsx          # Dark mode toggle
├── store/
│   └── resume-store.ts           # Enhanced Zustand store
└── types/
    └── resume.ts                 # Comprehensive types
```

## Technology Stack

- **Framework**: Next.js 15.5.9
- **Language**: TypeScript
- **UI**: shadcn/ui (15+ components)
- **State**: Zustand with persistence
- **WYSIWYG**: Tiptap
- **Drag & Drop**: @dnd-kit
- **PDF**: jsPDF + html2canvas
- **Dates**: date-fns
- **Icons**: Lucide React


