import Link from "next/link";
import { GUIDE_SECTIONS } from "@/lib/guide";
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
  ChevronRight,
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

export const metadata = {
  title: "Guide | Betta Resume",
  description: "Learn how to create professional resumes with Betta Resume",
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Betta Resume Guide
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Everything you need to create professional, tailored resumes for every opportunity.
            </p>
            
            {/* Search */}
            <GuideSearch variant="hero" />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {GUIDE_SECTIONS.map((section) => {
            const Icon = iconMap[section.icon] || BookOpen;
            const firstArticle = section.articles[0];
            
            return (
              <Link
                key={section.id}
                href={`/guide/${firstArticle.slug}`}
                className="group relative"
              >
                <div className="h-full p-6 rounded-2xl border bg-card hover:bg-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {section.title}
                  </h2>
                  
                  {/* Article Count */}
                  <p className="text-sm text-muted-foreground mb-4">
                    {section.articles.length} article{section.articles.length !== 1 ? "s" : ""}
                  </p>
                  
                  {/* Article List Preview */}
                  <ul className="space-y-1">
                    {section.articles.slice(0, 3).map((article) => (
                      <li
                        key={article.id}
                        className="text-sm text-muted-foreground flex items-center gap-1"
                      >
                        <ChevronRight className="w-3 h-3" />
                        <span className="truncate">{article.title}</span>
                      </li>
                    ))}
                    {section.articles.length > 3 && (
                      <li className="text-sm text-muted-foreground/70 pl-4">
                        +{section.articles.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Getting Started</h3>
              <p className="text-sm text-muted-foreground mb-3">
                New to Betta Resume? Start here.
              </p>
              <Link
                href="/guide/getting-started/creating-resume"
                className="text-sm text-primary hover:underline"
              >
                Create your first resume →
              </Link>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Version Management</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Tailor resumes for different jobs.
              </p>
              <Link
                href="/guide/versions/what-are-versions"
                className="text-sm text-primary hover:underline"
              >
                Learn about versions →
              </Link>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Export & Share</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download PDFs and backup data.
              </p>
              <Link
                href="/guide/export-import/export-pdf"
                className="text-sm text-primary hover:underline"
              >
                Export options →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
