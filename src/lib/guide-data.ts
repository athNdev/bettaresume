// Guide structure - client-safe version without fs dependencies
// This is used by client components like GuideSearch

export interface Article {
  id: string;
  title: string;
  description?: string;
  slug: string;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  articles: Article[];
}

// Guide structure derived from meta.json files
export const GUIDE_SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'Sparkles',
    articles: [
      { id: 'creating-resume', title: 'Creating Your First Resume', slug: 'getting-started/creating-resume' },
      { id: 'editor-overview', title: 'Understanding the Editor', slug: 'getting-started/editor-overview' },
      { id: 'sections-guide', title: 'Resume Sections Explained', slug: 'getting-started/sections-guide' },
    ],
  },
  {
    id: 'versions',
    title: 'Versions & Tailoring',
    icon: 'GitBranch',
    articles: [
      { id: 'what-are-versions', title: 'What Are Versions?', slug: 'versions/what-are-versions' },
      { id: 'creating-version', title: 'Creating a Version', slug: 'versions/creating-version' },
      { id: 'linked-vs-custom', title: 'Linked vs Custom Sections', slug: 'versions/linked-vs-custom' },
      { id: 'workflow', title: 'Version Management Workflow', slug: 'versions/workflow' },
    ],
  },
  {
    id: 'design',
    title: 'Templates & Design',
    icon: 'Palette',
    articles: [
      { id: 'choosing-template', title: 'Choosing a Template', slug: 'design/choosing-template' },
      { id: 'customizing-design', title: 'Customizing Your Design', slug: 'design/customizing-design' },
    ],
  },
  {
    id: 'editing',
    title: 'Editing & Saving',
    icon: 'Edit3',
    articles: [
      { id: 'editing-sections', title: 'Editing Sections', slug: 'editing/editing-sections' },
      { id: 'saving-changes', title: 'Saving Your Changes', slug: 'editing/saving-changes' },
      { id: 'reordering-sections', title: 'Reordering Sections', slug: 'editing/reordering-sections' },
    ],
  },
  {
    id: 'export-import',
    title: 'Export & Import',
    icon: 'Download',
    articles: [
      { id: 'export-pdf', title: 'Exporting to PDF', slug: 'export-import/export-pdf' },
      { id: 'backup', title: 'Backing Up Your Data', slug: 'export-import/backup' },
      { id: 'importing', title: 'Importing Resumes', slug: 'export-import/importing' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'Layout',
    articles: [
      { id: 'overview', title: 'Dashboard Overview', slug: 'dashboard/overview' },
      { id: 'search-filter', title: 'Searching & Filtering', slug: 'dashboard/search-filter' },
    ],
  },
  {
    id: 'workflows',
    title: 'Job Application Workflows',
    icon: 'Zap',
    articles: [
      { id: 'complete-workflow', title: 'Complete Application Workflow', slug: 'workflows/complete-workflow' },
      { id: 'multiple-applications', title: 'Managing Multiple Applications', slug: 'workflows/multiple-applications' },
      { id: 'career-change', title: 'Career Change Applications', slug: 'workflows/career-change' },
      { id: 'interview-prep', title: 'Using Your Resume in Interviews', slug: 'workflows/interview-prep' },
      { id: 'maintenance', title: 'Keeping Your Resume Fresh', slug: 'workflows/maintenance' },
    ],
  },
  {
    id: 'tips',
    title: 'Tips & Tricks',
    icon: 'Lightbulb',
    articles: [
      { id: 'keyboard-shortcuts', title: 'Keyboard Shortcuts', slug: 'tips/keyboard-shortcuts' },
      { id: 'ats-optimization', title: 'ATS Optimization', slug: 'tips/ats-optimization' },
      { id: 'writing-tips', title: 'Writing Great Content', slug: 'tips/writing-tips' },
    ],
  },
];
