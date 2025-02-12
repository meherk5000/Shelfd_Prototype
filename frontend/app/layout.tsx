import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import type React from "react";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/contexts/AuthContext";
import LandingPage from "./landing/page";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shelfd",
  description: "Track and share your media journey",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

export function Home() {
  return <LandingPage />;
}
