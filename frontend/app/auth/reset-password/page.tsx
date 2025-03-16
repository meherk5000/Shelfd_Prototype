"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Get token from URL query parameters
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Missing password reset token");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`,
        {
          token,
          new_password: password,
        }
      );

      setSuccess(true);
      toast({
        title: "Password reset successful",
        description:
          "Your password has been reset. You can now sign in with your new password.",
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/auth/sign-in");
      }, 3000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      setError(
        error.response?.data?.detail ||
          "Failed to reset password. The token may be invalid or expired."
      );

      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.detail || "Failed to reset password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Password Reset Successful!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been successfully changed. You will be
              redirected to the login page shortly.
            </p>
          </div>
          <div className="text-center mt-6">
            <Link href="/auth/sign-in" className="text-primary hover:underline">
              Go to sign in page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Reset Your Password</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>
        {!token ? (
          <div className="text-center p-4 text-red-500">
            <p>
              Invalid or missing reset token. Please request a new password
              reset link.
            </p>
            <div className="mt-4">
              <Link
                href="/auth/forgot-password"
                className="text-primary hover:underline"
              >
                Request new reset link
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs mt-1 text-muted-foreground">
                  Password must be at least 8 characters and include uppercase,
                  lowercase, numbers, and special characters.
                </p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-500 text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}
        <div className="text-center mt-4">
          <Link
            href="/auth/sign-in"
            className="text-sm text-primary hover:underline"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
