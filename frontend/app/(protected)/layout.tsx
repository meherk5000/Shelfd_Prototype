"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  // First check - just check if token exists, don't wait for API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      setHasToken(!!token);

      // If token exists, immediately show children to prevent flashing
      if (token) {
        setShowChildren(true);
      }
    }
  }, []);

  // Handle redirects after initial auth check
  useEffect(() => {
    // Don't redirect while loading
    if (loading) {
      return;
    }

    // If loading is done and user is confirmed not authenticated, redirect
    if (!isAuthenticated) {
      console.log(
        "ProtectedLayout: Not authenticated after load, redirecting..."
      );
      const currentPath = window.location.pathname;
      window.location.href = `/auth/sign-in?returnUrl=${encodeURIComponent(
        currentPath
      )}`;
    }
  }, [isAuthenticated, loading]); // Only depend on auth status and loading state

  // If still loading the initial auth status, show loader
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // After loading, if the user IS authenticated, show children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If loading is done and user is NOT authenticated, show redirecting message
  // (The useEffect above handles the actual redirection logic)
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Redirecting to login...</p>
    </div>
  );
}
