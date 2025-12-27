"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import FlexSearch from "flexsearch";
import { GUIDE_SECTIONS } from "@/lib/guide-data";
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
  Search,
  FileText,
  ArrowRight,
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

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  sectionTitle: string;
  sectionIcon: string;
}

// Store for all articles
const allArticles: SearchResult[] = [];

// Build search index
function createSearchIndex() {
  const index = new FlexSearch.Index({
    tokenize: "forward",
    context: true,
  });

  // Add all articles to index
  let id = 0;
  for (const section of GUIDE_SECTIONS) {
    for (const article of section.articles) {
      const searchText = `${article.title} ${section.title}`;
      index.add(id, searchText);
      allArticles.push({
        id: String(id),
        title: article.title,
        slug: article.slug,
        sectionTitle: section.title,
        sectionIcon: section.icon,
      });
      id++;
    }
  }

  return index;
}

// Create index once
let searchIndex: ReturnType<typeof createSearchIndex> | null = null;

function getSearchIndex() {
  if (!searchIndex) {
    searchIndex = createSearchIndex();
  }
  return searchIndex;
}

interface GuideSearchProps {
  variant?: "hero" | "inline";
}

export function GuideSearch({ variant = "hero" }: GuideSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const router = useRouter();

  // Perform search
  React.useEffect(() => {
    if (!query.trim()) {
      // Show recent/popular when no query - first 8 articles
      setResults(allArticles.slice(0, 8));
      return;
    }

    const index = getSearchIndex();
    const searchResults = index.search(query, { limit: 10 });
    
    // Map IDs back to articles
    const items: SearchResult[] = [];
    for (const id of searchResults) {
      const article = allArticles[id as number];
      if (article) {
        items.push(article);
      }
    }
    
    setResults(items);
  }, [query]);

  // Keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/guide/${slug}`);
  };

  return (
    <>
      {/* Trigger Button */}
      {variant === "hero" ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full max-w-md relative group"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background/80 backdrop-blur-sm text-left text-muted-foreground group-hover:border-primary/50 group-hover:bg-background transition-all cursor-pointer">
              Search documentation...
            </div>
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded-md text-muted-foreground pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background rounded border">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>
      )}

      {/* Command Dialog */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog Content */}
          <div className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-xl px-4">
            <Command
              label="Search documentation"
              className="bg-popover border rounded-xl shadow-2xl overflow-hidden"
              shouldFilter={false}
            >
              {/* Search Input */}
              <div className="flex items-center border-b px-4">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search documentation..."
                  className="w-full py-4 px-3 bg-transparent outline-none text-base placeholder:text-muted-foreground"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Results */}
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                {results.length === 0 && query && (
                  <div className="py-8 text-center text-muted-foreground">
                    No results found for &quot;{query}&quot;
                  </div>
                )}

                {!query.trim() && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                    Popular articles
                  </div>
                )}

                {query.trim() && results.length > 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                    {results.length} result{results.length !== 1 ? "s" : ""} for &quot;{query}&quot;
                  </div>
                )}

                {results.map((item) => {
                  const Icon = iconMap[item.sectionIcon] || BookOpen;

                  return (
                    <Command.Item
                      key={item.slug}
                      value={item.slug}
                      onSelect={() => handleSelect(item.slug)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent group"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted group-aria-selected:bg-primary/10 shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground group-aria-selected:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.title}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="w-3 h-3" />
                          <span>{item.sectionTitle}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                    </Command.Item>
                  );
                })}
              </Command.List>

              {/* Footer */}
              <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
