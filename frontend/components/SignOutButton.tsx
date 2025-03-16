"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const { logout } = useAuth();

  return (
    <Button
      onClick={logout}
      variant="outline"
      className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
    >
      <LogOut className="h-4 w-4" />
      <span>Sign Out</span>
    </Button>
  );
}
