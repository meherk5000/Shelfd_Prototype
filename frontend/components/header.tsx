"use client";

import { GlobalSearch } from "./global-search";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    const segments = path.split("/").filter(Boolean);

    // Default return object
    const defaultPage = { title: "Home", href: "/" };

    if (segments.length === 0) return defaultPage;

    const mainSegment = segments[0];
    const titles: { [key: string]: { title: string; href: string } } = {
      shelf: { title: "Shelf", href: "/shelf" },
      clubs: { title: "Clubs", href: "/clubs" },
      search: { title: "Search", href: "/search" },
      activity: { title: "Activity", href: "/activity" },
      chat: { title: "Chat", href: "/chat" },
      create: { title: "Create", href: "/create" },
      profile: { title: "Profile", href: "/profile" },
      movies: { title: "Movie", href: "/movies" },
      tv: { title: "TV Show", href: "/tv" },
      books: { title: "Book", href: "/books" },
    };

    return titles[mainSegment] || defaultPage;
  };

  const pageInfo = getPageTitle(pathname);

  return (
    <div className="flex h-16 items-center w-full px-6">
      <div className="w-[150px]">
        <Link
          href={pageInfo.href}
          className="font-semibold text-xl hover:text-primary transition-colors"
        >
          {pageInfo.title}
        </Link>
      </div>
      <div className="flex-1 flex justify-center">
        <GlobalSearch />
      </div>
      <div className="flex items-center justify-end w-[150px]">
        {isAuthenticated ? (
          <Link href="/profile">
            <img
              src={user?.image || "/placeholder.svg?height=40&width=40"}
              alt="Profile"
              className="rounded-full w-10 h-10"
            />
          </Link>
        ) : (
          <div className="flex gap-2">
            <Link href="/auth/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Sign up</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
