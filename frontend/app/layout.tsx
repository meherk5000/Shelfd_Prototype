import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { UserProvider } from "@auth0/nextjs-auth0/client";

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
        <UserProvider>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              {children}
              <Toaster richColors />
            </ThemeProvider>
          </AuthProvider>
        </UserProvider>
      </body>
    </html>
  );
}
