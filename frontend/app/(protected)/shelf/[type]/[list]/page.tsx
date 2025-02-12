// This is a Server Component (remove "use client")
import { Layout } from "@/components/layout";
import { ShelfListClient } from "./shelf-list-client";
import React from "react";

// Define valid media types
type MediaType = "books" | "movies" | "tv-shows" | "articles";

// Define the Book type
interface Book {
  id: string;
  title: string;
  image?: string;
  creator?: string;
  dateAdded?: string;
  rating?: number;
  progress?: number;
}

interface PageProps {
  params: Promise<{
    type: string;
    list: string;
  }>;
}

const validateType = (
  type: string
): "books" | "movies" | "tv-shows" | "articles" => {
  const validTypes = ["books", "movies", "tv-shows", "articles"] as const;
  const normalizedType = type.toLowerCase();
  return (
    validTypes.includes(normalizedType as any) ? normalizedType : "books"
  ) as any;
};

export default async function ShelfListPage({ params }: PageProps) {
  // Await the params
  const resolvedParams = await params;
  const type = validateType(resolvedParams.type);
  const shelfName = resolvedParams.list.replace(/-/g, " ");

  return (
    <Layout>
      <ShelfListClient type={type} shelfName={shelfName} />
    </Layout>
  );
}
