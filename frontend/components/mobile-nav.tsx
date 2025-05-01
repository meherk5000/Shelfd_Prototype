"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Home,
  Grid,
  Search,
  BookOpen,
  Bell,
  MessageSquare,
  PlusCircle,
  User,
  Menu,
  Archive,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SignOutButton } from "./SignOutButton";

const publicItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Grid, label: "Clubs", href: "/clubs" },
  { icon: Search, label: "Explore", href: "/explore" },
];

const privateItems = [
  { icon: Archive, label: "Shelf", href: "/shelf" },
  { icon: Bell, label: "Activity", href: "/activity" },
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function MobileNav() {
  const { isAuthenticated, user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const sidebarItems = [
    ...publicItems,
    ...(isAuthenticated ? privateItems : []),
  ];

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-4">
        <Link
          href="/"
          className="flex items-center mb-6"
          onClick={() => setIsOpen(false)}
        >
          <img
            src="/logo.png"
            alt="Shelfd"
            className="h-16 w-auto object-contain"
            width={100}
            height={60}
            onError={(e) => {
              e.currentTarget.outerHTML =
                '<span class="text-xl font-bold text-[#402924]">Shelfd</span>';
            }}
          />
        </Link>

        <nav className="flex flex-col space-y-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "text-[#402924] font-semibold bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon
                    className={cn("h-5 w-5", isActive && "text-[#402924]")}
                  />
                  <span>{item.label}</span>
                </Link>
              </SheetClose>
            );
          })}
        </nav>
        {isAuthenticated && user && (
          <div className="mt-auto pt-4 border-t">
            <div className="mb-2 px-3 py-2 flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <SheetClose asChild>
              <SignOutButton />
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
