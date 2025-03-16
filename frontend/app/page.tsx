"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Layout } from "@/components/layout";
import Link from "next/link";
import { Feed } from "@/components/feed";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="w-full overflow-x-hidden h-full pt-4">
        {isAuthenticated ? (
          <Feed />
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-bold mb-4">Welcome to Shelfd</h1>
            <p className="text-lg text-center mb-6">
              Track and share your media journey with friends and the community.
            </p>
            <div className="flex gap-4">
              <Link
                href="/auth/signin"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
