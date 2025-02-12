"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { logout } = useAuth();

  return (
    <Button
      onClick={logout}
      variant="ghost"
      className="text-red-500 hover:text-red-700 hover:bg-red-100"
    >
      Sign Out
    </Button>
  );
}
