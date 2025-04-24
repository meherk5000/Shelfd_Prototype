"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  useClubs,
  ClubData,
  ClubThreadData,
  ClubMilestoneData,
  ClubPostData,
  normalizeImageUrl,
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
  Clapperboard,
  Tv,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { Command } from "cmdk";
import { useDebounce } from "@/lib/hooks/use-debounce";

// Generic Media Interface (can be expanded later if needed)
interface MediaItem {
  id: string;
  title: string;
  image_url?: string;
  authors?: string[];
  published_date?: string;
  release_date?: string;
  overview?: string;
  media_type?: "book" | "movie" | "tv_show";
  // Specific fields from backend responses
  director?: string; // For movies
  creator?: string; // For TV shows
}

interface ClubDetailProps {
  clubId: string;
}

export function ClubDetail({ clubId }: ClubDetailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [club, setClub] = useState<ClubData | null>(null);
  const [posts, setPosts] = useState<ClubPostData[]>([]);
  const [threads, setThreads] = useState<ClubThreadData[]>([]);
  const [milestones, setMilestones] = useState<ClubMilestoneData[]>([]);
  const [activeTab, setActiveTab] = useState("discussion");
  // Renamed state for generic media search
  const [isMediaSearchOpen, setIsMediaSearchOpen] = useState(false);

  // Media search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]); // Use generic type
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null); // Use generic type
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
    updateClubMovie,
    updateClubTVShow,
  } = useClubs();

  useEffect(() => {
    if (clubId) {
      loadClub();
    }
  }, [clubId]);

  // Update search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2 || !club) return; // Ensure club data is available
    handleSearch();
  }, [debouncedQuery, club]); // Add club as dependency

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
      setThreads([]);
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
      setMilestones([]);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !club) return; // Ensure club data is available

    setIsSearching(true);
    try {
      // Include media type in the search query
      const mediaType = club.media_type;
      const response = await fetch(
        `${API_BASE_URL}/media/search/quick?query=${encodeURIComponent(
          searchQuery
        )}&type=${mediaType}` // Added type parameter
      );

      if (!response.ok) {
        console.warn(
          `API endpoint returned ${response.status}: ${API_BASE_URL}/media/search/quick?type=${mediaType}`
        );
        toast.error(
          `${
            mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
          } search API is not available`
        );
        setSearchResults([]);
        return;
      }

      const data = await response.json();
      // Assume backend returns results in a consistent 'results' field
      const results = (data.results || []).map((item: any) => ({
        ...item,
        media_type: mediaType, // Add media_type if not returned by backend
      }));
      setSearchResults(results);
    } catch (err) {
      console.error(`Error searching ${club.media_type}s:`, err);
      toast.error(`Failed to search for ${club.media_type}s`);
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

  const handleSelectMedia = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  const handleAddMedia = async () => {
    if (!selectedMedia || !club) return;

    setIsLoading(true); // Changed from setLoading to setIsLoading to match state variable
    let result: { success: boolean; message?: string; data?: ClubData } | null =
      null;

    try {
      switch (club.media_type) {
        case "book":
          const authorName =
            selectedMedia.authors && selectedMedia.authors.length > 0
              ? selectedMedia.authors[0]
              : "Unknown Author";
          result = await updateClubBook(club.id, {
            // Pass object as expected
            book_id: selectedMedia.id,
            book_title: selectedMedia.title,
            book_author: authorName,
            book_cover: selectedMedia.image_url || "",
          });
          break;
        case "movie":
          result = await updateClubMovie(club.id, {
            movie_id: selectedMedia.id,
            movie_title: selectedMedia.title,
            movie_director: selectedMedia.director, // Assuming director field exists in MediaItem
            movie_cover: selectedMedia.image_url,
          });
          break;
        case "tv_show":
          result = await updateClubTVShow(club.id, {
            tv_show_id: selectedMedia.id,
            tv_show_title: selectedMedia.title,
            tv_show_creator: selectedMedia.creator, // Assuming creator field exists in MediaItem
            tv_show_cover: selectedMedia.image_url,
          });
          break;
        default:
          toast.error("Unsupported media type");
          setIsLoading(false);
          return;
      }

      if (result?.success && result.data) {
        // Check for data property
        toast.success(
          `"${selectedMedia.title}" was added to your club!`
          // Add back discussion thread creation message if backend handles it for movies/tv
          // + `\nDiscussion threads might have been created.`
        );
        setClub(result.data); // Update club state with the response data
        setIsMediaSearchOpen(false);
        setSelectedMedia(null); // Clear selection
        // Optionally reload threads/milestones if adding media affects them
        // loadThreads(club.id);
        // loadMilestones(club.id);
      } else {
        toast.error(
          `Failed to add ${club.media_type} to club: ${
            result?.message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error(`Error adding ${club.media_type}:`, error);
      toast.error(`An error occurred while adding the ${club.media_type}`);
    } finally {
      setIsLoading(false); // Ensure loading state is reset
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

  const renderMediaInfo = () => {
    if (!club) return null;

    let title: string | undefined;
    let detail: string | undefined;
    let cover: string | undefined;
    let IconComponent: React.ElementType = BookOpen; // Default icon

    switch (club.media_type) {
      case "book":
        title = club.book_title;
        detail = club.book_author ? `by ${club.book_author}` : undefined;
        cover = club.book_cover;
        IconComponent = BookOpen;
        break;
      case "movie":
        title = club.movie_title;
        // Ensure movie_director exists on club object (fetched from API)
        detail = club.movie_director
          ? `Directed by ${club.movie_director}`
          : undefined;
        cover = club.movie_cover;
        IconComponent = Clapperboard;
        break;
      case "tv_show":
        title = club.tv_show_title;
        // Ensure tv_show_creator exists on club object (fetched from API)
        detail = club.tv_show_creator
          ? `Created by ${club.tv_show_creator}`
          : undefined;
        cover = club.tv_show_cover;
        IconComponent = Tv;
        break;
    }

    if (title) {
      return (
        <div className="mb-6 flex items-start gap-4 bg-card rounded-lg p-4 border">
          <div className="shrink-0">
            {cover ? (
              <img
                // Use normalizeImageUrl if cover URLs need normalization like club covers
                src={normalizeImageUrl(cover) || cover}
                alt={title}
                className="w-24 h-32 object-cover rounded-md"
              />
            ) : (
              <div className="w-24 h-32 bg-muted flex items-center justify-center rounded-md">
                <IconComponent className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Current Pick</h2>
            <h3 className="text-xl font-bold">{title}</h3>
            {detail && (
              <p className="text-sm text-muted-foreground">{detail}</p>
            )}
            <p className="mt-2 text-sm">Join the discussion below.</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Check if the creator should see the button to pick media
  const showPickMediaButton =
    club?.is_creator &&
    ((club.media_type === "book" && !club.book_title) ||
      (club.media_type === "movie" && !club.movie_title) ||
      (club.media_type === "tv_show" && !club.tv_show_title));

  // Helper to get media type specific text/icon
  const getMediaTypeDetails = (mediaType: string | undefined) => {
    switch (mediaType) {
      case "movie":
        return {
          noun: "Movie",
          nounPlural: "Movies",
          verb: "Watch",
          icon: Clapperboard,
          searchPlaceholder: "Search for a movie by title...",
          creatorFieldLabel: "Director",
        };
      case "tv_show":
        return {
          noun: "TV Show",
          nounPlural: "TV Shows",
          verb: "Watch",
          icon: Tv,
          searchPlaceholder: "Search for a TV show by title...",
          creatorFieldLabel: "Creator",
        };
      case "book":
      default:
        return {
          noun: "Book",
          nounPlural: "Books",
          verb: "Read",
          icon: BookOpen,
          searchPlaceholder: "Search for a book by title or author...",
          creatorFieldLabel: "Author",
        };
    }
  };

  const mediaDetails = getMediaTypeDetails(club?.media_type);
  const MediaIcon = mediaDetails.icon;

  return (
    <div className="px-4 py-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{club.name}</h1>
        <div className="flex gap-2">
          {!club.is_member && <Button variant="default">Join Club</Button>}
        </div>
      </div>

      {club.description && (
        <p className="text-muted-foreground">{club.description}</p>
      )}

      {renderMediaInfo()}

      {showPickMediaButton && (
        <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/25">
          <MediaIcon className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">
            No {mediaDetails.noun.toLowerCase()} selected yet
          </h3>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            As the club creator, you can select a{" "}
            {mediaDetails.noun.toLowerCase()} to{" "}
            {mediaDetails.verb.toLowerCase()}. This may create discussion
            features later.
          </p>
          <Dialog open={isMediaSearchOpen} onOpenChange={setIsMediaSearchOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <MediaIcon className="w-4 h-4" />
                Pick Club {mediaDetails.noun}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Pick a {mediaDetails.noun} for Your Club
                </DialogTitle>
                <DialogDescription>
                  Search for a {mediaDetails.noun.toLowerCase()} to add to your
                  club.
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
                    onKeyDown={handleKeyDown}
                    placeholder={mediaDetails.searchPlaceholder}
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
                      {searchResults.map((media) => (
                        <div
                          key={`${media.media_type}-${media.id}`} // Use composite key
                          onClick={() => handleSelectMedia(media)}
                          className={`flex items-center gap-4 p-2 rounded-md hover:bg-accent cursor-pointer ${
                            selectedMedia?.id === media.id &&
                            selectedMedia?.media_type === media.media_type
                              ? "bg-accent"
                              : ""
                          }`}
                        >
                          {media.image_url ? (
                            <img
                              src={media.image_url} // Assuming search returns full URLs
                              alt={media.title}
                              className="h-24 w-16 object-cover rounded"
                            />
                          ) : (
                            <div className="h-24 w-16 bg-muted flex items-center justify-center rounded">
                              <MediaIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {media.title}
                            </div>
                            {/* Conditionally display author/director/creator */}
                            {media.authors &&
                              media.authors.length > 0 &&
                              media.media_type === "book" && (
                                <div className="text-sm text-muted-foreground">
                                  by {media.authors.join(", ")}
                                </div>
                              )}
                            {media.director && media.media_type === "movie" && (
                              <div className="text-sm text-muted-foreground">
                                Directed by {media.director}
                              </div>
                            )}
                            {media.creator &&
                              media.media_type === "tv_show" && (
                                <div className="text-sm text-muted-foreground">
                                  Created by {media.creator}
                                </div>
                              )}
                            {/* Conditionally display published/release date */}
                            {media.published_date &&
                              media.media_type === "book" && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Published {media.published_date.split("-")[0]}
                                </div>
                              )}
                            {media.release_date &&
                              (media.media_type === "movie" ||
                                media.media_type === "tv_show") && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Released {media.release_date.split("-")[0]}
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No {mediaDetails.nounPlural.toLowerCase()} found.
                    </div>
                  ) : null}
                </div>
              </Command>

              <DialogFooter>
                <Button
                  onClick={handleAddMedia}
                  disabled={!selectedMedia || isLoading} // Use isLoading state
                  className="gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MediaIcon className="w-4 h-4" />
                  )}
                  Add {mediaDetails.noun} to Club
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

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
                    <DialogFooter>
                      <Button>Create Thread</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
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
                    <DialogFooter>
                      <Button>Create Milestone</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
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
      </Tabs>
    </div>
  );
}
