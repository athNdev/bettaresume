import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { GUIDE_SECTIONS, type Article, type Section } from './guide-data';

// Re-export for convenience
export { GUIDE_SECTIONS, type Article, type Section };

export interface ArticleContent {
  title: string;
  description?: string;
  content: string;
}

export function getArticleContent(slug: string): ArticleContent | null {
  // Try content/guide first (MDX files), then docs (MD files)
  const contentDir = path.join(process.cwd(), 'content/guide');
  const docsDir = path.join(process.cwd(), 'docs');
  
  // Try MDX in content/guide
  let filePath = path.join(contentDir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    // Try MD in docs
    filePath = path.join(docsDir, `${slug}.md`);
  }
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    
    return {
      title: data.title || '',
      description: data.description,
      content: content,
    };
  } catch {
    return null;
  }
}

export function findArticleBySlug(slug: string): { section: Section; article: Article } | null {
  for (const section of GUIDE_SECTIONS) {
    const article = section.articles.find(a => a.slug === slug);
    if (article) {
      return { section, article };
    }
  }
  return null;
}

export function getAdjacentArticles(currentSlug: string): { prev: Article | null; next: Article | null } {
  const allArticles = GUIDE_SECTIONS.flatMap(s => s.articles);
  const currentIndex = allArticles.findIndex(a => a.slug === currentSlug);
  
  return {
    prev: currentIndex > 0 ? allArticles[currentIndex - 1] : null,
    next: currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null,
  };
}

export function getAllArticleSlugs(): string[] {
  return GUIDE_SECTIONS.flatMap(s => s.articles.map(a => a.slug));
}
