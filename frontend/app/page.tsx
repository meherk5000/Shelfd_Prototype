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
      <div className="w-full px-4 md:px-6 max-w-full overflow-x-hidden">
        <div className="max-w-[1200px] mx-auto">
          <Feed />
        </div>
      </div>
    </Layout>
  );
}
