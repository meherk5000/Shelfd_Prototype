"use client"; // This directive tells Next.js this component should be client-side rendered

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
import { MobileNav } from "./mobile-nav";

export function Header() {
  // Get authentication state and user info from our auth context
  const { isAuthenticated, user, logout } = useAuth();
  // Get the current path to determine which page we're on
  const pathname = usePathname();

  /**
   * Helper function to determine the current page title based on URL path
   * This gives us the proper display title and link for the header
   */
  const getPageTitle = (path: string) => {
    const segments = path.split("/").filter(Boolean);

    // Default return object
    const defaultPage = { title: "Home", href: "/" };

    if (segments.length === 0) return defaultPage;

    const mainSegment = segments[0];
    // Map URL segments to their display titles and corresponding links
    // This helps us maintain consistency across the application
    const titles: { [key: string]: { title: string; href: string } } = {
      shelf: { title: "Shelf", href: "/shelf" },
      clubs: { title: "Clubs", href: "/clubs" },
      explore: { title: "Explore", href: "/explore" },
      search: { title: "Explore", href: "/search" },
      activity: { title: "Activity", href: "/activity" },
      chat: { title: "Chat", href: "/chat" },
      create: { title: "Create", href: "/create" },
      profile: { title: "Profile", href: "/profile" },
      settings: { title: "Settings", href: "/settings" },
      movies: { title: "Movie", href: "/movies" },
      tv: { title: "TV Show", href: "/tv" },
      books: { title: "Book", href: "/books" },
    };

    return titles[mainSegment] || defaultPage;
  };

  // Get the current page info based on the URL path
  const pageInfo = getPageTitle(pathname);

  return (
    <div className="flex h-20 items-center w-full px-4 md:px-6 border-b">
      {/* Mobile navigation - only shows on small screens */}
      <div className="md:hidden mr-2">
        <MobileNav />
      </div>

      {/* Page title that links back to the section homepage */}
      <div className="flex-shrink-0 mr-4">
        <Link
          href={pageInfo.href}
          className="font-semibold text-xl md:text-2xl text-[#402924] hover:text-primary transition-colors block truncate pt-2.5"
        >
          {pageInfo.title}
        </Link>
      </div>

      {/* Global search bar - centered in the header */}
      <div className="flex-1 flex justify-center px-4">
        <GlobalSearch />
      </div>

      {/* User profile section or auth buttons */}
      <div className="flex items-center justify-end flex-shrink-0 ml-4">
        {isAuthenticated && user ? (
          // If user is logged in, show profile dropdown
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
          // If user is not logged in, show sign in/up buttons
          <div className="flex gap-2">
            <Link href="/auth/sign-in">
              <Button size="lg" variant="ghost">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
