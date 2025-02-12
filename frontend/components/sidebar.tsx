"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Grid,
  Search,
  BookOpen,
  Bell,
  MessageSquare,
  PlusCircle,
  User,
} from "lucide-react";
import { SignOutButton } from "./SignOutButton";

// Public routes that everyone can see
const publicItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Grid, label: "Clubs", href: "/clubs" },
  { icon: Search, label: "Search", href: "/search" },
];

// Protected routes only for authenticated users
const privateItems = [
  { icon: BookOpen, label: "Shelf", href: "/shelf" },
  { icon: Bell, label: "Activity", href: "/activity" },
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: PlusCircle, label: "Create", href: "/create" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function Sidebar() {
  const { isAuthenticated } = useAuth();

  const sidebarItems = [
    ...publicItems,
    ...(isAuthenticated ? privateItems : []),
  ];

  return (
    <aside className="h-full border-r bg-background flex flex-col">
      <div className="p-4 flex-1">
        <Link href="/" className="flex items-center space-x-2 mb-6">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold">shelfd</span>
        </Link>
        <nav className="space-y-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      {isAuthenticated && (
        <div className="p-4 border-t">
          <SignOutButton />
        </div>
      )}
    </aside>
  );
}
