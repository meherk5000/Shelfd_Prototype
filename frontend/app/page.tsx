"use client";

import { Layout } from "@/components/layout";
import { Feed } from "@/components/feed";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Layout>
      <div className="container py-6">
        {isAuthenticated && (
          <h1 className="text-3xl font-bold mb-6">
            Welcome back, {user?.username || "friend"}!
          </h1>
        )}
        <Feed />
      </div>
    </Layout>
  );
}
