"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  BookOpen,
  Film,
  Tv,
  FileText,
  Share2,
  Check,
  Plus,
  Star,
  Clock,
  Bookmark,
  Flag,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// Types for activity items
type MediaType = "book" | "movie" | "tv_show" | "article";
type ActivityType =
  | "added_to_shelf"
  | "review"
  | "follow"
  | "comment"
  | "like"
  | "completed";

interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

interface Media {
  id: string;
  title: string;
  type: MediaType;
  image?: string;
  creator?: string;
}

interface ActivityItem {
  id: string;
  user: User;
  timestamp: Date;
  type: ActivityType;
  media?: Media;
  shelfName?: string;
  targetUser?: User;
  content?: string;
  rating?: number;
  likes: number;
  comments: number;
  hasLiked: boolean;
}

// Mock data with different activity types
const getMockActivityData = (type: string): ActivityItem[] => {
  const baseActivities: ActivityItem[] = [
    {
      id: "1",
      user: {
        id: "user1",
        name: "Jane Smith",
        username: "janesmith",
        avatar: "/placeholder-avatar.jpg",
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      type: "added_to_shelf",
      media: {
        id: "book1",
        title: "The Midnight Library",
        type: "book",
        image: "/placeholder-book.jpg",
        creator: "Matt Haig",
      },
      shelfName: "Want to Read",
      likes: 12,
      comments: 3,
      hasLiked: false,
    },
    {
      id: "2",
      user: {
        id: "user2",
        name: "Alex Johnson",
        username: "alexj",
        avatar: "/placeholder-avatar2.jpg",
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      type: "review",
      media: {
        id: "movie1",
        title: "Dune",
        type: "movie",
        image: "/placeholder-movie.jpg",
        creator: "Denis Villeneuve",
      },
      content:
        "An absolute masterpiece of sci-fi filmmaking. The scale is breathtaking and the attention to detail from the book is impressive. Can't wait for part two!",
      rating: 5,
      likes: 45,
      comments: 8,
      hasLiked: true,
    },
    {
      id: "3",
      user: {
        id: "user3",
        name: "Maria García",
        username: "mariagarcia",
        avatar: "/placeholder-avatar3.jpg",
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
      type: "completed",
      media: {
        id: "tvshow1",
        title: "Succession",
        type: "tv_show",
        image: "/placeholder-tv.jpg",
        creator: "Jesse Armstrong",
      },
      content: "Finally finished the series. What an ending!",
      likes: 32,
      comments: 14,
      hasLiked: false,
    },
    {
      id: "4",
      user: {
        id: "user4",
        name: "John Doe",
        username: "johndoe",
        avatar: "/placeholder-avatar4.jpg",
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      type: "follow",
      targetUser: {
        id: "user1",
        name: "Jane Smith",
        username: "janesmith",
        avatar: "/placeholder-avatar.jpg",
      },
      likes: 8,
      comments: 0,
      hasLiked: false,
    },
    {
      id: "5",
      user: {
        id: "user5",
        name: "Sarah Wilson",
        username: "sarahw",
        avatar: "/placeholder-avatar5.jpg",
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      type: "comment",
      media: {
        id: "article1",
        title: "The Future of AI in Healthcare",
        type: "article",
        image: "/placeholder-article.jpg",
        creator: "Tech Insights",
      },
      content:
        "This was a fascinating read. I work in healthcare and I've seen firsthand how AI is transforming diagnostics.",
      likes: 19,
      comments: 5,
      hasLiked: false,
    },
  ];

  if (type === "following") {
    return baseActivities.slice(0, 3); // Return fewer items for following
  } else if (type === "mentions") {
    return [
      {
        id: "6",
        user: {
          id: "user6",
          name: "Michael Brown",
          username: "michaelb",
          avatar: "/placeholder-avatar6.jpg",
        },
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        type: "comment",
        content:
          "Hey @currentUser, have you seen this one yet? I think you'd enjoy it!",
        media: {
          id: "movie2",
          title: "Everything Everywhere All at Once",
          type: "movie",
          image: "/placeholder-movie2.jpg",
          creator: "Daniels",
        },
        likes: 3,
        comments: 1,
        hasLiked: false,
      },
    ];
  }

  return baseActivities;
};

// Function to get the icon for media type
const getMediaTypeIcon = (type: MediaType) => {
  switch (type) {
    case "book":
      return <BookOpen className="h-4 w-4" />;
    case "movie":
      return <Film className="h-4 w-4" />;
    case "tv_show":
      return <Tv className="h-4 w-4" />;
    case "article":
      return <FileText className="h-4 w-4" />;
    default:
      return <Bookmark className="h-4 w-4" />;
  }
};

// Activity feed component
export function ActivityFeed({ type = "all" }: { type?: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>(
    getMockActivityData(type)
  );
  const [loading, setLoading] = useState(false);

  // Toggle like handler
  const handleLike = (id: string) => {
    setActivities(
      activities.map((activity) => {
        if (activity.id === id) {
          const newHasLiked = !activity.hasLiked;
          return {
            ...activity,
            hasLiked: newHasLiked,
            likes: activity.likes + (newHasLiked ? 1 : -1),
          };
        }
        return activity;
      })
    );
  };

  if (loading) {
    return <ActivitySkeleton />;
  }

  return (
    <div className="space-y-8">
      {activities.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground text-lg">No activity to show</p>
        </div>
      ) : (
        activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onLike={handleLike}
          />
        ))
      )}
    </div>
  );
}

// Activity card component
function ActivityCard({
  activity,
  onLike,
}: {
  activity: ActivityItem;
  onLike: (id: string) => void;
}) {
  const getActivityContent = () => {
    switch (activity.type) {
      case "added_to_shelf":
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              Added{" "}
              <Link
                href={`/media/${activity.media?.type}/${activity.media?.id}`}
                className="font-medium hover:underline"
              >
                {activity.media?.title}
              </Link>{" "}
              to their <span className="font-medium">{activity.shelfName}</span>{" "}
              shelf
            </p>
          </div>
        );
      case "review":
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              Reviewed{" "}
              <Link
                href={`/media/${activity.media?.type}/${activity.media?.id}`}
                className="font-medium hover:underline"
              >
                {activity.media?.title}
              </Link>
              {activity.rating && (
                <span className="ml-2 text-yellow-500">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Star
                        key={i}
                        className={`inline h-3 w-3 ${
                          i < Math.floor(activity.rating || 0)
                            ? "fill-yellow-500"
                            : "fill-none"
                        }`}
                      />
                    ))}
                </span>
              )}
            </p>
            {activity.content && <p className="mt-2">{activity.content}</p>}
          </div>
        );
      case "completed":
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              Completed{" "}
              <Link
                href={`/media/${activity.media?.type}/${activity.media?.id}`}
                className="font-medium hover:underline"
              >
                {activity.media?.title}
              </Link>
            </p>
            {activity.content && <p className="mt-2">{activity.content}</p>}
          </div>
        );
      case "follow":
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              Started following{" "}
              <Link
                href={`/profile/${activity.targetUser?.username}`}
                className="font-medium hover:underline"
              >
                {activity.targetUser?.name}
              </Link>
            </p>
          </div>
        );
      case "comment":
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              {activity.media ? (
                <>
                  Commented on{" "}
                  <Link
                    href={`/media/${activity.media?.type}/${activity.media?.id}`}
                    className="font-medium hover:underline"
                  >
                    {activity.media?.title}
                  </Link>
                </>
              ) : (
                "Left a comment"
              )}
            </p>
            {activity.content && <p className="mt-2">{activity.content}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  const getMediaImage = () => {
    if (!activity.media?.image) return null;

    return (
      <div className="mt-3">
        <Link href={`/media/${activity.media.type}/${activity.media.id}`}>
          <img
            src={activity.media.image || "/placeholder.svg"}
            alt={activity.media.title}
            className="rounded-lg max-h-48 object-cover"
          />
        </Link>
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-5 bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* User avatar */}
        <Link href={`/profile/${activity.user.username}`}>
          <Avatar className="h-12 w-12">
            <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
            <AvatarFallback>
              {activity.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Activity content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <Link
                href={`/profile/${activity.user.username}`}
                className="font-medium hover:underline text-base"
              >
                {activity.user.name}
              </Link>
              <span className="text-xs text-muted-foreground ml-2">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {activity.type === "follow" &&
                activity.targetUser?.id !== "currentUser" && (
                  <Button size="sm" variant="outline" className="h-8">
                    <Plus className="h-4 w-4 mr-1" />
                    Follow
                  </Button>
                )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <X className="h-4 w-4 mr-2" />
                    Hide
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Activity specific content */}
          <div className="mt-2">{getActivityContent()}</div>

          {/* Media image if available */}
          {getMediaImage()}

          {/* Like and comment buttons */}
          <div className="flex items-center gap-6 mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${activity.hasLiked ? "text-red-500" : ""}`}
              onClick={() => onLike(activity.id)}
            >
              <Heart
                className={`h-4 w-4 ${activity.hasLiked ? "fill-red-500" : ""}`}
              />
              {activity.likes > 0 && <span>{activity.likes}</span>}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {activity.comments > 0 && <span>{activity.comments}</span>}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for activity feed
function ActivitySkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-5 bg-card shadow-sm">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full mt-3" />
              <Skeleton className="h-4 w-2/3 mt-2" />
              <div className="mt-4">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
              <div className="flex gap-6 mt-4 pt-3 border-t">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
