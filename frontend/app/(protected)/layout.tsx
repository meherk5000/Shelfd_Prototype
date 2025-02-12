"use client";

import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect("/auth/sign-in");
  }

  return <>{children}</>;
}
