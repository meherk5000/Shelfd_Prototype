"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Users, Plus, Loader2 } from "lucide-react";
import { useClubs, ClubData } from "@/lib/hooks/use-clubs";
import Link from "next/link";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

const mediaTypes = [
  { value: "any", label: "All Types" },
  { value: "book", label: "Book Clubs" },
  { value: "movie", label: "Movie Clubs" },
  { value: "tv", label: "TV Show Clubs" },
];

export function Clubs() {
  const [activeTab, setActiveTab] = useState("explore");
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaType, setMediaType] = useState("any");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [userClubs, setUserClubs] = useState<ClubData[]>([]);
  const [createdClubs, setCreatedClubs] = useState<ClubData[]>([]);
  const limit = 24;

  const {
    loading,
    error,
    getClubs,
    getUserClubs,
    getCreatedClubs,
    joinClub,
    leaveClub,
  } = useClubs();

  // Load clubs when filters change
  useEffect(() => {
    setClubs([]);
    setUserClubs([]);
    setCreatedClubs([]);
    loadClubs();
  }, [activeTab, debouncedSearch, mediaType]);

  const loadClubs = async () => {
    if (activeTab === "explore") {
      // If we're filtering by a specific media type, use that
      // Otherwise, load all clubs regardless of type - we'll group them later
      const result = await getClubs(
        0,
        limit,
        mediaType === "any" ? undefined : mediaType,
        debouncedSearch
      );
      const clubs = result.data?.clubs ?? [];
      if (result.success) {
        setClubs(clubs);
      }
    } else {
      // For "Your Clubs" tab, load both joined and created clubs
      const joinedResult = await getUserClubs(0, limit);
      const joinedClubs = joinedResult.data?.clubs ?? [];

      const createdResult = await getCreatedClubs(0, limit);
      const createdClubs = createdResult.data?.clubs ?? [];

      if (joinedResult.success) {
        setUserClubs(joinedClubs);
      }

      if (createdResult.success) {
        setCreatedClubs(createdClubs);
      }
    }
  };

  const handleJoinLeave = async (club: ClubData) => {
    const success = club.is_member
      ? await leaveClub(club.id)
      : await joinClub(club.id);

    if (success) {
      // Update the club's membership status in both lists
      const updateClub = (c: ClubData) =>
        c.id === club.id
          ? {
              ...c,
              is_member: !c.is_member,
              member_count: c.member_count + (c.is_member ? -1 : 1),
            }
          : c;

      setClubs((prev) => prev.map(updateClub));
      setUserClubs((prev) => prev.map(updateClub));
    }
  };

  // Group clubs by media type for the explore tab
  const groupedClubs = useMemo(() => {
    if (activeTab !== "explore" || mediaType !== "any") {
      return null;
    }

    const groups: Record<string, ClubData[]> = {
      book: [],
      movie: [],
      tv: [],
    };

    clubs.forEach((club) => {
      if (groups[club.media_type]) {
        groups[club.media_type].push(club);
      }
    });

    return groups;
  }, [clubs, activeTab, mediaType]);

  // Group user clubs by media type for the your clubs tab
  const groupedUserClubs = useMemo(() => {
    if (activeTab !== "your" || mediaType !== "any") {
      return null;
    }

    const groups: Record<string, ClubData[]> = {
      book: [],
      movie: [],
      tv: [],
    };

    // Only include clubs the user has joined but didn't create
    userClubs
      .filter((club) => !club.is_creator)
      .forEach((club) => {
        if (groups[club.media_type]) {
          groups[club.media_type].push(club);
        }
      });

    return groups;
  }, [userClubs, activeTab, mediaType]);

  const displayedClubs = activeTab === "explore" ? clubs : userClubs;

  // Club card component to avoid duplicate rendering code
  const ClubCard = ({ club }: { club: ClubData }) => (
    <div
      key={club.id}
      className="bg-card border rounded-lg overflow-hidden hover:border-primary transition-colors"
    >
      <div className="aspect-video bg-muted relative">
        {/* Cover image */}
        {club.cover_image ? (
          <div className="w-full h-full relative">
            <Image
              src={club.cover_image}
              alt={club.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              onError={(e) => {
                // Fallback to first letter on image load error
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.classList.add(
                    "flex",
                    "items-center",
                    "justify-center",
                    "bg-muted"
                  );
                  const span = document.createElement("span");
                  span.className =
                    "text-4xl font-bold text-muted-foreground opacity-20";
                  span.textContent = club.name.charAt(0);
                  parent.appendChild(span);
                }
                // Log error details
                console.error(`Failed to load image: ${club.cover_image}`);
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-4xl font-bold text-muted-foreground opacity-20">
              {club.name.charAt(0)}
            </span>
          </div>
        )}
        {/* Club type badge */}
        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground px-2 py-1 rounded text-sm">
          {club.media_type.charAt(0).toUpperCase() + club.media_type.slice(1)}
        </div>
      </div>
      <div className="p-4">
        <Link href={`/clubs/${club.id}`}>
          <h3 className="font-semibold text-lg mb-2 hover:text-primary transition-colors">
            {club.name}
          </h3>
        </Link>
        {club.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {club.description}
          </p>
        )}
        <div className="space-y-2">
          {/* Creator information */}
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="font-medium">Created by:</span>
            <span className="ml-1">{club.creator_username}</span>
          </div>

          {/* Members information */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="w-4 h-4 mr-1" />
              <span>{club.member_count} members</span>
            </div>
            {!club.is_creator && (
              <Button
                variant={club.is_member ? "outline" : "default"}
                size="sm"
                onClick={() => handleJoinLeave(club)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : club.is_member ? (
                  "Leave"
                ) : (
                  "Join"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clubs</h1>
        <Link href="/clubs/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Club
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="explore">Explore Clubs</TabsTrigger>
          <TabsTrigger value="your">Your Clubs</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Input
          placeholder="Search clubs..."
          className="max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select value={mediaType} onValueChange={setMediaType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select type" />
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

      {error && <div className="text-red-500 text-center py-4">{error}</div>}

      {/* Show clubs by sections if on explore tab and not filtering by media type */}
      {activeTab === "explore" && mediaType === "any" && groupedClubs ? (
        <div className="space-y-10">
          {/* Book Clubs */}
          {groupedClubs.book.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Book Clubs</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMediaType("book")}
                  className="text-primary"
                >
                  See all
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedClubs.book.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </div>
          )}

          {/* Movie Clubs */}
          {groupedClubs.movie.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Movie Clubs</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMediaType("movie")}
                  className="text-primary"
                >
                  See all
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedClubs.movie.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </div>
          )}

          {/* TV Show Clubs */}
          {groupedClubs.tv.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">TV Show Clubs</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMediaType("tv")}
                  className="text-primary"
                >
                  See all
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedClubs.tv.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "your" && mediaType === "any" ? (
        <div className="space-y-10">
          {/* Clubs Created by You */}
          {createdClubs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Clubs Created by You</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {createdClubs.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            </div>
          )}

          {/* Book Clubs You've Joined */}
          {groupedUserClubs &&
            groupedUserClubs.book &&
            groupedUserClubs.book.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    Book Clubs You've Joined
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMediaType("book")}
                    className="text-primary"
                  >
                    See all
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedUserClubs.book.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </div>
            )}

          {/* Movie Clubs You've Joined */}
          {groupedUserClubs &&
            groupedUserClubs.movie &&
            groupedUserClubs.movie.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    Movie Clubs You've Joined
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMediaType("movie")}
                    className="text-primary"
                  >
                    See all
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedUserClubs.movie.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </div>
            )}

          {/* TV Show Clubs You've Joined */}
          {groupedUserClubs &&
            groupedUserClubs.tv &&
            groupedUserClubs.tv.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    TV Show Clubs You've Joined
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMediaType("tv")}
                    className="text-primary"
                  >
                    See all
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedUserClubs.tv.map((club) => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </div>
            )}

          {/* Empty state */}
          {createdClubs.length === 0 &&
            !groupedUserClubs?.book?.length &&
            !groupedUserClubs?.movie?.length &&
            !groupedUserClubs?.tv?.length &&
            !loading && (
              <div className="text-center py-8 text-muted-foreground">
                You haven't joined any clubs yet. Explore clubs to get started!
              </div>
            )}
        </div>
      ) : (
        /* Regular grid view for filtered results */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedClubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>

          {displayedClubs.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              {activeTab === "explore"
                ? "No clubs found. Try adjusting your search or create a new club!"
                : "You haven't joined any clubs yet. Explore clubs to get started!"}
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
