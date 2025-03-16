"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import {
  BookOpen,
  Film,
  Tv,
  FileText,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data - will be replaced with API calls later
const mockCurrentMedia = {
  reading: [
    {
      id: "book1",
      title: "The Post Office Girl",
      author: "Stefan Zweig",
      type: "book",
      progress: "Page 156 of 302",
      coverUrl:
        "https://images-na.ssl-images-amazon.com/images/I/81tCtHFtOgL.jpg",
      progressPercent: 65, // percentage
      lastRead: "Today",
    },
    {
      id: "book2",
      title: "Project Hail Mary",
      author: "Andy Weir",
      type: "book",
      progress: "Page 78 of 496",
      coverUrl:
        "https://images-na.ssl-images-amazon.com/images/I/91vS2L5YfEL.jpg",
      progressPercent: 30,
      lastRead: "Yesterday",
    },
  ],
  watching: [
    {
      id: "show1",
      title: "Succession",
      season: 3,
      episode: 5,
      type: "tv",
      progress: "S3:E5 of 10",
      coverUrl:
        "https://image.tmdb.org/t/p/w500/xwXs7PnorMn7aPyQQZCYaWdZVQm.jpg",
      progressPercent: 42, // percentage of season
      lastWatched: "2 days ago",
    },
    {
      id: "movie1",
      title: "Dune",
      director: "Denis Villeneuve",
      type: "movie",
      progress: "45 minutes in",
      coverUrl:
        "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
      progressPercent: 75,
      lastWatched: "Last week",
    },
  ],
  articles: [
    {
      id: "article1",
      title: "Your perfectionism will not save you.",
      type: "article",
      readTime: "9m",
      coverUrl: "/placeholder.svg?height=300&width=200",
      author: "rent free.",
    },
    {
      id: "article2",
      title: "The Future of AI in Healthcare",
      type: "article",
      readTime: "12m",
      coverUrl: "/placeholder.svg?height=300&width=200",
      author: "Tech Insights",
    },
    {
      id: "article3",
      title: "The Art of Slow Living",
      type: "article",
      readTime: "7m",
      coverUrl: "/placeholder.svg?height=300&width=200",
      author: "Mindful Magazine",
    },
  ],
};

// Sample feed posts for the tabs
const feedPosts = [
  {
    id: 1,
    user: {
      name: "Alex Johnson",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    action: "finished reading",
    mediaTitle: "The Midnight Library",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "This book completely changed my perspective on life choices and regrets. Matt Haig has a way of making you reflect on your own life while being completely absorbed in the story. Highly recommend to anyone going through a tough time.",
    timestamp: "2 hours ago",
    likes: 24,
    comments: 5,
    rating: 5,
  },
  {
    id: 2,
    user: {
      name: "Jamie Smith",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    action: "is watching",
    mediaTitle: "Succession",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Just started Season 3 and I can't believe how this show keeps getting better. The writing is sharp, the performances are incredible, and the family dynamics are both hilarious and painful to watch.",
    timestamp: "Yesterday",
    likes: 18,
    comments: 3,
    rating: 4,
  },
  {
    id: 3,
    user: {
      name: "Taylor Wong",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    action: "reviewed",
    mediaTitle: "Oppenheimer",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Christopher Nolan has outdone himself with this historical drama. Cillian Murphy's performance is haunting and the cinematography is breathtaking. It's a long film but every minute is worth it.",
    timestamp: "3 days ago",
    likes: 42,
    comments: 7,
    rating: 5,
  },
];

const featuredPosts = [
  {
    id: 1,
    user: {
      name: "Book Club Official",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    action: "recommends",
    mediaTitle: "Tomorrow, and Tomorrow, and Tomorrow",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Our Book of the Month! This novel about friendship, love, and video game design has captivated readers worldwide. Join our discussion this Friday!",
    timestamp: "Featured",
    likes: 156,
    comments: 32,
    rating: 5,
  },
  {
    id: 2,
    user: {
      name: "Film Critics Circle",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    action: "analyzed",
    mediaTitle: "Poor Things",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Yorgos Lanthimos delivers another masterpiece with this adaptation. Emma Stone gives a career-defining performance in this bizarre and beautiful film about autonomy and discovery.",
    timestamp: "Featured",
    likes: 89,
    comments: 14,
    rating: 4,
  },
];

// Update the type definitions for the media items to include all possible properties
type MediaItem = {
  id: string;
  title: string;
  type: string;
  coverUrl: string;
  // Book properties
  author?: string;
  progress?: string;
  progressPercent?: number;
  lastRead?: string;
  // TV properties
  season?: number;
  episode?: number;
  lastWatched?: string;
  // Movie properties
  director?: string;
  // Article properties
  readTime?: string;
};

function FeedPost({ post }: { post: any }) {
  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.user.avatar} alt={post.user.name} />
              <AvatarFallback>
                {post.user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                <Link href="#" className="hover:underline">
                  {post.user.name}
                </Link>
                <span className="font-normal text-muted-foreground">
                  {" "}
                  {post.action}{" "}
                </span>
                <span className="font-medium">{post.mediaTitle}</span>
              </CardTitle>
              <CardDescription>{post.timestamp}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-1">
            <div className="aspect-[3/4] overflow-hidden rounded-md">
              <img
                src={post.mediaCover || "/placeholder.svg"}
                alt={post.mediaTitle}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div className="col-span-3">
            <p className="line-clamp-3">{post.content}</p>
            {post.rating && (
              <div className="mt-2 flex items-center">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${
                        i < post.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 fill-gray-300"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <span className="ml-2 text-sm text-muted-foreground">
                  {post.rating}/5
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 flex justify-between">
        <div className="flex gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-8"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{post.likes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-8"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{post.comments}</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm">
          Share
        </Button>
      </CardFooter>
    </Card>
  );
}

export function UserCurrentMedia() {
  const { isAuthenticated, user } = useAuth();
  const [currentMedia, setCurrentMedia] = useState(mockCurrentMedia);
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Update the currentlyEnjoying mapping to use the proper type
  const currentlyEnjoying: MediaItem[] = [
    ...currentMedia.reading.map((item) => ({
      ...item,
      type: "book",
    })),
    ...currentMedia.watching.map((item) => ({
      ...item,
      type: item.season ? "tv" : "movie",
    })),
    ...currentMedia.articles.map((item) => ({
      ...item,
      type: "article",
    })),
  ];

  const handleMediaClick = (media: MediaItem) => {
    if (media.type !== "article") {
      // Instead of opening a dialog, navigate to a detail page
      console.log("Navigate to detail page for:", media.title);
    } else {
      // For articles, we would navigate to the article page
      console.log("Navigate to article:", media.title);
    }
  };

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
    <div className="w-full overflow-hidden">
      {/* Currently Enjoying Section */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Currently Enjoying</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/shelf">See All</Link>
          </Button>
        </div>

        <ScrollArea className="w-full" ref={scrollAreaRef}>
          <div className="flex space-x-4 pb-4">
            {currentlyEnjoying.map((item) => (
              <div
                key={item.id}
                className="w-[180px] flex-shrink-0 cursor-pointer"
                onClick={() => handleMediaClick(item)}
              >
                <div className="relative aspect-[3/4] mb-2 overflow-hidden rounded-md">
                  <img
                    src={item.coverUrl || "/placeholder.svg"}
                    alt={item.title}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.currentTarget.src =
                        "/placeholder.svg?height=300&width=200";
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    {item.type === "book" && <BookOpen className="w-3 h-3" />}
                    {item.type === "movie" && <Film className="w-3 h-3" />}
                    {item.type === "tv" && <Tv className="w-3 h-3" />}
                    {item.type === "article" && (
                      <FileText className="w-3 h-3" />
                    )}
                    {item.type}
                  </div>
                </div>
                <h3 className="font-medium text-sm line-clamp-1">
                  {item.title}
                </h3>
                <div className="text-xs text-muted-foreground">
                  {item.type === "article" ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs">Saved</span>
                      <span>•</span>
                      <span>{item.readTime} read</span>
                    </div>
                  ) : (
                    item.progress
                  )}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* Tabs Section */}
      <div className="border-b mb-4">
        <div className="flex space-x-4">
          <button className="px-4 py-2 border-b-2 border-primary font-medium text-sm">
            Home
          </button>
          <button className="px-4 py-2 text-muted-foreground font-medium text-sm">
            Following
          </button>
        </div>
      </div>

      {/* Feed Posts */}
      <div className="space-y-4 max-w-3xl">
        {feedPosts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
