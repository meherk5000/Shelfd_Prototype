"use client";

import type React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block w-48 fixed inset-y-0 border-r">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 md:pl-48 flex flex-col overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background">
          <Header />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
