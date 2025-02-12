"use client";

import type React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden md:block w-72 fixed inset-y-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 md:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background">
          <Header />
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
