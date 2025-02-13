"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Film, Newspaper, Star, Users, Library } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkAuth } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const isAuthenticated = await checkAuth();
        if (isAuthenticated) {
          router.push("/");
        } else {
          router.push("/auth/sign-in");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/auth/sign-in");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse">Loading...</div>
    </div>
  );
}

const features = [
  {
    icon: Library,
    title: "Track Your Collection",
    description:
      "Organize and manage your media collection in one place. Rate, review, and keep track of what you've watched, read, and want to explore.",
  },
  {
    icon: Star,
    title: "Personal Reviews",
    description:
      "Share your thoughts and ratings with detailed reviews. Help others discover great content through your experiences.",
  },
  {
    icon: Users,
    title: "Join Communities",
    description:
      "Connect with like-minded enthusiasts in topic-specific clubs. Discuss, share recommendations, and make new friends.",
  },
];

const mediaTypes = [
  {
    icon: BookOpen,
    title: "Books",
    description: "From classics to contemporary, track your reading journey.",
    tags: ["Fiction", "Non-Fiction", "Poetry", "Graphic Novels"],
  },
  {
    icon: Film,
    title: "Movies & TV",
    description: "Keep up with your watchlist and share recommendations.",
    tags: ["Movies", "TV Series", "Documentaries", "Anime"],
  },
  {
    icon: Newspaper,
    title: "Articles",
    description: "Save and organize interesting reads from around the web.",
    tags: ["News", "Essays", "Newsletters", "Blogs"],
  },
];

const communityImages = [
  "/placeholder.svg?height=400&width=600",
  "/placeholder.svg?height=300&width=400",
  "/placeholder.svg?height=300&width=400",
];
