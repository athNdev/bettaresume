/**
 * Shared entity types for BettaResume.
 * These types match the Prisma schema and are used by both
 * the API server and the SPA client.
 */

// ============================================
// User Types
// ============================================
export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  resumes?: Resume[];
}

export interface UserWithResumes extends User {
  resumes: Resume[];
}

// ============================================
// Resume Types
// ============================================
export interface Resume {
  id: string;
  userId: string;
  name: string;
  variationType: string;
  baseResumeId: string | null;
  domain: string | null;
  template: string;
  tags: string[];
  isArchived: boolean;
  metadata: ResumeMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  sections?: Section[];
  user?: User;
}

export interface ResumeWithSections extends Resume {
  sections: Section[];
}

export interface ResumeWithUser extends Resume {
  user: User;
}

export interface ResumeMetadata {
  [key: string]: unknown;
}

// ============================================
// Section Types
// ============================================
export interface Section {
  id: string;
  resumeId: string;
  type: SectionType;
  order: number;
  visible: boolean;
  content: SectionContent;
  createdAt: Date;
  updatedAt: Date;
}

export type SectionType =
  | "personal-info"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "interests"
  | "references"
  | "custom";

export interface SectionContent {
  [key: string]: unknown;
}

// ============================================
// Personal Info Section Content
// ============================================
export interface PersonalInfoContent extends SectionContent {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

// ============================================
// Experience Section Content
// ============================================
export interface ExperienceContent extends SectionContent {
  items?: ExperienceItem[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  highlights?: string[];
}

// ============================================
// Education Section Content
// ============================================
export interface EducationContent extends SectionContent {
  items?: EducationItem[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  highlights?: string[];
}

// ============================================
// Skills Section Content
// ============================================
export interface SkillsContent extends SectionContent {
  categories?: SkillCategory[];
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

// ============================================
// Projects Section Content
// ============================================
export interface ProjectsContent extends SectionContent {
  items?: ProjectItem[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  url?: string;
  technologies?: string[];
  highlights?: string[];
  startDate?: string;
  endDate?: string;
}

// ============================================
// Input Types (for API calls)
// ============================================
export interface CreateResumeInput {
  name: string;
  variationType?: string;
  baseResumeId?: string;
  domain?: string;
  template?: string;
  tags?: string[];
  isArchived?: boolean;
  metadata?: ResumeMetadata;
}

export interface UpdateResumeInput {
  name?: string;
  variationType?: string;
  baseResumeId?: string | null;
  domain?: string | null;
  template?: string;
  tags?: string[];
  isArchived?: boolean;
  metadata?: ResumeMetadata | null;
}

export interface CreateSectionInput {
  resumeId: string;
  type: string;
  order?: number;
  visible?: boolean;
  content: SectionContent;
}

export interface UpdateSectionInput {
  type?: string;
  order?: number;
  visible?: boolean;
  content?: SectionContent;
}
