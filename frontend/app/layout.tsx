import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/context/AuthContext";
import { AuthDebug } from "@/components/auth-debug";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Shelfd",
  description: "Track your media consumption",
};

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
        className={cn("min-h-screen font-sans antialiased", inter.variable)}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            {children}
            <Toaster />
            {process.env.NODE_ENV === "development" && <AuthDebug />}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
