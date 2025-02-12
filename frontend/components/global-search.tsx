"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Search, Loader2, Film, Tv, Book, Newspaper } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import axios from "axios";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  year?: string;
  type: "movie" | "tv" | "book" | "article";
}

interface GroupedResults {
  books: SearchResult[]; // Changed order here
  articles: SearchResult[];
  movies: SearchResult[];
  tv_shows: SearchResult[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GroupedResults>({
    movies: [],
    tv_shows: [],
    books: [],
    articles: [],
  });
  const [loading, setLoading] = React.useState(false);
  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/media/search/quick`,
          {
            params: { query: debouncedQuery },
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        setResults(response.data);
      } catch (error) {
        console.error("Search error:", error);
        setResults({
          movies: [],
          tv_shows: [],
          books: [],
          articles: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleSelect = (result: SearchResult) => {
    console.log("Selected search result:", result);
    setOpen(false);

    switch (result.type) {
      case "tv":
        router.push(`/tv/${result.id}`);
        break;
      case "movie":
        router.push(`/movies/${result.id}`);
        break;
      case "book":
        router.push(`/books/${result.id}`);
        break;
      default:
        console.error("Unknown media type:", result.type);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full max-w-sm rounded-md border px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span>Search anything...</span>
          <kbd className="pointer-events-none ml-auto rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[600px]"
          aria-describedby="search-description"
        >
          <DialogTitle>Search</DialogTitle>
          <div id="search-description" className="sr-only">
            Search across all media types including movies, TV shows, books, and
            articles
          </div>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
            <div
              className="flex items-center border-b px-3"
              cmdk-input-wrapper=""
            >
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything..."
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {!loading && query.length >= 2 && (
                <>
                  {/* Books section first */}
                  {results.books.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Books
                      </div>
                      {results.books.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <Book className="h-4 w-4" />
                          )}
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-xs text-muted-foreground">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Articles section second */}
                  {results.articles.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Articles
                      </div>
                      {results.articles.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <Newspaper className="h-4 w-4" />
                          )}
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-xs text-muted-foreground">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Movies section third */}
                  {results.movies.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Movies
                      </div>
                      {results.movies.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <Film className="h-4 w-4" />
                          )}
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {item.year && (
                              <div className="text-xs text-muted-foreground">
                                {item.year}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TV Shows section last */}
                  {results.tv_shows.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        TV Shows
                      </div>
                      {results.tv_shows.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <Tv className="h-4 w-4" />
                          )}
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {item.year && (
                              <div className="text-xs text-muted-foreground">
                                {item.year}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {!loading &&
                query.length >= 2 &&
                !Object.values(results).some((arr) => arr.length > 0) && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                )}
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
