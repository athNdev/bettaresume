# Betta Resume

A modern, professional resume builder SPA built with Next.js 14+, TypeScript, and shadcn/ui. Create, customize, and export beautiful resumes with a VSCode-like editing experience.

## 🎯 Features

### Core Functionality
- **Resume Management**: Create, edit, and delete multiple resumes
- **Version Control**: Maintain different versions of your resumes
- **Variations**: Create domain-specific variations (software, retail, custom domains)
- **Drag & Drop**: Easily rearrange resume sections with intuitive drag-and-drop
- **Professional Templates**: Multiple clean, minimal templates (minimal, modern, classic, professional)

### VSCode-like Editor
- **Three-panel layout**: Sections sidebar, editor pane, live preview
- **Maximized editing space**: Distraction-free editing environment
- **Collapsible preview**: Show/hide preview to maximize workspace
- **Section visibility controls**: Show/hide sections with eye icon
- **Drag handles**: Reorder sections with visual drag handles

### Dark Mode
- **Full dark mode support**: Seamless dark/light theme switching
- **System preference detection**: Respects OS theme settings
- **Persistent theme**: Theme preference saved across sessions

### WYSIWYG Editor
- Powered by Tiptap with extensive formatting options
- Text formatting (bold, italic, underline)
- Lists (bullet and numbered)
- Text alignment (left, center, right)
- Undo/Redo functionality
- MS Word-like editing experience
- Real-time preview updates

### Section-Specific Forms
- **Personal Info**: Contact details, professional title, social links
- **Experience**: Company, position, dates, location, description
- **Education**: Degree, institution, GPA, achievements
- **Skills**: Rich text with formatting
- **Summary**: Rich text for professional summary
- **Custom Sections**: Add any additional sections needed

### Export & Import
- **PDF Export**: High-quality PDF generation with proper formatting
- **JSON Export/Import**: Declarative format that preserves all settings
- Backup and restore your resumes with complete fidelity
- One-click export from editor toolbar

### UI/UX
- Clean, minimal, and professional design using shadcn/ui
- Responsive layout
- Dark mode with smooth transitions
- Intuitive dashboard for managing resumes
- Real-time preview
- Keyboard-friendly navigation

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand with persistence
- **WYSIWYG Editor**: Tiptap
- **Drag & Drop**: @dnd-kit
- **PDF Generation**: jsPDF + html2canvas
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd betta-resume
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Project Structure

\`\`\`
betta-resume/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/         # Resume dashboard
│   │   ├── editor/[id]/       # Resume editor
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx          # Home (redirects to dashboard)
│   │   └── globals.css       # Global styles
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── editor/           # WYSIWYG editor components
│   │   ├── export/           # Export functionality
│   │   └── import/           # Import functionality
│   ├── lib/                   # Utility functions
│   │   └── utils.ts          # cn() helper
│   ├── store/                 # State management
│   │   └── resume-store.ts   # Zustand store
│   └── types/                 # TypeScript definitions
│       └── resume.ts         # Resume types
├── public/                    # Static assets
├── .github/                   # GitHub configuration
│   └── copilot-instructions.md
├── components.json            # shadcn/ui config
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
├── next.config.ts            # Next.js configuration
└── package.json              # Dependencies
\`\`\`

## Usage

### Creating a Resume

1. Navigate to the dashboard
2. Click "New Resume" button
3. Enter resume details in the editor
4. Add/remove/reorder sections as needed

### Creating Variations

1. Open an existing resume
2. Create a variation for a specific domain (e.g., software, retail)
3. Customize content for that domain
4. All variations maintain links to the base resume

### Exporting

- **PDF**: Click "Export PDF" to download a print-ready PDF
- **JSON**: Click "Export JSON" to save all resume data and settings

### Importing

1. Go to the dashboard
2. Use the "Import Resume" card
3. Select a previously exported JSON file
4. Resume will be imported with all settings intact

## Customization

### Templates

Templates are defined in the resume metadata. Current templates:
- `minimal` - Clean and simple
- `modern` - Contemporary design
- `classic` - Traditional format
- `professional` - Business-focused

### Adding New Sections

Supported section types:
- `personal-info` - Contact information
- `summary` - Professional summary
- `experience` - Work experience
- `education` - Educational background
- `skills` - Technical and soft skills
- `projects` - Personal/professional projects
- `certifications` - Certifications and licenses
- `awards` - Awards and achievements
- `custom` - Custom sections

### Styling

The app uses Tailwind CSS with shadcn/ui theming. Customize colors in:
- `tailwind.config.ts` - Theme configuration
- `src/app/globals.css` - CSS variables

## Features Roadmap

- [ ] Drag-and-drop section reordering (implementation)
- [ ] More template designs
- [ ] Real-time collaboration
- [ ] Cloud storage integration
- [ ] AI-powered content suggestions
- [ ] Multiple page support
- [ ] Custom fonts
- [ ] Image uploads (profile photos, logos)
- [ ] Print preview mode
- [ ] Accessibility improvements

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
