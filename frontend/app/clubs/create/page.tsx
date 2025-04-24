"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Upload,
  X,
  Search,
  BookOpen,
  Clapperboard,
  Tv,
} from "lucide-react";
import { useClubs } from "@/lib/hooks/use-clubs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MediaType } from "@/lib/types";
import React from "react";
import { cn } from "@/lib/utils";

const mediaTypes = [
  {
    value: "books" as MediaType,
    label: "Book Club",
    noun: "Book",
    nounPlural: "Books",
  },
  {
    value: "movies" as MediaType,
    label: "Movie Club",
    noun: "Movie",
    nounPlural: "Movies",
  },
  {
    value: "tv-shows" as MediaType,
    label: "TV Show Club",
    noun: "TV Show",
    nounPlural: "TV Shows",
  },
];

export default function CreateClubPage() {
  const router = useRouter();
  const { createClub, loading } = useClubs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Basic Club Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("books");
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Cover image handlers (remain the same)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(URL.createObjectURL(file));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setCoverImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!name) {
      toast.error("Please enter a club name", {
        description: "A name is required to create a club",
      });
      setIsLoading(false);
      return;
    }
    if (!mediaType) {
      toast.error("Please select a media type", {
        description: "A media type is required to create a club",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Map frontend media type to backend format
      const mediaTypeMap: Record<string, string> = {
        books: "book",
        movies: "movie",
        "tv-shows": "tv",
      };
      const backendMediaType = mediaTypeMap[mediaType];

      if (!backendMediaType) {
        toast.error("Invalid media type selected");
        return;
      }

      const { success, data, clubId } = await createClub(
        name,
        backendMediaType,
        description,
        isPrivate,
        coverImage
          ? new File([coverImage], "cover.jpg", { type: "image/jpeg" })
          : undefined
      );

      if (success && clubId) {
        router.push(`/clubs/${clubId}`);
      }
    } catch (error) {
      console.error("Error creating club:", error);
      toast.error("Failed to create club");
    } finally {
      setIsLoading(false);
    }
  };

  // Get details for the currently selected media type
  const currentMediaTypeDetails = (mediaType: MediaType) => {
    switch (mediaType) {
      case "books":
        return {
          label: "Book",
          labelPlural: "Books",
          icon: <BookOpen className="w-4 h-4" />,
          placeholder: "Search for a book by title or author...",
        };
      case "movies":
        return {
          label: "Movie",
          labelPlural: "Movies",
          icon: <Clapperboard className="w-4 h-4" />,
          placeholder: "Search for a movie by title...",
        };
      case "tv-shows":
        return {
          label: "TV Show",
          labelPlural: "TV Shows",
          icon: <Tv className="w-4 h-4" />,
          placeholder: "Search for a TV show by title...",
        };
      default:
        return {
          label: "Media",
          labelPlural: "Media",
          icon: <Search className="w-4 h-4" />,
          placeholder: "Search for media...",
        };
    }
  };

  const getPlaceholder = (mediaType: MediaType) => {
    switch (mediaType) {
      case "books":
        return "Search for a book by title or author...";
      case "movies":
        return "Search for a movie by title...";
      case "tv-shows":
        return "Search for a TV show by title...";
      default:
        return "Search for media...";
    }
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "books":
        return <BookOpen className="w-4 h-4" />;
      case "movies":
        return <Clapperboard className="w-4 h-4" />;
      case "tv-shows":
        return <Tv className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Create a Club</h1>
          <p className="text-muted-foreground mt-2">
            Create a new club to discuss your favorite media with others.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Club Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter club name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            {/* Description Textarea */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what your club is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={4}
              />
            </div>
            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="mt-1 flex items-center gap-4">
                {previewUrl ? (
                  <div className="relative aspect-video h-40 w-full overflow-hidden rounded-md border border-border">
                    <Image
                      src={previewUrl}
                      alt="Cover preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-video h-40 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/50 hover:bg-muted"
                  >
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload cover image
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>
            {/* Media Type Select */}
            <div className="space-y-2">
              <Label htmlFor="mediaType">
                Club Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={mediaType}
                onValueChange={(value) => {
                  setMediaType(value as MediaType);
                }}
                required
              >
                <SelectTrigger id="mediaType">
                  <SelectValue placeholder="Select club type" />
                </SelectTrigger>
                <SelectContent>
                  {mediaTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Privacy Switch */}
          <div className="flex items-center space-x-2 pt-4 border-t">
            <Switch
              id="isPrivate"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
            <Label htmlFor="isPrivate">Make this club private</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/clubs")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Club"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
