"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  useClubs,
  ClubData,
  ClubThreadData,
  ClubMilestoneData,
  ClubPostData,
} from "@/lib/hooks/use-clubs";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Calendar,
  BookOpen,
  Search,
  MessageSquare,
  Star,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { Command } from "cmdk";
import { useDebounce } from "@/lib/hooks/use-debounce";

// Define book type
interface Book {
  id: string;
  title: string;
  authors?: string[];
  image_url?: string;
  published_date?: string;
}

// Properly handle Next.js params
// Note: In client components we can directly access params.id without React.use()
// This is the recommended approach for client components in Next.js.
// The warning in the console is expected and can be ignored as this component
// is marked with "use client" directive at the top of the file.
type PageParams = {
  id: string;
};

export default function ClubDetailPage({ params }: { params: PageParams }) {
  // Use React.use() to unwrap the params promise
  const paramsData = React.use(params) as PageParams;
  const clubId = paramsData.id;

  const [isLoading, setIsLoading] = useState(true);
  const [club, setClub] = useState<ClubData | null>(null);
  const [posts, setPosts] = useState<ClubPostData[]>([]);
  const [threads, setThreads] = useState<ClubThreadData[]>([]);
  const [milestones, setMilestones] = useState<ClubMilestoneData[]>([]);
  const [activeTab, setActiveTab] = useState("discussion");
  const [isBookSearchOpen, setIsBookSearchOpen] = useState(false);

  // Book search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const {
    getClubs,
    createPost,
    getClubPosts,
    createThread,
    getClubThreads,
    createMilestone,
    getClubMilestones,
    updateClubBook,
    joinClub,
    leaveClub,
  } = useClubs();

  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (clubId) {
      loadClub();
      loadMembers(clubId);
    }
  }, [clubId]);

  // Update search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    handleSearch();
  }, [debouncedQuery]);

  const loadClub = async () => {
    setIsLoading(true);
    try {
      const result = await getClubs(0, 1, undefined, undefined, clubId);
      if (
        result.success &&
        result.data?.clubs &&
        result.data.clubs.length > 0
      ) {
        const clubData = result.data.clubs[0];
        setClub(clubData);

        // Load each resource separately and handle errors individually
        // Each function now handles its own errors
        await loadPosts(clubData.id);
        await loadThreads(clubData.id);
        await loadMilestones(clubData.id);
      } else {
        console.error("Club not found or access denied");
        toast.error("Club not found or you don't have access");
        setClub(null);
        setPosts([]);
        setThreads([]);
        setMilestones([]);
      }
    } catch (error) {
      console.error("Error loading club:", error);
      toast.error("Failed to load club details");
      setClub(null);
      setPosts([]);
      setThreads([]);
      setMilestones([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async (clubId: string) => {
    try {
      const result = await getClubPosts(clubId);
      if (result.success && result.data?.posts) {
        setPosts(result.data.posts || []);
      } else {
        console.warn("No posts found or error getting posts");
        setPosts([]);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      setPosts([]);
      // Don't propagate the error - handle it here
    }
  };

  const loadThreads = async (clubId: string) => {
    try {
      const result = await getClubThreads(clubId);
      if (result.success && result.data?.threads) {
        setThreads(result.data.threads || []);
      } else {
        console.warn("No threads found or error getting threads");
        setThreads([]);
      }
    } catch (error) {
      console.error("Error loading threads:", error);
      // Set threads to empty array on error and display toast
      setThreads([]);
      // Don't propagate the error - handle it here
    }
  };

  const loadMilestones = async (clubId: string) => {
    try {
      const result = await getClubMilestones(clubId);
      if (result.success && result.data?.milestones) {
        setMilestones(result.data.milestones || []);
      } else {
        console.warn("No milestones found or error getting milestones");
        setMilestones([]);
      }
    } catch (error) {
      console.error("Error loading milestones:", error);
      // Set milestones to empty array on error and display toast
      setMilestones([]);
      // Don't propagate the error - handle it here
    }
  };

  const loadMembers = async (clubId: string) => {
    setIsLoadingMembers(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/clubs/${clubId}/members`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail?.error ||
            data.detail?.message ||
            "Failed to fetch members"
        );
      }

      if (Array.isArray(data)) {
        setMembers(data);
      } else {
        console.error("Invalid members data format:", data);
        throw new Error("Invalid members data format");
      }
    } catch (error) {
      console.error("Error loading members:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load club members"
      );
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Book search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/media/search/quick?query=${encodeURIComponent(
          searchQuery
        )}`
      );

      if (!response.ok) {
        console.warn(
          `API endpoint returned ${response.status}: ${API_BASE_URL}/media/search/quick`
        );
        toast.error("Book search API is not available");
        setSearchResults([]);
        return;
      }

      const data = await response.json();
      const books = data.books || [];
      setSearchResults(books);
    } catch (err) {
      console.error("Error searching books:", err);
      toast.error("Failed to search for books");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
  };

  const handleAddBook = async () => {
    if (!selectedBook || !club) return;

    try {
      const result = await updateClubBook(club.id, {
        book_id: selectedBook.id,
        book_title: selectedBook.title,
        book_author: selectedBook.authors?.[0] || "Unknown Author",
        book_cover: selectedBook.image_url,
      });

      if (result.success) {
        // Close the dialog first
        setIsBookSearchOpen(false);
        setSelectedBook(null);
        setSearchQuery("");
        setSearchResults([]);

        // Show success message
        toast.success(
          `"${selectedBook.title}" was added to your club!\nDiscussion threads for each chapter have been created.`
        );

        // Refresh club data to show the new book
        await loadClub();
      } else {
        toast.error(result.message || "Failed to add book to club");
      }
    } catch (error) {
      console.error("Error adding book to club:", error);
      toast.error("Failed to add book to club");
    }
  };

  const handleJoinClub = async () => {
    if (!club) return;

    try {
      console.log("Attempting to join club:", {
        clubId: club.id,
        clubName: club.name,
        isPrivate: club.is_private,
        isMember: club.is_member,
      });

      const success = await joinClub(club.id);
      if (success) {
        // Refresh club data to update member status
        await loadClub();
        toast.success("Successfully joined the club!");
      } else {
        console.error("Failed to join club - joinClub returned false");
        toast.error("Failed to join club");
      }
    } catch (error) {
      console.error("Error in handleJoinClub:", error);
      toast.error("Failed to join club");
    }
  };

  const handleLeaveClub = async () => {
    if (!club) return;

    try {
      const success = await leaveClub(club.id);
      if (success) {
        // Refresh club data to update member status
        await loadClub();
        toast.success("Successfully left the club");
      }
    } catch (error) {
      console.error("Error leaving club:", error);
      toast.error("Failed to leave club");
    }
  };

  const handleRemoveBook = async () => {
    if (!club) return;

    try {
      const result = await updateClubBook(club.id, {
        book_id: "",
        book_title: "",
        book_author: "",
        book_cover: "",
      });

      if (result.success) {
        await loadClub();
        toast.success("Book removed successfully");
      } else {
        toast.error(result.message || "Failed to remove book");
      }
    } catch (error) {
      console.error("Error removing book:", error);
      toast.error("Failed to remove book");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold">Club not found</h2>
        <p className="text-muted-foreground">
          The club you're looking for doesn't exist or you don't have access.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/clubs">Back to Clubs</Link>
        </Button>
      </div>
    );
  }

  // Render book information if the club has a book
  const renderBookInfo = () => {
    if (club?.book_title) {
      return (
        <div className="mb-6 flex items-start gap-4 bg-card rounded-lg p-4 border">
          <div className="shrink-0">
            {club.book_cover ? (
              <img
                src={club.book_cover}
                alt={club.book_title}
                className="w-24 h-32 object-cover rounded-md"
              />
            ) : (
              <div className="w-24 h-32 bg-muted flex items-center justify-center rounded-md">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Currently Reading</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                {club.book_id ? (
                  <Link
                    href={`/media/books/${club.book_id}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {club.book_title}
                  </Link>
                ) : (
                  <span className="text-lg font-semibold">
                    {club.book_title}
                  </span>
                )}
                {club.is_creator && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBookSearchOpen(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Update Book
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveBook}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Book
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                by {club.book_author}
              </p>
            </div>
            <p className="mt-2 text-sm">
              Join the discussion in the threads below.
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Check if the club has no book and user is creator
  const showPickBookButton =
    club?.media_type === "book" && club?.is_creator && !club?.book_title;

  // Main content (without Layout wrapper)
  return (
    <div className="px-4 py-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{club.name}</h1>
        <div className="flex gap-2">
          {!club.is_member ? (
            <Button
              variant="default"
              onClick={handleJoinClub}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Club"
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleLeaveClub}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Leaving...
                </>
              ) : (
                "Leave Club"
              )}
            </Button>
          )}
        </div>
      </div>

      {club.description && (
        <p className="text-muted-foreground">{club.description}</p>
      )}

      {/* Club Info Section */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={club.creator_avatar}
              alt={club.creator_username}
            />
            <AvatarFallback>{club.creator_username[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">Created by</p>
            <p className="font-medium">
              {club.creator_username}
              {club.is_creator && " (You)"}
            </p>
          </div>
        </div>
        <span>•</span>
        <div className="flex items-center gap-2">
          <span>{club.member_count} members</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-2">
          <span>{club.is_private ? "Private" : "Public"} club</span>
        </div>
      </div>

      {renderBookInfo()}

      {/* Pick Club Book Button */}
      {showPickBookButton && (
        <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/25">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No book selected yet</h3>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            As the club creator, you can select a book to read. This will
            automatically create discussion threads for each chapter.
          </p>
          <Dialog open={isBookSearchOpen} onOpenChange={setIsBookSearchOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Pick Club Book
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Pick a Book for Your Club</DialogTitle>
                <DialogDescription>
                  Search for a book to add to your club. This will generate
                  discussion threads for each chapter.
                </DialogDescription>
              </DialogHeader>

              <Command className="rounded-lg border shadow-md">
                <div
                  className="flex items-center border-b px-3"
                  cmdk-input-wrapper=""
                >
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a book by title or author..."
                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((book) => (
                        <div
                          key={book.id}
                          onClick={() => handleSelectBook(book)}
                          className={`flex items-center gap-4 p-2 rounded-md hover:bg-accent cursor-pointer ${
                            selectedBook?.id === book.id ? "bg-accent" : ""
                          }`}
                        >
                          {book.image_url ? (
                            <img
                              src={book.image_url}
                              alt={book.title}
                              className="h-24 w-16 object-cover rounded"
                            />
                          ) : (
                            <div className="h-24 w-16 bg-muted flex items-center justify-center rounded">
                              <BookOpen className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {book.title}
                            </div>
                            {book.authors && book.authors.length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                by {book.authors.join(", ")}
                              </div>
                            )}
                            {book.published_date && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Published {book.published_date.split("-")[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No books found.
                    </div>
                  ) : null}
                </div>
              </Command>

              <DialogFooter>
                <Button
                  onClick={handleAddBook}
                  disabled={!selectedBook}
                  className="gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Add Book to Club
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Tabs for Discussion and Schedule */}
      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="discussion" className="flex gap-2 items-center">
            <MessageSquare className="w-4 h-4" />
            Discussion
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex gap-2 items-center">
            <Calendar className="w-4 h-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="members" className="flex gap-2 items-center">
            <Users className="w-4 h-4" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discussion" className="space-y-4">
          {threads.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="text-lg font-medium mb-2">
                No discussion threads yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start the first conversation about this book club!
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Create Thread</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Thread</DialogTitle>
                    <DialogDescription>
                      Start a new discussion thread for this club.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Add thread creation form here later */}
                  <DialogFooter>
                    <Button>Create Thread</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Discussion Threads</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      New Thread
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Thread</DialogTitle>
                      <DialogDescription>
                        Start a new discussion thread for this club.
                      </DialogDescription>
                    </DialogHeader>
                    {/* Add thread creation form here later */}
                    <DialogFooter>
                      <Button>Create Thread</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {/* List of threads */}
              {threads.map((thread) => (
                <Card
                  key={thread.id}
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-semibold text-md">{thread.title}</h4>
                      <div className="flex items-center mt-2 space-x-3">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Avatar className="h-6 w-6 mr-1">
                            <AvatarFallback>
                              {thread.creator_username
                                ?.substring(0, 2)
                                .toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          {thread.creator_username || "Anonymous"}
                        </div>
                        {thread.created_at && (
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(thread.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        )}
                        {/* Can add reply count here later */}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          {milestones.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="text-lg font-medium mb-2">No milestones set</h3>
              <p className="text-muted-foreground mb-4">
                Create reading milestones to track your club's progress
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Create Milestone</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Milestone</DialogTitle>
                    <DialogDescription>
                      Add a new milestone to your reading schedule.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Add milestone creation form here later */}
                  <DialogFooter>
                    <Button>Create Milestone</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Reading Schedule</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Milestone</DialogTitle>
                      <DialogDescription>
                        Add a new milestone to your reading schedule.
                      </DialogDescription>
                    </DialogHeader>
                    {/* Add milestone creation form here later */}
                    <DialogFooter>
                      <Button>Create Milestone</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {/* List of milestones */}
              {milestones.map((milestone) => (
                <Card
                  key={milestone.id}
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-semibold text-md">
                        {milestone.title}
                      </h4>
                      {milestone.description && (
                        <p className="text-muted-foreground text-sm mt-1">
                          {milestone.description}
                        </p>
                      )}
                      <div className="flex items-center mt-2 space-x-3">
                        {milestone.milestone_date && (
                          <div className="flex items-center text-xs">
                            <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span>
                              {new Date(
                                milestone.milestone_date
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {milestone.created_at && (
                          <div className="text-xs text-muted-foreground">
                            Created{" "}
                            {formatDistanceToNow(
                              new Date(milestone.created_at),
                              {
                                addSuffix: true,
                              }
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Club Members</h3>
            <div className="text-sm text-muted-foreground">
              {members.length} members
            </div>
          </div>

          {isLoadingMembers ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="text-lg font-medium mb-2">No members yet</h3>
              <p className="text-muted-foreground">
                Be the first to join this club!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {members.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {member.username?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.username}</div>
                      {member.is_creator && (
                        <div className="text-xs text-muted-foreground">
                          Club Creator
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
