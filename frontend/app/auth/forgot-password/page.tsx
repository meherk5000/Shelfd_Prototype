"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`,
        { email }
      );

      // Always show success, even if email doesn't exist (security best practice)
      setSubmitted(true);
      toast({
        title: "Email sent",
        description:
          "If your email is registered, you will receive password reset instructions shortly.",
      });
    } catch (error) {
      // Still show success message even on error
      setSubmitted(true);
      toast({
        title: "Email sent",
        description:
          "If your email is registered, you will receive password reset instructions shortly.",
      });
      console.error("Error sending reset email:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If your email is registered, we've sent you instructions to reset
              your password.
            </p>
          </div>
          <div className="text-center mt-6">
            <Link href="/auth/sign-in" className="text-primary hover:underline">
              Return to sign in
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
          <h2 className="text-3xl font-bold">Reset your password</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email address and we'll send you instructions to reset
            your password.
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
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send reset instructions"}
          </Button>
        </form>
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
