'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Search,
  BookOpen,
  FileText,
  GitBranch,
  Palette,
  Download,
  Layout,
  Edit3,
  Eye,
  ChevronRight,
  Lightbulb,
  Zap,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

// Guide sections data
const GUIDE_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Learn the basics of creating and managing your resumes',
    articles: [
      {
        id: 'create-resume',
        title: 'Creating Your First Resume',
        content: `
## Creating Your First Resume

Getting started with Betta Resume is simple and straightforward.

### Quick Start
1. Click the **"New Resume"** button on the dashboard
2. You'll be taken to the editor with a blank resume
3. Start filling in your information section by section

### What You Get
- A pre-configured resume with essential sections
- Personal Info, Summary, Experience, Education, and Skills
- Ready-to-use professional template

### Pro Tips
- **Don't worry about perfection** - you can always edit later
- **Start with Personal Info** - this sets the header for your resume
- **Use the preview panel** - see changes in real-time as you type
        `,
      },
      {
        id: 'editor-overview',
        title: 'Understanding the Editor',
        content: `
## The Editor Interface

The editor uses a powerful 3-panel layout inspired by VS Code.

### Left Panel - Content Navigation
- Lists all your resume sections
- Drag and drop to reorder sections
- Click to select and edit a section
- Shows sync status for versions

### Center Panel - Editor
- Where you edit the selected section
- Different forms for different section types
- Rich text editor for summary and descriptions
- Save changes explicitly for full control

### Right Panel - Live Preview
- Real-time preview of your resume
- Matches exactly what will be exported
- Collapsible to give more editing space
- Shows all pages if multi-page

### Top Bar
- Resume name and navigation
- Version selector (if you have versions)
- Template and design settings
- Export options
        `,
      },
      {
        id: 'sections-guide',
        title: 'Resume Sections Explained',
        content: `
## Resume Sections

Your resume is built from various sections, each serving a specific purpose.

### Personal Info 👤
Your contact details and professional identity:
- Full name and professional title
- Email, phone, location
- LinkedIn, GitHub, website links

### Summary 📝
A brief professional overview:
- 2-4 sentences about your expertise
- Supports rich text formatting
- First thing recruiters read

### Experience 💼
Your work history:
- Job title, company, dates
- Location and employment type
- Bullet points for achievements
- Technologies used

### Education 🎓
Academic background:
- Degree, institution, dates
- GPA, honors, relevant coursework
- Certifications can go here or separate

### Skills ⚡
Technical and soft skills:
- Organize by category
- Optional proficiency levels
- Keep relevant to target job

### Projects 🚀
Showcase your work:
- Project name and description
- Technologies used
- Links to live demo or GitHub

### And More...
- **Certifications** - Professional credentials
- **Awards** - Recognitions and achievements
- **Languages** - Language proficiencies
- **Volunteer** - Community involvement
- **Publications** - Papers and articles
- **References** - Available upon request
        `,
      },
    ],
  },
  {
    id: 'versions',
    title: 'Versions & Tailoring',
    icon: GitBranch,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Create tailored versions for different job applications',
    articles: [
      {
        id: 'what-are-versions',
        title: 'What Are Versions?',
        content: `
## Understanding Versions

Versions allow you to create multiple tailored copies of your resume without duplicating everything.

### The Problem They Solve
- Different jobs need different resume emphases
- Copying entire resumes is wasteful and hard to maintain
- Updates to common info should propagate automatically

### How They Work
- **Main Resume** - Your master copy with all information
- **Versions** - Tailored copies that inherit from the main
- **Linked Sections** - Automatically sync with the main resume
- **Custom Sections** - Override specific content for this version

### Example Use Case
You're a Full-Stack Developer applying for:
- A **Frontend** role → Emphasize React, UI/UX projects
- A **Backend** role → Emphasize APIs, databases, system design
- A **Startup** role → Emphasize versatility, quick learning

Each version shares your contact info, education, and most experience, but has tailored summaries and skill emphases.
        `,
      },
      {
        id: 'create-version',
        title: 'Creating a Version',
        content: `
## Creating a Tailored Version

### From the Dashboard
1. Open your main resume
2. In the left panel, find the **"Versions"** section
3. Click **"+ New Version"**
4. Choose a domain (Software, Data Science, Product, etc.)
5. Give it a descriptive name

### From a Section (Quick Method)
1. While editing any section, click the **"Create Tailored Copy"** button
2. This creates a version with that section already customized
3. Perfect when you know exactly what to change

### Naming Best Practices
- Include the target role: "Frontend Developer - Startup"
- Include company name: "Google SWE Application"
- Be specific: "Data Science - ML Focus"
        `,
      },
      {
        id: 'linked-vs-custom',
        title: 'Linked vs Custom Sections',
        content: `
## Section Sync Status

Each section in a version can be either **Synced** or **Custom**.

### Synced Sections (Linked)
- Show a **link icon** 🔗
- Automatically mirror the main resume
- When you update the main, versions update too
- Perfect for: Contact info, Education, most Experience

### Custom Sections (Unlinked)
- Show a **"Custom"** badge
- Independent from the main resume
- Your edits here don't affect other versions
- Perfect for: Summary, specific skills, targeted projects

### Converting Between States
- **To Customize**: Simply edit the section - it auto-detaches
- **To Re-sync**: Click "Sync with Main" to restore the link

### Smart Workflow
1. Keep most sections synced for easy maintenance
2. Only customize what's truly different per application
3. Update your main resume to update all synced sections at once
        `,
      },
      {
        id: 'version-workflow',
        title: 'Version Management Workflow',
        content: `
## Best Practices for Versions

### Recommended Workflow

**1. Perfect Your Main Resume First**
- Add all your experience, projects, skills
- This is your "complete" resume
- Don't worry about length - versions can hide sections

**2. Create Domain-Specific Versions**
- One for each type of role you're targeting
- Software, Data, Product, Design, etc.

**3. Customize Strategically**
- Summary: Always customize per role type
- Skills: Reorder or filter for relevance
- Experience: Highlight different achievements
- Projects: Feature the most relevant ones

**4. Maintain the Main**
- New job? Add it to main first
- It automatically appears in synced versions
- Then customize descriptions per version if needed

### Quick Tips
- Use descriptive version names
- Archive versions after job applications close
- Review and update quarterly
        `,
      },
    ],
  },
  {
    id: 'templates-design',
    title: 'Templates & Design',
    icon: Palette,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    description: 'Customize the look and feel of your resume',
    articles: [
      {
        id: 'choosing-template',
        title: 'Choosing a Template',
        content: `
## Available Templates

Each template has a distinct style suited for different industries and preferences.

### Minimal
- Clean, simple, lots of white space
- Best for: Creative roles, startups, modern companies
- Emphasis on content over decoration

### Modern
- Contemporary design with subtle accents
- Best for: Tech companies, design roles
- Good balance of style and readability

### Classic
- Traditional, formal appearance
- Best for: Finance, law, consulting, enterprise
- Safe choice for conservative industries

### Professional
- Two-column layout, sidebar for skills
- Best for: Technical roles, detailed resumes
- Efficient use of space

### Creative
- Bold colors, unique layouts
- Best for: Design, marketing, creative agencies
- Stand out from the crowd

### Executive
- Sophisticated, premium feel
- Best for: Senior roles, leadership positions
- Commands attention and respect

### Tech
- Developer-friendly, code-inspired
- Best for: Software engineers, DevOps, IT
- Speaks the industry language
        `,
      },
      {
        id: 'customizing-design',
        title: 'Customizing Your Design',
        content: `
## Design Settings

Access design settings from the **"Design"** section in the left panel.

### Colors
- **Primary Color**: Headers, accents, links
- **Secondary Color**: Subtitles, secondary text
- Choose colors that match the company's brand
- Or keep it professional with blues/grays

### Typography
- **Font Family**: Choose from professional fonts
- **Font Size**: Adjust base size for readability
- **Heading Style**: Bold, underlined, or colored

### Layout
- **Margins**: Adjust page margins
- **Section Spacing**: Compact or spacious
- **Line Height**: Affects readability

### Pro Tips
- Match colors to target company's brand (subtly)
- Use larger fonts if you have less content
- Compact spacing for longer resumes
- Preview on different screens before exporting
        `,
      },
    ],
  },
  {
    id: 'editing',
    title: 'Editing & Saving',
    icon: Edit3,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Master the editing experience',
    articles: [
      {
        id: 'editing-sections',
        title: 'Editing Sections',
        content: `
## How to Edit

### Selecting a Section
1. Click on any section in the left panel
2. The center panel shows the edit form
3. The section highlights in the preview

### Form-Based Editing
Most sections use structured forms:
- Text inputs for names, titles, dates
- Textareas for descriptions
- Dropdowns for predefined options
- Checkboxes for toggles

### Rich Text Editing
For Summary and descriptions:
- **Bold** (Ctrl/Cmd + B)
- *Italic* (Ctrl/Cmd + I)
- Bullet lists
- Numbered lists
- Links

### Adding Items
For Experience, Education, Projects, etc.:
1. Click **"+ Add"** at the bottom of the form
2. Fill in the new entry
3. Drag to reorder if needed
        `,
      },
      {
        id: 'saving-changes',
        title: 'Saving Your Changes',
        content: `
## Save System

Betta Resume uses **explicit saving** for important changes.

### How It Works
1. Make your edits in the form
2. A save bar appears at the bottom when you have unsaved changes
3. Click **"Save Changes"** to commit
4. Or **"Discard"** to revert

### Why Explicit Saving?
- Prevents accidental changes
- Creates clear activity history
- Lets you review before committing
- Easy to undo by discarding

### Activity Log
Every save is logged:
- What section was changed
- What fields were modified
- When the change was made
- Available in the Activity section

### Auto-Save
Some changes save automatically:
- Section reordering
- Section visibility toggles
- Template switching
- Settings changes
        `,
      },
      {
        id: 'reordering-sections',
        title: 'Reordering Sections',
        content: `
## Drag & Drop Reordering

### How to Reorder
1. Hover over a section in the left panel
2. Grab the drag handle (⋮⋮)
3. Drag to the new position
4. Release to drop

### Best Practices
Order sections by relevance to the role:
1. **Contact Info** - Always first
2. **Summary** - Hook the reader
3. **Most Relevant Section** - Experience or Skills
4. **Supporting Sections** - Education, Projects
5. **Additional Info** - Certifications, Languages

### Different Orders for Different Roles
- **Experienced Professional**: Experience → Skills → Education
- **Recent Graduate**: Education → Projects → Skills
- **Career Changer**: Skills → Projects → Experience
        `,
      },
    ],
  },
  {
    id: 'export-import',
    title: 'Export & Import',
    icon: Download,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Download your resume and backup your data',
    articles: [
      {
        id: 'export-pdf',
        title: 'Exporting to PDF',
        content: `
## PDF Export

### How to Export
1. Open your resume in the editor
2. Click the **"Export"** button in the toolbar
3. Choose **"Download PDF"**
4. Your browser will download the file

### PDF Quality
- High-resolution output
- Maintains all formatting
- ATS-friendly text layer
- Print-ready quality

### Naming Convention
Files are named: \`[Your Name] - Resume.pdf\`

### Tips for Perfect PDFs
- Preview before exporting
- Check all pages if multi-page
- Verify links are clickable
- Test on different PDF readers
        `,
      },
      {
        id: 'export-json',
        title: 'Backing Up Your Data',
        content: `
## JSON Export (Backup)

### Why Backup?
- Your data is stored in your browser
- Clearing browser data = losing resumes
- Backups let you restore or transfer

### How to Export All Data
1. Go to the Dashboard
2. Click the **download icon** in the header
3. A JSON file downloads with all your resumes

### What's Included
- All resumes and versions
- All your settings
- Complete edit history
- Everything needed to restore

### When to Backup
- Before clearing browser data
- Before switching browsers/computers
- Periodically (weekly/monthly)
- After major updates
        `,
      },
      {
        id: 'import-data',
        title: 'Importing Resumes',
        content: `
## Importing Data

### Import from JSON Backup
1. Go to the Dashboard
2. Click **"Import"** card
3. Select your JSON backup file
4. All resumes are restored

### Import Single Resume
1. Go to the Dashboard
2. Click **"Import"** card
3. Select a single resume JSON file
4. It's added to your collection

### Data Merging
- Existing resumes are preserved
- Duplicates are skipped (by ID)
- New resumes are added

### Troubleshooting
- Make sure file is valid JSON
- Check browser console for errors
- Try importing one resume at a time
        `,
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Layout,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    description: 'Navigate and manage all your resumes',
    articles: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        content: `
## Your Resume Dashboard

The dashboard is your home base for managing all resumes.

### Quick Actions
- **New Resume**: Start fresh
- **Import**: Bring in existing data
- **Archived**: View archived resumes

### Resume Cards
Each card shows:
- Thumbnail preview
- Resume name/title
- Template badge
- Version count
- Last updated time

### Card Actions
Click the ⋯ menu on any card:
- **Open**: Edit the resume
- **Duplicate**: Create a copy
- **Archive/Restore**: Hide or show
- **Delete**: Remove permanently
        `,
      },
      {
        id: 'search-filter',
        title: 'Searching & Filtering',
        content: `
## Finding Your Resumes

### Search
- Type in the search bar
- Searches name, title, domain
- Results filter in real-time

### Template Filter
- Click template badges to filter
- Click again to clear filter
- Shows only resumes using that template

### Archived View
- Click "Archived" quick action
- Shows archived resumes
- Click "Show active" to return

### Clearing Filters
- Click "Clear all" to reset
- Or clear individual filters
        `,
      },
    ],
  },
  {
    id: 'tips-tricks',
    title: 'Tips & Tricks',
    icon: Lightbulb,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    description: 'Pro tips to get the most out of Betta Resume',
    articles: [
      {
        id: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts',
        content: `
## Keyboard Shortcuts

### Rich Text Editor
- **Ctrl/Cmd + B**: Bold
- **Ctrl/Cmd + I**: Italic
- **Ctrl/Cmd + U**: Underline
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Shift + Z**: Redo

### Navigation
- **Tab**: Move to next field
- **Shift + Tab**: Move to previous field
- **Escape**: Close dialogs

### Coming Soon
- Quick section navigation
- Save shortcut
- Preview toggle
        `,
      },
      {
        id: 'ats-tips',
        title: 'ATS Optimization',
        content: `
## Beat the ATS

Applicant Tracking Systems scan resumes before humans. Here's how to pass.

### Do's ✅
- Use standard section names
- Include keywords from job posting
- Use simple formatting
- Spell out acronyms once
- Use standard fonts
- Keep to 1-2 pages

### Don'ts ❌
- Don't use tables for layout
- Don't use images or graphics
- Don't use headers/footers
- Don't use fancy fonts
- Don't use columns (some ATS struggle)

### Keyword Strategy
1. Read the job posting carefully
2. Note required skills and technologies
3. Include them naturally in your resume
4. Match their exact terminology
        `,
      },
      {
        id: 'content-tips',
        title: 'Writing Great Content',
        content: `
## Resume Writing Tips

### Use Action Verbs
Start bullets with powerful verbs:
- Led, Developed, Implemented
- Increased, Reduced, Improved
- Designed, Built, Created
- Managed, Coordinated, Delivered

### Quantify Achievements
Numbers make impact tangible:
- "Increased sales by 25%"
- "Managed team of 8 engineers"
- "Reduced load time by 40%"
- "Served 1M+ daily users"

### Tailor to the Role
- Mirror language from job posting
- Highlight relevant experience first
- Remove or minimize unrelated items
- Customize your summary

### Keep It Concise
- One page for <10 years experience
- Two pages maximum for senior roles
- Every word should earn its place
- White space improves readability
        `,
      },
    ],
  },
];

export default function GuidePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);

  // Find all matching articles for search
  const searchResults = searchQuery
    ? GUIDE_SECTIONS.flatMap(section =>
        section.articles
          .filter(article =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(article => ({ ...article, section }))
      )
    : [];

  // Get current content
  const currentSection = activeSection
    ? GUIDE_SECTIONS.find(s => s.id === activeSection)
    : null;
  const currentArticle = currentSection && activeArticle
    ? currentSection.articles.find(a => a.id === activeArticle)
    : null;

  // Reset article when section changes
  useEffect(() => {
    if (activeSection && !activeArticle) {
      const section = GUIDE_SECTIONS.find(s => s.id === activeSection);
      if (section?.articles.length) {
        setActiveArticle(section.articles[0].id);
      }
    }
  }, [activeSection, activeArticle]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-semibold">User Guide</h1>
                  <p className="text-xs text-muted-foreground">Everything you need to know</p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-border/50 h-[calc(100vh-73px)] sticky top-[73px]">
          <ScrollArea className="h-full">
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guide..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value) {
                      setActiveSection(null);
                      setActiveArticle(null);
                    }
                  }}
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Search Results */}
              {searchQuery ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground px-2">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => {
                        setActiveSection(result.section.id);
                        setActiveArticle(result.id);
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <result.section.icon className={cn("h-3 w-3", result.section.color)} />
                        <span className="text-xs text-muted-foreground">{result.section.title}</span>
                      </div>
                      <p className="text-sm font-medium">{result.title}</p>
                    </button>
                  ))}
                  {searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No articles found
                    </p>
                  )}
                </div>
              ) : (
                /* Section Navigation */
                <nav className="space-y-1">
                  {GUIDE_SECTIONS.map(section => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    
                    return (
                      <div key={section.id}>
                        <button
                          onClick={() => {
                            setActiveSection(isActive ? null : section.id);
                            if (!isActive) {
                              setActiveArticle(section.articles[0]?.id || null);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                            isActive ? "bg-muted" : "hover:bg-muted/50"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", section.bgColor)}>
                            <Icon className={cn("h-4 w-4", section.color)} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{section.title}</p>
                            <p className="text-xs text-muted-foreground">{section.articles.length} articles</p>
                          </div>
                          <ChevronRight className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isActive && "rotate-90"
                          )} />
                        </button>
                        
                        {/* Sub-articles */}
                        {isActive && (
                          <div className="ml-11 mt-1 space-y-1">
                            {section.articles.map(article => (
                              <button
                                key={article.id}
                                onClick={() => setActiveArticle(article.id)}
                                className={cn(
                                  "w-full text-left text-sm p-2 rounded-md transition-colors",
                                  activeArticle === article.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                              >
                                {article.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <ScrollArea className="h-[calc(100vh-73px)]">
            <div className="max-w-3xl mx-auto px-8 py-8">
              {currentArticle ? (
                <>
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                    <span>{currentSection?.title}</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-foreground">{currentArticle.title}</span>
                  </div>

                  {/* Article Content */}
                  <article className="prose prose-neutral dark:prose-invert max-w-none">
                    <div 
                      className="[&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:mt-0
                                 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3
                                 [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-4
                                 [&>ul]:space-y-2 [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-6
                                 [&>ol]:space-y-2 [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6
                                 [&_li]:text-muted-foreground
                                 [&_strong]:text-foreground [&_strong]:font-semibold
                                 [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm"
                      dangerouslySetInnerHTML={{ 
                        __html: currentArticle.content
                          .split('\n')
                          .map(line => {
                            if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
                            if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
                            if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
                            if (/^\d+\. /.test(line)) return `<li>${line.replace(/^\d+\. /, '')}</li>`;
                            if (line.trim() === '') return '';
                            return `<p>${line}</p>`;
                          })
                          .join('\n')
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/`(.+?)`/g, '<code>$1</code>')
                          .replace(/<\/li>\n<li>/g, '</li><li>')
                          .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
                          .replace(/<\/ul>\n?<ul>/g, '')
                      }}
                    />
                  </article>

                  {/* Navigation */}
                  <Separator className="my-8" />
                  <div className="flex justify-between">
                    {(() => {
                      const currentIdx = currentSection?.articles.findIndex(a => a.id === activeArticle) ?? -1;
                      const prevArticle = currentIdx > 0 ? currentSection?.articles[currentIdx - 1] : null;
                      const nextArticle = currentSection?.articles[currentIdx + 1];
                      
                      return (
                        <>
                          {prevArticle ? (
                            <Button
                              variant="ghost"
                              onClick={() => setActiveArticle(prevArticle.id)}
                              className="gap-2"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              {prevArticle.title}
                            </Button>
                          ) : <div />}
                          {nextArticle && (
                            <Button
                              variant="ghost"
                              onClick={() => setActiveArticle(nextArticle.id)}
                              className="gap-2"
                            >
                              {nextArticle.title}
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                /* Welcome/Landing View */
                <div>
                  <div className="text-center mb-12">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Betta Resume Guide</h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Everything you need to create professional, ATS-friendly resumes
                    </p>
                  </div>

                  {/* Section Cards */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {GUIDE_SECTIONS.map(section => {
                      const Icon = section.icon;
                      return (
                        <Card
                          key={section.id}
                          className="p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                          onClick={() => {
                            setActiveSection(section.id);
                            setActiveArticle(section.articles[0]?.id || null);
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", section.bgColor)}>
                              <Icon className={cn("h-5 w-5", section.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium group-hover:text-primary transition-colors">
                                {section.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {section.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {section.articles.length} articles
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Quick Tips */}
                  <div className="mt-12">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Quick Start
                    </h2>
                    <div className="space-y-3">
                      {[
                        { icon: FileText, text: 'Create a new resume from the dashboard' },
                        { icon: Edit3, text: 'Fill in your sections using the editor forms' },
                        { icon: Eye, text: 'Preview changes in real-time on the right panel' },
                        { icon: GitBranch, text: 'Create versions to tailor for different roles' },
                        { icon: Download, text: 'Export as PDF when ready to apply' },
                      ].map((tip, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <tip.icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm">{tip.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
