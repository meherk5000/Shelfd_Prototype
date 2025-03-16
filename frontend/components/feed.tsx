"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Film,
  FileText,
  Heart,
  ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Tv,
  Repeat,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/context/AuthContext";

// Sample data
const currentlyEnjoying = [
  {
    id: 1,
    title: "Dune: Part Two",
    type: "movie",
    progress: "45 minutes in",
    coverImage: "/placeholder.svg?height=300&width=200",
  },
  {
    id: 2,
    title: "The Three-Body Problem",
    type: "book",
    progress: "Page 156 of 302",
    coverImage: "/placeholder.svg?height=300&width=200",
  },
  {
    id: 3,
    title: "Shogun",
    type: "tv",
    progress: "S1:E5 of 10",
    coverImage: "/placeholder.svg?height=300&width=200",
  },
  {
    id: 4,
    title: "your perfectionism will not save you.",
    type: "article",
    readTime: "9m",
    coverImage: "/placeholder.svg?height=300&width=200",
    author: "rent free.",
  },
  {
    id: 5,
    title: "The Future of AI in Healthcare",
    type: "article",
    readTime: "12m",
    coverImage: "/placeholder.svg?height=300&width=200",
    author: "Tech Insights",
  },
  {
    id: 6,
    title: "Foundation",
    type: "tv",
    progress: "S2:E3 of 10",
    coverImage: "/placeholder.svg?height=300&width=200",
  },
  {
    id: 7,
    title: "Project Hail Mary",
    type: "book",
    progress: "Page 78 of 496",
    coverImage: "/placeholder.svg?height=300&width=200",
  },
  {
    id: 8,
    title: "The Art of Slow Living",
    type: "article",
    readTime: "7m",
    coverImage: "/placeholder.svg?height=300&width=200",
    author: "Mindful Magazine",
  },
];

// Update the allPosts array to make all posts media-related
const allPosts = [
  {
    id: 1,
    user: {
      name: "Taylor Wong",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "3 days ago",
    action: "reviewed",
    mediaTitle: "Oppenheimer",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Christopher Nolan has outdone himself with this historical drama. Cillian Murphy's performance is haunting and the cinematography is breathtaking. It's a long film but every minute is worth it.",
    likes: 42,
    comments: 7,
    rating: 5,
  },
  {
    id: 2,
    user: {
      name: "Jamie Smith",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "Yesterday",
    action: "is watching",
    mediaTitle: "Succession",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Just started Season 3 and I can't believe how this show keeps getting better. The writing is sharp, the performances are incredible, and the family dynamics are both hilarious and painful to watch.",
    likes: 18,
    comments: 3,
    rating: 4,
  },
  {
    id: 3,
    user: {
      name: "Alex Johnson",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "2 hours ago",
    action: "finished reading",
    mediaTitle: "The Midnight Library",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "This book completely changed my perspective on life choices and regrets. Matt Haig has a way of making you reflect on your own life while being completely absorbed in the story. Highly recommend to anyone going through a tough time.",
    likes: 24,
    comments: 5,
    rating: 5,
  },
  {
    id: 4,
    user: {
      name: "Sarah Parker",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "Yesterday",
    actionText:
      "Finally watching Arcane! The animation is absolutely stunning!",
    mediaCover: "/placeholder.svg?height=400&width=600",
    mediaType: "photo",
    mediaTitle: "Arcane",
    likes: 47,
    comments: 8,
  },
  {
    id: 5,
    user: {
      name: "Jane Smith",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "30 minutes ago",
    action: "Added",
    mediaTitle: "The Midnight Library",
    mediaCover: "/placeholder.svg?height=150&width=100",
    shelfName: "Want to Read",
    likes: 12,
    comments: 3,
  },
];

// Update the followingPosts array to make all posts media-related
const followingPosts = [
  {
    id: 1,
    user: {
      name: "Jane Smith",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "30 minutes ago",
    action: "Added",
    mediaTitle: "The Midnight Library",
    mediaCover: "/placeholder.svg?height=150&width=100",
    shelfName: "Want to Read",
    likes: 12,
    comments: 3,
  },
  {
    id: 2,
    user: {
      name: "Sarah Parker",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "Yesterday",
    actionText:
      "Finally watching Arcane! The animation is absolutely stunning!",
    mediaCover: "/placeholder.svg?height=400&width=600",
    mediaType: "photo",
    mediaTitle: "Arcane",
    likes: 47,
    comments: 8,
  },
];

// Category-specific posts
const bookPosts = [
  {
    id: 1,
    user: {
      name: "Jane Smith",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "30 minutes ago",
    action: "Added",
    mediaTitle: "The Midnight Library",
    mediaCover: "/placeholder.svg?height=150&width=100",
    shelfName: "Want to Read",
    likes: 12,
    comments: 3,
  },
  {
    id: 2,
    user: {
      name: "Alex Johnson",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "2 hours ago",
    action: "finished reading",
    mediaTitle: "The Midnight Library",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "This book completely changed my perspective on life choices and regrets. Matt Haig has a way of making you reflect on your own life while being completely absorbed in the story. Highly recommend to anyone going through a tough time.",
    likes: 24,
    comments: 5,
    rating: 5,
  },
];

const articlePosts = [
  {
    id: 1,
    user: {
      name: "Tech Insights",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "3 hours ago",
    action: "published",
    mediaTitle: "The Future of AI in Healthcare",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Artificial intelligence is revolutionizing healthcare in ways we couldn't have imagined a decade ago. From diagnosis to treatment planning, AI tools are becoming indispensable to medical professionals.",
    likes: 42,
    comments: 7,
  },
  {
    id: 2,
    user: {
      name: "rent free.",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "Yesterday",
    action: "published",
    mediaTitle: "your perfectionism will not save you.",
    mediaCover:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-03-16%20at%2014.29.43-U3sfdBjmGF2hY1CjWmOVmvcJ35g5L4.png",
    content:
      "Perfectionism isn't a virtue—it's a burden. This article explores how the pursuit of perfection often leads to procrastination, anxiety, and burnout, and offers strategies for breaking free from its grip.",
    likes: 89,
    comments: 14,
  },
];

const moviePosts = [
  {
    id: 1,
    user: {
      name: "Taylor Wong",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "3 days ago",
    action: "reviewed",
    mediaTitle: "Oppenheimer",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Christopher Nolan has outdone himself with this historical drama. Cillian Murphy's performance is haunting and the cinematography is breathtaking. It's a long film but every minute is worth it.",
    likes: 42,
    comments: 7,
    rating: 5,
  },
  {
    id: 2,
    user: {
      name: "Film Critics Circle",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "1 week ago",
    action: "analyzed",
    mediaTitle: "Poor Things",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Yorgos Lanthimos delivers another masterpiece with this adaptation. Emma Stone gives a career-defining performance in this bizarre and beautiful film about autonomy and discovery.",
    likes: 89,
    comments: 14,
    rating: 4,
  },
];

const tvPosts = [
  {
    id: 1,
    user: {
      name: "Jamie Smith",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "Yesterday",
    action: "is watching",
    mediaTitle: "Succession",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "Just started Season 3 and I can't believe how this show keeps getting better. The writing is sharp, the performances are incredible, and the family dynamics are both hilarious and painful to watch.",
    likes: 18,
    comments: 3,
    rating: 4,
  },
  {
    id: 2,
    user: {
      name: "TV Enthusiast",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    timestamp: "2 days ago",
    action: "finished",
    mediaTitle: "Shogun",
    mediaCover: "/placeholder.svg?height=150&width=100",
    content:
      "This historical drama is absolutely stunning. The attention to detail in the set design and costumes is remarkable, and the performances are captivating. One of the best shows I've seen this year.",
    likes: 35,
    comments: 8,
    rating: 5,
  },
];

function SocialPost({ post }: { post: any }) {
  return (
    <div className="border-b pb-4 mb-4">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="mt-1">
          <AvatarImage src={post.user.avatar} alt={post.user.name} />
          <AvatarFallback className="bg-gray-200">?</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{post.user.name}</span>
            <span className="text-muted-foreground text-sm">
              {post.timestamp}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {post.actionText || (
              <>
                {post.action}{" "}
                <span className="font-medium">{post.mediaTitle}</span>
                {post.shelfName && (
                  <>
                    {" "}
                    to their{" "}
                    <span className="font-medium">{post.shelfName} shelf</span>
                  </>
                )}
              </>
            )}
          </p>
          {post.content && <p className="mt-2">{post.content}</p>}

          {post.rating && (
            <div className="flex items-center mt-1">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
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

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 ml-auto"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </div>

      {post.mediaCover && (
        <div
          className={
            post.mediaType === "photo"
              ? "rounded-md overflow-hidden w-full h-56 mb-3"
              : "w-1/3 rounded-md overflow-hidden mb-3"
          }
        >
          <img
            src={post.mediaCover || "/placeholder.svg"}
            alt={post.mediaTitle || "Post image"}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center gap-8">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-8 px-0 hover:bg-transparent"
          >
            <Heart className="h-5 w-5" />
            <span>{post.likes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-8 px-0 hover:bg-transparent"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-8 px-0 hover:bg-transparent"
          >
            <Repeat className="h-5 w-5" />
            <span>Repost</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-8 px-0 hover:bg-transparent"
          >
            <Share2 className="h-5 w-5" />
            <span className="sr-only">Share</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function UpdateProgressDialog({
  media,
  isOpen,
  onClose,
  onUpdate,
}: {
  media: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <DialogDescription>
            Track your progress for {media.title}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-start gap-4">
            <div className="w-24 h-32 overflow-hidden rounded-md flex-shrink-0">
              <img
                src={media.coverImage || "/placeholder.svg"}
                alt={media.title}
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <h3 className="font-semibold">{media.title}</h3>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                {media.type === "book" && <BookOpen className="w-3 h-3 mr-1" />}
                {media.type === "movie" && <Film className="w-3 h-3 mr-1" />}
                {media.type === "tv" && <Tv className="w-3 h-3 mr-1" />}
                {media.type}
              </div>
              <div className="text-sm mt-3">Current: {media.progress}</div>
            </div>
          </div>

          {media.type === "book" && (
            <div className="grid gap-2">
              <Label htmlFor="page">Current Page</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="page"
                  type="number"
                  placeholder="Enter page number"
                  defaultValue={media.progress?.split(" ")[1]}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  of {media.progress?.split(" ")[3]}
                </span>
              </div>
              <Label className="mt-2">Or set by percentage</Label>
              <Slider
                defaultValue={[
                  media.progress
                    ? (Number.parseInt(media.progress.split(" ")[1]) /
                        Number.parseInt(media.progress.split(" ")[3])) *
                      100
                    : 50,
                ]}
                max={100}
                step={1}
              />
            </div>
          )}

          {media.type === "movie" && (
            <div className="grid gap-2">
              <Label htmlFor="minutes">Minutes Watched</Label>
              <Input
                id="minutes"
                type="number"
                placeholder="Enter minutes watched"
                defaultValue={media.progress?.split(" ")[0]}
              />
              <Label className="mt-2">Or set by percentage</Label>
              <Slider defaultValue={[50]} max={100} step={1} />
            </div>
          )}

          {media.type === "tv" && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="season">Season</Label>
                  <Select
                    defaultValue={media.progress?.split(":")[0].substring(1)}
                  >
                    <SelectTrigger id="season">
                      <SelectValue placeholder="Season" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          Season {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="episode">Episode</Label>
                  <Select
                    defaultValue={media.progress
                      ?.split(":")[1]
                      .split(" ")[0]
                      .substring(1)}
                  >
                    <SelectTrigger id="episode">
                      <SelectValue placeholder="Episode" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>
                          Episode {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Total episodes: {media.progress?.split(" ")[3]}
              </div>
            </div>
          )}

          <div className="mt-2">
            <Label htmlFor="status">Status</Label>
            <Select defaultValue="in-progress">
              <SelectTrigger id="status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onUpdate}>Save Progress</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Feed() {
  const { isAuthenticated, user } = useAuth();
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Don't show the feed content if the user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleMediaClick = (media: any) => {
    if (media.type !== "article") {
      setSelectedMedia(media);
      setIsDialogOpen(true);
    } else {
      // For articles, we would navigate to the article page
      console.log("Navigate to article:", media.title);
    }
  };

  const handleProgressUpdate = () => {
    // Here you would update the progress in your actual data
    // For now, we'll just close the dialog
    setIsDialogOpen(false);
  };

  const scrollLeft = () => {
    if (scrollAreaRef.current) {
      const container = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (container) {
        container.scrollBy({ left: -300, behavior: "smooth" });
      }
    }
  };

  const scrollRight = () => {
    if (scrollAreaRef.current) {
      const container = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (container) {
        container.scrollBy({ left: 300, behavior: "smooth" });
      }
    }
  };

  // Get user display information
  const userDisplayName = user?.email?.split("@")[0] || "User";
  const userInitials = userDisplayName.substring(0, 2).toUpperCase();

  return (
    <div className="w-full px-6 py-6 max-w-3xl mx-auto">
      {/* Main navigation tabs */}
      <div className="overflow-auto pb-2 mb-4">
        <div className="flex space-x-2 min-w-max">
          <Button
            variant={activeTab === "home" ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => setActiveTab("home")}
          >
            Home
          </Button>
          <Button
            variant={activeTab === "following" ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => setActiveTab("following")}
          >
            Following
          </Button>
          <Button
            variant={activeTab === "books" ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => setActiveTab("books")}
          >
            <BookOpen className="w-4 h-4 mr-1.5" />
            Books
          </Button>
          <Button
            variant={activeTab === "articles" ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => setActiveTab("articles")}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Articles
          </Button>
          <Button
            variant={activeTab === "movies" ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => setActiveTab("movies")}
          >
            <Film className="w-4 h-4 mr-1.5" />
            Movies
          </Button>
          <Button
            variant={activeTab === "tv" ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => setActiveTab("tv")}
          >
            <Tv className="w-4 h-4 mr-1.5" />
            TV Shows
          </Button>
        </div>
      </div>

      <section className="relative mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Currently Enjoying</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/shelf">See All</Link>
          </Button>
        </div>

        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-background/80 backdrop-blur-sm shadow-md"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Scroll left</span>
          </Button>
        </div>

        <ScrollArea className="w-full whitespace-nowrap" ref={scrollAreaRef}>
          <div className="flex space-x-4 pb-4">
            {currentlyEnjoying.map((item) => (
              <Card
                key={item.id}
                className="w-[250px] flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleMediaClick(item)}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-t-lg">
                      <img
                        src={item.coverImage || "/placeholder.svg"}
                        alt={item.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      {item.type === "book" && <BookOpen className="w-3 h-3" />}
                      {item.type === "movie" && <Film className="w-3 h-3" />}
                      {item.type === "tv" && <Tv className="w-3 h-3" />}
                      {item.type === "article" && (
                        <FileText className="w-3 h-3" />
                      )}
                      {item.type}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <div className="text-white font-medium line-clamp-1">
                        {item.title}
                      </div>
                      <div className="text-white/80 text-sm">
                        {item.type === "article" ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-white/20 text-white border-none text-xs"
                            >
                              Saved
                            </Badge>
                            <span>{item.readTime} read</span>
                          </div>
                        ) : (
                          item.progress
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-background/80 backdrop-blur-sm shadow-md"
            onClick={scrollRight}
          >
            <ChevronRight className="h-6 w-6" />
            <span className="sr-only">Scroll right</span>
          </Button>
        </div>
      </section>

      {/* What's on your mind post creation */}
      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage
                src="/placeholder.svg?height=40&width=40"
                alt={userDisplayName}
              />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="rounded-full">
                    <ImageIcon className="w-4 h-4 mr-1" />
                    Photo
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    <Film className="w-4 h-4 mr-1" />
                    Video
                  </Button>
                </div>
                <Button size="sm">Post</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed content based on active tab */}
      <div className="space-y-4">
        {activeTab === "home" &&
          allPosts.map((post) => <SocialPost key={post.id} post={post} />)}
        {activeTab === "following" &&
          followingPosts.map((post) => (
            <SocialPost key={post.id} post={post} />
          ))}
        {activeTab === "books" &&
          bookPosts.map((post) => <SocialPost key={post.id} post={post} />)}
        {activeTab === "articles" &&
          articlePosts.map((post) => <SocialPost key={post.id} post={post} />)}
        {activeTab === "movies" &&
          moviePosts.map((post) => <SocialPost key={post.id} post={post} />)}
        {activeTab === "tv" &&
          tvPosts.map((post) => <SocialPost key={post.id} post={post} />)}
      </div>

      {selectedMedia && (
        <UpdateProgressDialog
          media={selectedMedia}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onUpdate={handleProgressUpdate}
        />
      )}
    </div>
  );
}
