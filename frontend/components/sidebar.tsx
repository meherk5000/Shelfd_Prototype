"use client";

import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { usePathname } from "next/navigation";
import {
  Home,
  Grid,
  Search,
  BookOpen,
  Bell,
  MessageSquare,
  PlusCircle,
  User,
  LogOut,
  Archive,
  Pencil,
  Users,
  ListPlus,
  FileText,
} from "lucide-react";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Public routes that everyone can see
const publicItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Grid, label: "Clubs", href: "/clubs" },
  { icon: Search, label: "Explore", href: "/explore" },
];

// Protected routes only for authenticated users
const privateItems = [
  { icon: Archive, label: "Shelf", href: "/shelf" },
  { icon: Bell, label: "Activity", href: "/activity" },
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: PlusCircle, label: "Create", href: "/create" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function Sidebar() {
  const { isAuthenticated, user } = useAuth();
  const pathname = usePathname();
  const [logoError, setLogoError] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  // Get the base URL for absolute image path
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = window.location.origin;
      setBaseUrl(url);
    }
  }, []);

  const sidebarItems = [
    ...publicItems,
    ...(isAuthenticated ? privateItems : []),
  ];

  return (
    <aside className="h-full border-r bg-background flex flex-col">
      <div className="pt-2 px-4 flex-1">
        <Link href="/" className="flex items-center mb-8">
          <div className="h-24 w-full flex justify-center">
            {logoError ? (
              <div className="flex items-center justify-center border border-dashed border-gray-300 rounded-md h-24 w-32">
                <span className="text-2xl font-bold text-[#402924]">
                  Shelfd
                </span>
              </div>
            ) : (
              <img
                src="/logo.png"
                alt="Shelfd"
                className="h-24 w-auto object-contain"
                style={{ maxWidth: "100%", height: "auto" }}
                width={160}
                height={96}
                onError={(e) => {
                  console.error("Logo failed to load, showing fallback text");
                  console.error("Logo URL attempted:", "/logo.png");
                  setLogoError(true);
                }}
              />
            )}
          </div>
        </Link>
        <nav className="space-y-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;

            // Special handling for "Create" item
            if (item.label === "Create") {
              return (
                <Dialog key={item.label}>
                  <DialogTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                        "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <button className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors w-full text-left">
                        <Pencil className="w-5 h-5 text-muted-foreground" />
                        <span>Create Review</span>
                      </button>
                      <button className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors w-full text-left">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span>Create Club</span>
                      </button>
                      <button className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors w-full text-left">
                        <ListPlus className="w-5 h-5 text-muted-foreground" />
                        <span>Create Shelf List</span>
                      </button>
                      <button className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors w-full text-left">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span>Create Post</span>
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            }

            // Render other items as Links
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-[#402924] font-bold bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon
                  className={cn("w-5 h-5", isActive && "text-[#402924]")}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      {isAuthenticated && user && (
        <div className="p-4 border-t">
          <div className="mb-2 px-3 py-2 flex items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      )}
    </aside>
  );
}
