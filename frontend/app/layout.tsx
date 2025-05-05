import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { RadixProvider } from "@/lib/providers/radix-provider";
import { cn } from "@/lib/utils";

// Set up the Inter font from Google Fonts
// This loads the font and creates a CSS variable that we can use throughout the app
// The 'variable' property creates a CSS variable named '--font-sans' that we can reference
const inter = Inter({
  subsets: ["latin"], // Only load Latin character set for better performance
  variable: "--font-sans",
});

// Define metadata for SEO and browser tabs
// This is a Next.js App Router feature that replaces the old Head component
export const metadata: Metadata = {
  title: "Shelfd",
  description: "Track your media consumption",
};

// Root layout component that wraps every page in the application
// This component is responsible for:
// 1. Setting up the HTML/body structure
// 2. Applying global fonts
// 3. Setting up all the providers that need to be available app-wide
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Shelfd</title>
        <meta
          name="description"
          content="Shelfd - A social platform for book lovers"
        />
      </head>
      <body
        // Apply the Inter font using the CSS variable and some base styles
        // 'cn' is our utility for merging class names
        className={cn("min-h-screen font-sans antialiased", inter.variable)}
        suppressHydrationWarning
      >
        {/* Provider hierarchy - each wraps the ones below it */}
        <RadixProvider>
          {/* Auth provider handles user authentication state */}
          <AuthProvider>
            {/* Theme provider enables light/dark mode and system preference */}
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              {children}
              {/* Global toast notifications */}
              <Toaster richColors />
            </ThemeProvider>
          </AuthProvider>
        </RadixProvider>
      </body>
    </html>
  );
}
