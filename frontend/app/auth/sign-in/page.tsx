"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  const [hasRedirected, setHasRedirected] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const searchParams = useSearchParams();

  // Get and store the returnUrl when component mounts
  useEffect(() => {
    const returnUrl = searchParams.get("returnUrl");
    if (returnUrl) {
      setReturnTo(decodeURIComponent(returnUrl));
      console.log(
        "Sign-in page will redirect to:",
        decodeURIComponent(returnUrl)
      );
    }
  }, [searchParams]);

  // Immediate check for token on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && !hasRedirected) {
        console.log("Token found, redirecting to:", returnTo);
        setHasRedirected(true);
        window.location.href = returnTo;
      }
    }
  }, [returnTo, hasRedirected]);

  // Handle already authenticated users - but only redirect once
  useEffect(() => {
    if (isAuthenticated && user && !hasRedirected) {
      console.log("User already authenticated, redirecting to:", returnTo);
      setHasRedirected(true);
      window.location.href = returnTo;
    }
  }, [isAuthenticated, returnTo, user, hasRedirected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't submit if already loading or redirecting
    if (isLoading || hasRedirected) return;

    setError("");
    setIsLoading(true);

    try {
      console.log(`Attempting login for ${email} with redirect to ${returnTo}`);

      // Make sure we use the returnTo value
      if (returnTo !== "/" && window.location.search === "") {
        // If we don't have returnUrl in URL, add it so login can use it
        const newUrl = `${
          window.location.pathname
        }?returnUrl=${encodeURIComponent(returnTo)}`;
        window.history.replaceState({}, "", newUrl);
      }

      const success = await login(email, password);

      if (!success) {
        console.log("Login was not successful");
        setIsLoading(false);
      } else {
        console.log("Login successful, will be redirected by login function");
        setHasRedirected(true);
        // Login function will handle the redirect
      }
    } catch (err: any) {
      console.error("Error during sign-in form submission:", err);
      setError(err.message || "Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  // If already being redirected, show a simple loading screen
  if (hasRedirected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Redirecting to {returnTo}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/auth/sign-up"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <div className="text-right mt-1">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
        {returnTo && returnTo !== "/" && (
          <p className="text-xs text-center text-muted-foreground mt-4">
            You'll be redirected to: {returnTo}
          </p>
        )}
      </div>
    </div>
  );
}
