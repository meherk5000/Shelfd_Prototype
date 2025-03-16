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

  // Second check - handle redirects and authentication validation
  useEffect(() => {
    // Skip if still loading
    if (loading) return;

    // Skip redirect if we have a token - this prevents a redirect loop
    // We trust the token initially, the AuthContext will validate it with API
    if (hasToken) {
      setShowChildren(true);
      return;
    }

    // If authentication check is complete, and user is not authenticated
    // and we don't have a token, redirect to login
    if (!loading && !isAuthenticated && !hasToken) {
      console.log("Protected route: Not authenticated, redirecting to login");

      // Current path for the returnUrl
      const currentPath = window.location.pathname;

      // Use direct window.location for a hard navigation
      // This fixes client-side routing issues
      window.location.href = `/auth/sign-in?returnUrl=${encodeURIComponent(
        currentPath
      )}`;
    }
  }, [isAuthenticated, loading, hasToken]);

  // If we have a token, show the children even if still loading the user
  // This prevents flashing and redirects while validation happens
  if (hasToken || isAuthenticated) {
    return <>{children}</>;
  }

  // Show loading during auth check
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading during redirect (should just be a brief moment)
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Redirecting to login...</p>
    </div>
  );
}
