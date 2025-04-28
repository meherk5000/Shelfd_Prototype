"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const previewLimit = 12;
const loadLimit = 24;

export function Clubs() {
  const [activeTab, setActiveTab] = useState("explore");
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaType, setMediaType] = useState("any");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [exploreClubs, setExploreClubs] = useState<ClubData[]>([]);
  const [myClubs, setMyClubs] = useState<ClubData[]>([]);
  const [createdClubs, setCreatedClubs] = useState<ClubData[]>([]);

  const [exploreSkip, setExploreSkip] = useState(0);
  const [myClubsSkip, setMyClubsSkip] = useState(0);
  const [createdClubsSkip, setCreatedClubsSkip] = useState(0);

  const [canLoadMoreExplore, setCanLoadMoreExplore] = useState(true);
  const [canLoadMoreMyClubs, setCanLoadMoreMyClubs] = useState(true);
  const [canLoadMoreCreatedClubs, setCanLoadMoreCreatedClubs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const {
    loading,
    error,
    getClubs,
    getMyClubs,
    getUserClubs,
    getCreatedClubs,
    joinClub,
    leaveClub,
    internalLoading,
  } = useClubs();

  const loadInitialClubs = useCallback(async () => {
    setExploreSkip(0);
    setMyClubsSkip(0);
    setCreatedClubsSkip(0);
    setExploreClubs([]);
    setMyClubs([]);
    setCreatedClubs([]);

    if (activeTab === "explore") {
      setCanLoadMoreExplore(true);
      const currentLimit =
        mediaType === "any" && !debouncedSearch ? previewLimit : loadLimit;
      const result = await getClubs(
        0,
        currentLimit,
        mediaType === "any" ? undefined : mediaType,
        debouncedSearch
      );
      if (result.success && result.data?.clubs) {
        console.log(
          "[Explore Tab - Initial Load] Fetched clubs:",
          result.data.clubs
        );
        setExploreClubs(result.data.clubs);
        setExploreSkip(result.data.clubs.length);
        setCanLoadMoreExplore(
          result.data.clubs.length === currentLimit && mediaType !== "any"
        );
      }
    } else if (activeTab === "your") {
      if (isAuthenticated) {
        setCanLoadMoreMyClubs(true);
        const result = await getMyClubs(0, loadLimit);
        if (result.success && result.data?.clubs) {
          console.log(
            "[Your Clubs Tab - Initial Load] Fetched clubs:",
            result.data.clubs
          );
          setMyClubs(result.data.clubs);
          setMyClubsSkip(result.data.clubs.length);
          setCanLoadMoreMyClubs(result.data.clubs.length === loadLimit);
        }
      } else {
        setMyClubs([]);
        setCanLoadMoreMyClubs(false);
      }
    }
  }, [
    activeTab,
    debouncedSearch,
    mediaType,
    getClubs,
    getMyClubs,
    getCreatedClubs,
    isAuthenticated,
    previewLimit,
    loadLimit,
  ]);

  const loadMoreClubs = useCallback(async () => {
    if (loading || loadingMore || mediaType === "any") return;
    setLoadingMore(true);

    let result;
    let currentSkip = 0;
    let setClubsFunc: React.Dispatch<React.SetStateAction<ClubData[]>> | null =
      null;
    let setSkipFunc: React.Dispatch<React.SetStateAction<number>> | null = null;
    let setCanLoadMoreFunc: React.Dispatch<
      React.SetStateAction<boolean>
    > | null = null;

    if (activeTab === "explore" && canLoadMoreExplore) {
      currentSkip = exploreSkip;
      setClubsFunc = setExploreClubs;
      setSkipFunc = setExploreSkip;
      setCanLoadMoreFunc = setCanLoadMoreExplore;
      result = await getClubs(
        currentSkip,
        loadLimit,
        mediaType === "any" ? undefined : mediaType,
        debouncedSearch
      );
    } else if (activeTab === "your" && canLoadMoreMyClubs && isAuthenticated) {
      currentSkip = myClubsSkip;
      setClubsFunc = setMyClubs;
      setSkipFunc = setMyClubsSkip;
      setCanLoadMoreFunc = setCanLoadMoreMyClubs;
      result = await getMyClubs(currentSkip, loadLimit);
    }

    if (
      result?.success &&
      result.data?.clubs &&
      setClubsFunc &&
      setSkipFunc &&
      setCanLoadMoreFunc
    ) {
      const newClubs = result.data.clubs;
      setClubsFunc((prev) => [...prev, ...newClubs]);
      setSkipFunc((prev) => prev + newClubs.length);
      setCanLoadMoreFunc(newClubs.length === loadLimit);
    } else if (setCanLoadMoreFunc) {
      setCanLoadMoreFunc(false);
    }

    setLoadingMore(false);
  }, [
    activeTab,
    debouncedSearch,
    mediaType,
    loadLimit,
    isAuthenticated,
    loading,
    loadingMore,
    exploreSkip,
    myClubsSkip,
    canLoadMoreExplore,
    canLoadMoreMyClubs,
    getClubs,
    getMyClubs,
    getCreatedClubs,
  ]);

  useEffect(() => {
    loadInitialClubs();
  }, [loadInitialClubs]);

  const handleJoinLeave = async (club: ClubData) => {
    const success = club.is_member
      ? await leaveClub(club.id)
      : await joinClub(club.id);

    if (success) {
      const updateClub = (c: ClubData) =>
        c.id === club.id
          ? {
              ...c,
              is_member: !c.is_member,
              member_count: c.member_count + (c.is_member ? -1 : 1),
            }
          : c;

      setExploreClubs((prev) => prev.map(updateClub));
      setMyClubs((prev) => prev.map(updateClub));
    }
  };

  const groupedClubs = useMemo(() => {
    if (activeTab !== "explore" || mediaType !== "any") {
      return null;
    }

    const groups: Record<string, ClubData[]> = {
      book: [],
      movie: [],
      tv: [],
    };

    exploreClubs.forEach((club) => {
      if (groups[club.media_type]) {
        groups[club.media_type].push(club);
      }
    });

    return groups;
  }, [exploreClubs, activeTab, mediaType]);

  const groupedUserClubs = useMemo(() => {
    if (activeTab !== "your" || mediaType !== "any") {
      return null;
    }

    const groups: Record<string, ClubData[]> = {
      book: [],
      movie: [],
      tv: [],
    };

    myClubs
      .filter((club) => !club.is_creator)
      .forEach((club) => {
        if (groups[club.media_type]) {
          groups[club.media_type].push(club);
        }
      });

    return groups;
  }, [myClubs, activeTab, mediaType]);

  const displayedClubs = activeTab === "explore" ? exploreClubs : myClubs;

  const handleSeeAll = (type: string) => {
    setMediaType(type);
  };

  // Filter myClubs for display in the 'Your Clubs' tab
  const createdByMe = useMemo(
    () => myClubs.filter((club) => club.is_creator),
    [myClubs]
  );
  const joinedByMe = useMemo(
    () => myClubs.filter((club) => !club.is_creator),
    [myClubs]
  );

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

    const isJoiningOrLeaving = internalLoading[club.id];

    return (
      <div
        key={club.id}
        className="bg-card border rounded-lg overflow-hidden hover:border-primary transition-colors"
      >
        <div className="aspect-video bg-muted relative">
          {club.cover_image ? (
            <div className="w-full h-full relative">
              <Image
                src={club.cover_image}
                alt={club.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                onError={(e) => {
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
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="font-medium">Created by:</span>
              <span className="ml-1">{club.creator_username}</span>
            </div>

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
                  disabled={isJoiningOrLeaving}
                >
                  {isJoiningOrLeaving ? (
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
        <TabsContent value="explore">
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
            {loading && exploreClubs.length === 0 ? (
              <div className="flex justify-center items-center pt-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : mediaType === "any" && !debouncedSearch ? (
              Object.entries(groupedClubs || {}).map(
                ([type, groupClubs]) =>
                  groupClubs.length > 0 && (
                    <div key={type}>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold capitalize">
                          {type} Clubs
                        </h2>
                        <Button
                          variant="link"
                          onClick={() => handleSeeAll(type)}
                        >
                          See All
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {groupClubs
                          .slice(0, previewLimit)
                          .map((club: ClubData) => (
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
            ) : exploreClubs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {exploreClubs.map((club: ClubData) => (
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
            {mediaType !== "any" &&
              canLoadMoreExplore &&
              exploreClubs.length > 0 && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={loadMoreClubs}
                    disabled={loadingMore}
                    variant="outline"
                  >
                    {loadingMore ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
          </div>
        </TabsContent>

        {/* Your Clubs Tab Content */}
        <TabsContent value="your">
          <div className="mt-6 space-y-6">
            {!isAuthenticated ? (
              <div className="text-center py-10 text-muted-foreground">
                Please log in to see the clubs you've joined or created.
              </div>
            ) : loading && myClubs.length === 0 ? (
              <div className="flex justify-center items-center pt-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Clubs You Created Section */}
                {createdByMe.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">
                      Clubs You Created
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {createdByMe.map((club) => (
                        <ClubCard
                          key={club.id}
                          club={club}
                          isAuthenticated={isAuthenticated}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Clubs You Joined Section */}
                {joinedByMe.length > 0 && (
                  <div>
                    {/* Add margin top if created section also exists */}
                    <h2
                      className={`text-2xl font-semibold mb-4 ${
                        createdByMe.length > 0 ? "mt-6" : ""
                      }`}
                    >
                      Clubs You Joined
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {joinedByMe.map((club) => (
                        <ClubCard
                          key={club.id}
                          club={club}
                          isAuthenticated={isAuthenticated}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Message if no clubs at all */}
                {myClubs.length === 0 && !loading && (
                  <div className="text-center py-10 text-muted-foreground">
                    You haven't joined or created any clubs yet. Explore clubs
                    or create a new one!
                  </div>
                )}

                {/* Load More Button - Loads more for the combined list */}
                {canLoadMoreMyClubs && myClubs.length > 0 && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={loadMoreClubs}
                      disabled={loadingMore}
                      variant="outline"
                    >
                      {loadingMore ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Load More
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
