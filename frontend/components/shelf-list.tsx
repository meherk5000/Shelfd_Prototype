"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useShelf } from "@/lib/hooks/use-shelf";

interface ShelfListProps {
  bookId: string;
  bookTitle: string;
  bookCover: string;
  bookAuthor: string;
}

export function ShelfList({
  bookId,
  bookTitle,
  bookCover,
  bookAuthor,
}: ShelfListProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { shelves, loading, mutate } = useShelf();
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Use useCallback for memoization
  const checkBookInShelves = useCallback(() => {
    if (!isAuthenticated) return;

    const transformedItems = shelves.flatMap((shelf) =>
      shelf.items.map((item) => ({
        id: item.id,
        shelfId: shelf._id,
      }))
    );
    const existingShelf = transformedItems.find((item) => item.id === bookId);
    if (existingShelf) {
      setSelectedShelf(existingShelf.shelfId);
    }
  }, [bookId, shelves, isAuthenticated]);

  useEffect(() => {
    let mounted = true;

    if (mounted) {
      checkBookInShelves();
    }

    return () => {
      mounted = false;
    };
  }, [checkBookInShelves]);

  // Filter shelves to only show "Want to Read" and "Currently Reading"
  const filteredShelves = shelves.filter(
    (shelf) =>
      shelf.name === "Want to Read" || shelf.name === "Currently Reading"
  );

  const handleAddToShelf = async (shelfId: string) => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in to add books to your shelf",
      });
      return;
    }

    try {
      setIsAdding(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/shelf/${shelfId}/items`,
        {
          id: bookId,
          title: bookTitle,
          cover_image: bookCover,
          creator: bookAuthor,
        }
      );

      if (response.status === 200) {
        setSelectedShelf(shelfId);
        toast({
          title: "Success!",
          description: "Book added to shelf",
        });
        // Refresh shelves data
        mutate();
      }
    } catch (error: any) {
      console.error("Error adding book to shelf:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.detail || "Failed to add book to shelf",
      });
    } finally {
      setIsAdding(false);
    }
  };
}
