/**
 * Resume Types
 */

// Core Resume Types
export interface Resume {
  id: string;
  name: string;
  baseResumeId?: string;
  variationType: 'base' | 'variation';
  domain?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  sections: ResumeSection[];
  metadata: ResumeMetadata;
  template: TemplateType;
  tags?: string[];
  isArchived?: boolean;
  lastExportedAt?: string;
  pages?: ResumePage[];
}

// Multi-page support
export interface ResumePage {
  id: string;
  name: string;
  order: number;
  sectionIds: string[];
}

export interface ResumeSection {
  id: string;
  type: SectionType;
  order: number;
  visible: boolean;
  content: SectionContent;
  layout?: SectionLayout;
  pageId?: string;
  linkedToBase?: boolean;
}

export type SectionType =
  | 'personal-info'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'languages'
  | 'publications'
  | 'volunteer'
  | 'references'
  | 'custom';

export interface SectionContent {
  title?: string;
  data: Record<string, unknown> | unknown[];
  html?: string;
}

export interface SectionLayout {
  columns?: 1 | 2 | 3;
  alignment?: 'left' | 'center' | 'right';
  spacing?: 'compact' | 'normal' | 'spacious';
  showDivider?: boolean;
}

export interface ResumeMetadata {
  personalInfo: PersonalInfo;
  settings: ResumeSettings;
  exportHistory?: ExportRecord[];
  jobTarget?: JobTarget;
  atsScore?: ATSScore;
}

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  portfolio?: string;
  professionalTitle?: string;
  photoUrl?: string;
}

// Typography scale for consistent font sizing
export interface TypographyScale {
  name: number;
  title: number;
  sectionHeading: number;
  itemTitle: number;
  body: number;
  small: number;
}

export interface ResumeSettings {
  pageSize: 'A4' | 'Letter';
  margins: { top: number; right: number; bottom: number; left: number };
  fontSize: number;
  fontScale: number;
  typography: TypographyScale;
  lineHeight: number;
  fontFamily: FontFamily;
  colors: ResumeColors;
  sectionSpacing: 'compact' | 'normal' | 'spacious';
  showIcons: boolean;
  dateFormat: 'MM/YYYY' | 'MMM YYYY' | 'MMMM YYYY' | 'YYYY';
  accentStyle: 'underline' | 'background' | 'border' | 'none';
}

export interface PartialResumeSettings {
  pageSize?: 'A4' | 'Letter';
  margins?: Partial<{ top: number; right: number; bottom: number; left: number }>;
  fontSize?: number;
  fontScale?: number;
  typography?: Partial<TypographyScale>;
  lineHeight?: number;
  fontFamily?: FontFamily;
  colors?: Partial<ResumeColors>;
  sectionSpacing?: 'compact' | 'normal' | 'spacious';
  showIcons?: boolean;
  dateFormat?: 'MM/YYYY' | 'MMM YYYY' | 'MMMM YYYY' | 'YYYY';
  accentStyle?: 'underline' | 'background' | 'border' | 'none';
}

// Default typography scale
export const DEFAULT_TYPOGRAPHY: TypographyScale = {
  name: 28,
  title: 14,
  sectionHeading: 13,
  itemTitle: 12,
  body: 11,
  small: 10,
};

export type FontFamily = 'Inter' | 'Roboto' | 'Open Sans' | 'Lato' | 'Montserrat' | 'Playfair Display' | 'Georgia' | 'Times New Roman' | 'Arial';

export interface ResumeColors {
  primary: string;
  secondary: string;
  text: string;
  heading: string;
  accent: string;
  background: string;
  divider: string;
}

export type TemplateType = 'minimal' | 'modern' | 'classic' | 'professional' | 'creative' | 'executive' | 'tech';

export interface TemplateConfig {
  id: TemplateType;
  name: string;
  description: string;
  thumbnail: string;
  features: string[];
  defaultColors: ResumeColors;
  supportedSections: SectionType[];
  layout: 'single-column' | 'two-column' | 'sidebar';
}

export interface ExportRecord {
  id: string;
  format: 'pdf' | 'json' | 'docx' | 'txt';
  timestamp: string;
  fileName: string;
  fileSize?: number;
}

export interface JobTarget {
  title: string;
  company?: string;
  description?: string;
  keywords?: string[];
  url?: string;
  addedAt: string;
}

export interface ATSScore {
  overall: number;
  breakdown: { keywords: number; formatting: number; sections: number; length: number };
  suggestions: ATSSuggestion[];
  lastAnalyzed: string;
}

export interface ATSSuggestion {
  type: 'warning' | 'error' | 'success' | 'info';
  category: 'keywords' | 'formatting' | 'content' | 'structure';
  message: string;
  sectionId?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  location?: string;
  locationType?: 'onsite' | 'remote' | 'hybrid';
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
  description: string;
  highlights?: string[];
  technologies?: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate?: string;
  graduationDate: string;
  endDate?: string;
  current: boolean;
  gpa?: string;
  maxGpa?: string;
  location?: string;
  achievements?: string[];
  coursework?: string[];
  honors?: string[];
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: Skill[];
  order: number;
}

export interface Skill {
  id: string;
  name: string;
  level?: SkillLevel;
  yearsOfExperience?: number;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Project {
  id: string;
  name: string;
  description: string;
  role?: string;
  technologies?: string[];
  url?: string;
  github?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  highlights?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expirationDate?: string;
  noExpiration?: boolean;
  credentialId?: string;
  url?: string;
  description?: string;
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';
  certification?: string;
}

export interface Publication {
  id: string;
  title: string;
  publisher: string;
  date: string;
  authors?: string[];
  url?: string;
  summary?: string;
}

export interface Volunteer {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  location?: string;
  cause?: string;
  description?: string;
  highlights?: string[];
}

export interface Reference {
  id: string;
  name: string;
  position: string;
  company?: string;
  relationship?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  isHidden?: boolean;
}

export interface ActivityLog {
  id: string;
  resumeId: string;
  action: ActivityAction;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'exported'
  | 'imported'
  | 'duplicated'
  | 'variation_created'
  | 'synced_with_base'
  | 'sync_conflicts_resolved'
  | 'section_added'
  | 'section_removed'
  | 'template_changed'
  | 'settings_changed'
  | 'section_updated';

// Template configurations
export const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple design that focuses on content',
    thumbnail: '/templates/minimal.png',
    features: ['Clean typography', 'ATS-friendly', 'Single column'],
    defaultColors: { primary: '#000000', secondary: '#666666', text: '#333333', heading: '#000000', accent: '#0066cc', background: '#ffffff', divider: '#e5e5e5' },
    supportedSections: ['personal-info', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'languages', 'publications', 'volunteer', 'references', 'custom'],
    layout: 'single-column',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design with a touch of color',
    thumbnail: '/templates/modern.png',
    features: ['Accent colors', 'Icon support', 'Skill bars'],
    defaultColors: { primary: '#1a1a2e', secondary: '#16213e', text: '#333333', heading: '#1a1a2e', accent: '#e94560', background: '#ffffff', divider: '#eaeaea' },
    supportedSections: ['personal-info', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'languages', 'publications', 'volunteer', 'references', 'custom'],
    layout: 'single-column',
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional format with timeless appeal',
    thumbnail: '/templates/classic.png',
    features: ['Serif fonts', 'Formal structure', 'Traditional layout'],
    defaultColors: { primary: '#2c3e50', secondary: '#7f8c8d', text: '#2c3e50', heading: '#2c3e50', accent: '#3498db', background: '#ffffff', divider: '#bdc3c7' },
    supportedSections: ['personal-info', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'languages', 'publications', 'volunteer', 'references', 'custom'],
    layout: 'single-column',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Business-focused design for corporate roles',
    thumbnail: '/templates/professional.png',
    features: ['Corporate style', 'Clear hierarchy', 'Structured sections'],
    defaultColors: { primary: '#1e3a5f', secondary: '#4a6fa5', text: '#333333', heading: '#1e3a5f', accent: '#2ecc71', background: '#ffffff', divider: '#d0d0d0' },
    supportedSections: ['personal-info', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'languages', 'publications', 'volunteer', 'references', 'custom'],
    layout: 'single-column',
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Bold design for creative professionals',
    thumbnail: '/templates/creative.png',
    features: ['Two-column layout', 'Visual hierarchy', 'Creative typography'],
    defaultColors: { primary: '#6c5ce7', secondary: '#a29bfe', text: '#2d3436', heading: '#6c5ce7', accent: '#fd79a8', background: '#ffffff', divider: '#dfe6e9' },
    supportedSections: ['personal-info', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'languages', 'publications', 'volunteer', 'references', 'custom'],
    layout: 'two-column',
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    description: 'Elegant design for senior positions',
    thumbnail: '/templates/executive.png',
    features: ['Premium feel', 'Elegant spacing', 'Leadership focus'],
    defaultColors: { primary: '#2d2d2d', secondary: '#555555', text: '#333333', heading: '#2d2d2d', accent: '#b8860b', background: '#ffffff', divider: '#c0c0c0' },
    supportedSections: ['personal-info', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'languages', 'publications', 'volunteer', 'references', 'custom'],
    layout: 'single-column',
  },
  tech: {
    id: 'tech',
    name: 'Tech',
    description: 'Designed for technical roles',
    thumbnail: '/templates/tech.png',
    features: ['Skills showcase', 'Project highlights', 'Tech-focused'],
    defaultColors: { primary: '#0f0f23', secondary: '#1a1a3e', text: '#333333', heading: '#0f0f23', accent: '#00ff88', background: '#ffffff', divider: '#e0e0e0' },
    supportedSections: ['personal-info', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'languages', 'publications', 'volunteer', 'references', 'custom'],
    layout: 'sidebar',
  },
};

// Section type configurations
export const SECTION_CONFIGS: Record<SectionType, { icon: string; label: string; description: string; defaultTitle: string }> = {
  'personal-info': { icon: '👤', label: 'Personal Info', description: 'Contact information and social links', defaultTitle: 'Personal Information' },
  'summary': { icon: '📝', label: 'Summary', description: 'Professional summary or objective', defaultTitle: 'Professional Summary' },
  'experience': { icon: '💼', label: 'Experience', description: 'Work history and achievements', defaultTitle: 'Work Experience' },
  'education': { icon: '🎓', label: 'Education', description: 'Academic background', defaultTitle: 'Education' },
  'skills': { icon: '⚡', label: 'Skills', description: 'Technical and soft skills', defaultTitle: 'Skills' },
  'projects': { icon: '🚀', label: 'Projects', description: 'Personal and professional projects', defaultTitle: 'Projects' },
  'certifications': { icon: '📜', label: 'Certifications', description: 'Professional certifications', defaultTitle: 'Certifications' },
  'awards': { icon: '🏆', label: 'Awards', description: 'Awards and achievements', defaultTitle: 'Awards & Honors' },
  'languages': { icon: '🌐', label: 'Languages', description: 'Language proficiencies', defaultTitle: 'Languages' },
  'publications': { icon: '📚', label: 'Publications', description: 'Published works', defaultTitle: 'Publications' },
  'volunteer': { icon: '🤝', label: 'Volunteer', description: 'Volunteer experience', defaultTitle: 'Volunteer Experience' },
  'references': { icon: '👥', label: 'References', description: 'Professional references', defaultTitle: 'References' },
  'custom': { icon: '📄', label: 'Custom', description: 'Custom section', defaultTitle: 'Custom Section' },
};

// Factory functions for creating default data structures
export const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createDefaultExperience = (): Experience => ({
  id: generateId(),
  company: '',
  position: '',
  startDate: '',
  endDate: '',
  current: false,
  location: '',
  employmentType: 'full-time',
  description: '',
  highlights: [],
  technologies: [],
});

export const createDefaultEducation = (): Education => ({
  id: generateId(),
  institution: '',
  degree: '',
  field: '',
  startDate: '',
  graduationDate: '',
  endDate: '',
  current: false,
  gpa: '',
  location: '',
  achievements: [],
  coursework: [],
  honors: [],
});

export const createDefaultSkillCategory = (): SkillCategory => ({
  id: generateId(),
  name: '',
  skills: [],
  order: 0,
});

export const createDefaultSkill = (): Skill => ({
  id: generateId(),
  name: '',
  level: 'intermediate',
});

export const createDefaultProject = (): Project => ({
  id: generateId(),
  name: '',
  description: '',
  role: '',
  technologies: [],
  url: '',
  github: '',
  startDate: '',
  endDate: '',
  current: false,
  highlights: [],
});

export const createDefaultCertification = (): Certification => ({
  id: generateId(),
  name: '',
  issuer: '',
  date: '',
  expirationDate: '',
  noExpiration: false,
  credentialId: '',
  url: '',
});

export const createDefaultAward = (): Award => ({
  id: generateId(),
  title: '',
  issuer: '',
  date: '',
  description: '',
});

export const createDefaultLanguage = (): Language => ({
  id: generateId(),
  name: '',
  proficiency: 'intermediate',
});

export const createDefaultVolunteer = (): Volunteer => ({
  id: generateId(),
  organization: '',
  role: '',
  startDate: '',
  endDate: '',
  current: false,
  location: '',
  cause: '',
  description: '',
  highlights: [],
});

export const createDefaultPublication = (): Publication => ({
  id: generateId(),
  title: '',
  publisher: '',
  date: '',
  authors: [],
  url: '',
  summary: '',
});

export const createDefaultReference = (): Reference => ({
  id: generateId(),
  name: '',
  position: '',
  company: '',
  relationship: '',
  email: '',
  phone: '',
});

export const createDefaultPersonalInfo = (): PersonalInfo => ({
  fullName: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  website: '',
  portfolio: '',
  professionalTitle: '',
});
