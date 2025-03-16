"use client";

import { GlobalSearch } from "./global-search";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
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
    <div className="flex h-24 items-center w-full px-6">
      <div className="w-[150px]">
        <Link
          href={pageInfo.href}
          className="font-semibold text-3xl hover:text-primary transition-colors block"
        >
          {pageInfo.title}
        </Link>
      </div>
      <div className="flex-1 flex justify-center">
        <GlobalSearch />
      </div>
      <div className="flex items-center justify-end w-[150px]">
        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user?.image || "/placeholder.svg"}
                    alt={user?.username || "User"}
                  />
                  <AvatarFallback>
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={logout}
                className="text-red-500 hover:text-red-700 focus:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Link href="/auth/sign-in">
              <Button size="lg" variant="ghost">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="lg">Sign up</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
