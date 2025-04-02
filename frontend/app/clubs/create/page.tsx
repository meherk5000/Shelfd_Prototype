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
import { Loader2, Upload, X, Search, BookOpen } from "lucide-react";
import { useClubs } from "@/lib/hooks/use-clubs";
import { useMediaSearch } from "@/lib/hooks/use-media-search";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const mediaTypes = [
  { value: "book", label: "Book Club" },
  { value: "movie", label: "Movie Club" },
  { value: "tv", label: "TV Show Club" },
];

export default function CreateClubPage() {
  const router = useRouter();
  const { createClub, loading } = useClubs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookCoverInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Book fields
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookCover, setBookCover] = useState<File | null>(null);
  const [bookCoverPreview, setBookCoverPreview] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string>("");
  const [bookCoverUrl, setBookCoverUrl] = useState<string>("");

  // Book search state
  const [isBookSearchOpen, setIsBookSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { searchMedia } = useMediaSearch();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleBookCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBookCover(file);
      const url = URL.createObjectURL(file);
      setBookCoverPreview(url);
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

  const handleRemoveBookCover = () => {
    setBookCover(null);
    if (bookCoverPreview) {
      URL.revokeObjectURL(bookCoverPreview);
      setBookCoverPreview(null);
    }
    if (bookCoverInputRef.current) {
      bookCoverInputRef.current.value = "";
    }
  };

  // Book search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/media/search?q=${encodeURIComponent(searchQuery)}&media_type=book`
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error("Search failed");
        setSearchResults([]);
        return;
      }

      const books = data.books || [];
      setSearchResults(books);
    } catch (err) {
      console.error("Error searching books:", err);
      toast.error("Failed to search for books");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectBook = (book: any) => {
    setSelectedBook(book);
  };

  const handleAddSearchedBook = () => {
    if (!selectedBook) return;

    // Extract author name from the first author in the array
    const authorName =
      selectedBook.authors && selectedBook.authors.length > 0
        ? selectedBook.authors[0]
        : "Unknown Author";

    // Set the book information from the search results
    setBookId(selectedBook.id);
    setBookTitle(selectedBook.title);
    setBookAuthor(authorName);
    setBookCoverUrl(selectedBook.cover_url || "");

    // Close the dialog
    setIsBookSearchOpen(false);
    toast.success("Book selected! Complete the form to create your club.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !mediaType) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Book fields are now optional, even for book clubs
    try {
      const result = await createClub(
        name,
        mediaType,
        description,
        isPrivate,
        coverImage || undefined,
        bookTitle,
        bookAuthor,
        bookCover || undefined,
        bookId || undefined,
        bookCoverUrl || undefined
      );

      if (result.success && result.data?.clubs?.[0]) {
        // Log the club ID for debugging
        const clubId = result.data.clubs[0].id;
        console.log("Club created successfully with ID:", clubId);

        // Show success message
        toast.success("Club created successfully!");

        // Give the server a moment to fully process the club creation
        setTimeout(() => {
          try {
            window.location.href = `/clubs/${clubId}`;
          } catch (navError) {
            console.error("Navigation error:", navError);
            // Fallback to clubs page if there's an issue
            router.push("/clubs");
          }
        }, 1000);
      } else {
        toast.error(
          "Error creating club: " + (result.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error in club creation:", error);
      toast.error("Failed to create club. Please try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create a Club</h1>
          <p className="text-muted-foreground mt-2">
            Create a new club to discuss your favorite books, movies, or TV
            shows with others.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Club Name</Label>
              <Input
                id="name"
                placeholder="Enter club name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="mediaType">Club Type</Label>
              <Select value={mediaType} onValueChange={setMediaType} required>
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

            {mediaType === "book" && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Book Information (Optional)</h3>
                  <p className="text-xs text-muted-foreground">
                    You can add or change this later
                  </p>
                </div>

                <div className="bg-muted/30 p-3 rounded-md text-sm text-muted-foreground mb-2">
                  <p>You can either:</p>
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    <li>Search for a book using our database (recommended)</li>
                    <li>Enter book details manually</li>
                    <li>
                      Skip this step and add a book later from the club page
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <Dialog
                    open={isBookSearchOpen}
                    onOpenChange={setIsBookSearchOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 w-full sm:w-auto"
                      >
                        <Search className="w-4 h-4" />
                        Search for a book
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Search for a Book</DialogTitle>
                        <DialogDescription>
                          Find a book to add to your club. You can always change
                          this later.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Input
                            ref={searchInputRef}
                            placeholder="Search for a book by title or author..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1"
                          />
                          <Button onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4 mr-2" />
                            )}
                            Search
                          </Button>
                        </div>

                        {isSearching && (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {searchResults.map((book) => (
                            <Card
                              key={book.id}
                              className={`cursor-pointer hover:border-primary transition-colors ${
                                selectedBook?.id === book.id
                                  ? "border-primary border-2"
                                  : ""
                              }`}
                              onClick={() => handleSelectBook(book)}
                            >
                              <div className="p-4 flex gap-4">
                                {book.cover_url ? (
                                  <img
                                    src={book.cover_url}
                                    alt={book.title}
                                    className="w-20 h-28 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-20 h-28 bg-muted flex items-center justify-center rounded">
                                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <h3 className="font-semibold">
                                    {book.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {book.authors && book.authors.length > 0
                                      ? book.authors.join(", ")
                                      : "Unknown Author"}
                                  </p>
                                  {book.published_date && (
                                    <p className="text-xs text-muted-foreground">
                                      {book.published_date}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>

                        {searchResults.length === 0 &&
                          !isSearching &&
                          searchQuery && (
                            <div className="text-center py-4 text-muted-foreground">
                              No books found. Try another search term.
                            </div>
                          )}
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsBookSearchOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddSearchedBook}
                          disabled={!selectedBook || isSearching}
                        >
                          Select Book
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {(bookTitle ||
                    bookAuthor ||
                    bookCoverPreview ||
                    bookCoverUrl) && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setBookTitle("");
                        setBookAuthor("");
                        setBookId("");
                        setBookCoverUrl("");
                        handleRemoveBookCover();
                        setSelectedBook(null);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear book selection
                    </Button>
                  )}
                </div>

                {/* Display selected book from search */}
                {bookTitle && (
                  <div className="flex items-start gap-4 p-3 bg-background rounded-md mb-4 border">
                    <div className="shrink-0">
                      {bookCoverPreview || bookCoverUrl ? (
                        <img
                          src={bookCoverPreview || bookCoverUrl}
                          alt={bookTitle}
                          className="w-16 h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-muted flex items-center justify-center rounded">
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{bookTitle}</h3>
                      {bookAuthor && (
                        <p className="text-sm text-muted-foreground">
                          by {bookAuthor}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bookTitle">Book Title</Label>
                  <Input
                    id="bookTitle"
                    placeholder="Enter book title"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookAuthor">Author</Label>
                  <Input
                    id="bookAuthor"
                    placeholder="Enter author name"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Book Cover</Label>
                  <div className="mt-1 flex items-center gap-4">
                    {bookCoverPreview ? (
                      <div className="relative h-32 w-24 overflow-hidden rounded-md border border-border">
                        <Image
                          src={bookCoverPreview}
                          alt="Book cover preview"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveBookCover}
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground hover:bg-background"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : bookCoverUrl ? (
                      <div className="relative h-32 w-24 overflow-hidden rounded-md border border-border">
                        <img
                          src={bookCoverUrl}
                          alt="Book cover"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => bookCoverInputRef.current?.click()}
                        className="flex h-32 w-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/50 hover:bg-muted"
                      >
                        <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                        <p className="text-xs text-center text-muted-foreground">
                          Upload cover
                        </p>
                      </div>
                    )}
                    <input
                      ref={bookCoverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBookCoverChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="isPrivate"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
              <Label htmlFor="isPrivate">Make this club private</Label>
            </div>
          </div>

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
