"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { BookOpen, Film, ChevronRight } from "lucide-react";
import Link from "next/link";

// Mock data - will be replaced with API calls later
const mockCurrentMedia = {
  reading: [
    {
      id: "book1",
      title: "The Post Office Girl",
      author: "Stefan Zweig",
      coverUrl:
        "https://images-na.ssl-images-amazon.com/images/I/81tCtHFtOgL.jpg",
      progress: 65, // percentage
      lastRead: "Today",
    },
    {
      id: "book2",
      title: "Project Hail Mary",
      author: "Andy Weir",
      coverUrl:
        "https://images-na.ssl-images-amazon.com/images/I/91vS2L5YfEL.jpg",
      progress: 30,
      lastRead: "Yesterday",
    },
  ],
  watching: [
    {
      id: "show1",
      title: "Succession",
      season: 3,
      episode: 5,
      coverUrl:
        "https://image.tmdb.org/t/p/w500/xwXs7PnorMn7aPyQQZCYaWdZVQm.jpg",
      progress: 42, // percentage of season
      lastWatched: "2 days ago",
    },
    {
      id: "movie1",
      title: "Dune",
      director: "Denis Villeneuve",
      coverUrl:
        "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
      progress: 75,
      lastWatched: "Last week",
    },
  ],
};

export function UserCurrentMedia() {
  const { isAuthenticated, user } = useAuth();
  const [currentMedia, setCurrentMedia] = useState(mockCurrentMedia);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This would be replaced with an actual API call
    const fetchUserMedia = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          setCurrentMedia(mockCurrentMedia);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error("Error fetching user media:", error);
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchUserMedia();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || loading) {
    return null;
  }

  return (
    <div className="bg-[#f9f7f1] rounded-lg p-4 mb-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Currently Reading Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#0a4b53]" />
              <h2 className="text-lg font-semibold">Currently Reading</h2>
            </div>
            <Link
              href="/shelf"
              className="text-sm text-[#0a4b53] flex items-center hover:underline"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Current Reading Items */}
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {currentMedia.reading.map((book) => (
              <div key={book.id} className="min-w-[130px] max-w-[130px]">
                <div className="relative aspect-[2/3] mb-2">
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="rounded-md object-cover w-full h-full border-2 border-[#0a4b53]"
                    onError={(e) => {
                      e.currentTarget.src =
                        "/placeholder.svg?height=225&width=150";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 rounded-b-md">
                    {book.progress}% complete
                  </div>
                </div>
                <h4 className="text-sm font-medium truncate">{book.title}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {book.author}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last read: {book.lastRead}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Currently Watching Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-[#0a4b53]" />
              <h2 className="text-lg font-semibold">Currently Watching</h2>
            </div>
            <Link
              href="/shelf"
              className="text-sm text-[#0a4b53] flex items-center hover:underline"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Current Watching Items */}
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {currentMedia.watching.map((media) => (
              <div key={media.id} className="min-w-[160px] max-w-[160px]">
                <div className="relative aspect-video mb-2">
                  <img
                    src={media.coverUrl}
                    alt={media.title}
                    className="rounded-md object-cover w-full h-full border-2 border-[#0a4b53]"
                    onError={(e) => {
                      e.currentTarget.src =
                        "/placeholder.svg?height=84&width=150";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 rounded-b-md">
                    {media.progress}% complete
                  </div>
                </div>
                <h4 className="text-sm font-medium truncate">{media.title}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {media.season
                    ? `S${media.season} E${media.episode}`
                    : media.director}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last watched: {media.lastWatched}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
