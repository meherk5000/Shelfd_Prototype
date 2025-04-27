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
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";

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
  const { isAuthenticated } = useAuth();
  const router = useRouter();

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
      // Only fetch user's clubs if authenticated
      if (isAuthenticated) {
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
      } else {
        // Clear user club states if not authenticated
        setUserClubs([]);
        setCreatedClubs([]);
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
  const ClubCard = ({
    club,
    isAuthenticated,
  }: {
    club: ClubData;
    isAuthenticated: boolean;
  }) => {
    const handleClubClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isAuthenticated) {
        e.preventDefault();
        console.log(
          "User not authenticated, redirecting to login for club:",
          club.id
        );
        const returnUrl = `/clubs/${club.id}`;
        router.push(`/auth/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`);
      }
    };

    return (
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
          <Link
            href={`/clubs/${club.id}`}
            onClick={handleClubClick}
            className="block hover:text-primary transition-colors"
          >
            <h3 className="font-semibold text-lg mb-2">{club.name}</h3>
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
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-start items-center">
        <Button asChild>
          <Link href="/clubs/create">
            <Plus className="mr-2 h-4 w-4" /> Create Club
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="explore">Explore Clubs</TabsTrigger>
          <TabsTrigger value="your">Your Clubs</TabsTrigger>
        </TabsList>

        {/* Explore Tab Content */}
        {activeTab === "explore" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Search clubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow"
              />
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
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
            {loading ? (
              <div className="flex justify-center items-center pt-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : groupedClubs && mediaType === "any" ? (
              // Render grouped view
              Object.entries(groupedClubs).map(
                ([type, groupClubs]) =>
                  groupClubs.length > 0 && (
                    <div key={type}>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold capitalize">
                          {type} Clubs
                        </h2>
                        {/* Optional: Add a 'See All' link here */}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {groupClubs.map((club) => (
                          <ClubCard
                            key={club.id}
                            club={club}
                            isAuthenticated={isAuthenticated}
                          />
                        ))}
                      </div>
                    </div>
                  )
              )
            ) : clubs.length > 0 ? (
              // Render filtered or non-grouped view
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {clubs.map((club) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No clubs found matching your criteria.
              </div>
            )}
          </div>
        )}

        {/* Your Clubs Tab Content */}
        {activeTab === "your" && (
          <div className="mt-6 space-y-6">
            {!isAuthenticated ? (
              <div className="text-center py-10 text-muted-foreground">
                Please log in to see the clubs you've joined or created.
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center pt-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Created Clubs */}
                {createdClubs.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">
                      Created by You
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {createdClubs.map((club) => (
                        <ClubCard
                          key={club.id}
                          club={club}
                          isAuthenticated={isAuthenticated}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Joined Clubs (excluding created) */}
                {userClubs.filter((club) => !club.is_creator).length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">
                      Joined Clubs
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {userClubs
                        .filter((club) => !club.is_creator)
                        .map((club) => (
                          <ClubCard
                            key={club.id}
                            club={club}
                            isAuthenticated={isAuthenticated}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Message if no clubs joined or created */}
                {createdClubs.length === 0 &&
                  userClubs.filter((club) => !club.is_creator).length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      You haven't joined or created any clubs yet. Explore clubs
                      or create a new one!
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
