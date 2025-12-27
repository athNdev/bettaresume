import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import {
  getArticleContent,
  findArticleBySlug,
  getAdjacentArticles,
  getAllArticleSlugs,
  GUIDE_SECTIONS,
} from "@/lib/guide";
import { GuideSearch } from "@/components/guide/guide-search";
import {
  Sparkles,
  GitBranch,
  Palette,
  Edit3,
  Download,
  Layout,
  Zap,
  Lightbulb,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  GitBranch,
  Palette,
  Edit3,
  Download,
  Layout,
  Zap,
  Lightbulb,
};

export async function generateStaticParams() {
  const slugs = getAllArticleSlugs();
  return slugs.map((slug) => ({
    slug: slug.split("/"),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const article = findArticleBySlug(slugPath);

  if (!article) {
    return { title: "Not Found | Betta Resume Guide" };
  }

  return {
    title: `${article.article.title} | Betta Resume Guide`,
    description: article.article.description,
  };
}

// MDX Components for styling
const mdxComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-3xl font-bold mt-8 mb-4 scroll-mt-20" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-2xl font-semibold mt-8 mb-4 pb-2 border-b scroll-mt-20" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-xl font-semibold mt-6 mb-3 scroll-mt-20" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 leading-7 text-muted-foreground" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 ml-6 list-disc space-y-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 ml-6 list-decimal space-y-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-7 text-muted-foreground" {...props}>
      {children}
    </li>
  ),
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      className="text-primary hover:underline underline-offset-4"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono"
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="mb-4 p-4 rounded-lg bg-muted overflow-x-auto"
      {...props}
    >
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="mb-4 pl-4 border-l-4 border-primary/30 italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border border-border px-4 py-2 text-left font-semibold bg-muted" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border border-border px-4 py-2" {...props}>
      {children}
    </td>
  ),
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const articleContent = getArticleContent(slugPath);
  const articleInfo = findArticleBySlug(slugPath);
  const { prev, next } = getAdjacentArticles(slugPath);

  if (!articleContent || !articleInfo) {
    notFound();
  }

  const { section, article } = articleInfo;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/guide" className="flex items-center gap-2 font-semibold hover:text-primary transition-colors">
              <BookOpen className="w-5 h-5" />
              <span>Guide</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground text-sm truncate max-w-[200px]">
              {article.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <GuideSearch variant="inline" />
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Back to App</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="sticky top-20 py-8 max-h-[calc(100vh-5rem)] overflow-y-auto">
              {GUIDE_SECTIONS.map((sec) => {
                const Icon = iconMap[sec.icon] || BookOpen;
                const isCurrentSection = sec.id === section.id;
                
                return (
                  <div key={sec.id} className="mb-6">
                    <div className={`flex items-center gap-2 mb-2 text-sm font-medium ${
                      isCurrentSection ? "text-primary" : "text-muted-foreground"
                    }`}>
                      <Icon className="w-4 h-4" />
                      {sec.title}
                    </div>
                    <ul className="space-y-1 ml-6 border-l">
                      {sec.articles.map((art) => {
                        const isActive = art.slug === slugPath;
                        return (
                          <li key={art.id}>
                            <Link
                              href={`/guide/${art.slug}`}
                              className={`block py-1.5 pl-4 -ml-px text-sm border-l transition-colors ${
                                isActive
                                  ? "border-primary text-primary font-medium"
                                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                              }`}
                            >
                              {art.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 py-8">
            <article className="max-w-3xl">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link href="/guide" className="hover:text-foreground transition-colors">
                  Guide
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link
                  href={`/guide/${section.articles[0].slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {section.title}
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium truncate">
                  {article.title}
                </span>
              </nav>

              {/* Article Header */}
              <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  {articleContent.title}
                </h1>
                {articleContent.description && (
                  <p className="text-xl text-muted-foreground">
                    {articleContent.description}
                  </p>
                )}
              </header>

              {/* Article Content */}
              <div className="prose-container">
                <MDXRemote
                  source={articleContent.content}
                  components={mdxComponents}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm],
                    },
                  }}
                />
              </div>

              {/* Navigation Footer */}
              <footer className="mt-12 pt-8 border-t">
                <div className="flex items-center justify-between gap-4">
                  {prev ? (
                    <Link
                      href={`/guide/${prev.slug}`}
                      className="group flex-1 p-4 rounded-xl border hover:bg-accent/50 transition-all"
                    >
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </div>
                      <div className="font-medium group-hover:text-primary transition-colors">
                        {prev.title}
                      </div>
                    </Link>
                  ) : (
                    <div className="flex-1" />
                  )}
                  
                  {next ? (
                    <Link
                      href={`/guide/${next.slug}`}
                      className="group flex-1 p-4 rounded-xl border hover:bg-accent/50 transition-all text-right"
                    >
                      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-1">
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </div>
                      <div className="font-medium group-hover:text-primary transition-colors">
                        {next.title}
                      </div>
                    </Link>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              </footer>
            </article>
          </main>

          {/* Table of Contents (placeholder for future enhancement) */}
          <aside className="hidden xl:block w-48 shrink-0">
            <div className="sticky top-20 py-8">
              <h4 className="text-sm font-medium mb-4">On this page</h4>
              <p className="text-xs text-muted-foreground">
                Table of contents coming soon
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
