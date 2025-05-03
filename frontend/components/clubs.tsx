"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Filter,
  Users,
  Plus,
  Loader2,
  BookOpen,
  Clapperboard,
  Tv,
  Search,
} from "lucide-react";
import { useClubs, ClubData, normalizeImageUrl } from "@/lib/hooks/use-clubs";
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
import { API_BASE_URL } from "@/lib/config";

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
  const [createdClubsPreview, setCreatedClubsPreview] = useState<ClubData[]>(
    []
  );
  const [joinedClubsPreview, setJoinedClubsPreview] = useState<ClubData[]>([]);

  const [exploreSkip, setExploreSkip] = useState(0);
  const [createdClubsSkip, setCreatedClubsSkip] = useState(0);
  const [joinedClubsSkip, setJoinedClubsSkip] = useState(0);

  const [canLoadMoreExplore, setCanLoadMoreExplore] = useState(true);
  const [canLoadMoreCreatedClubs, setCanLoadMoreCreatedClubs] = useState(true);
  const [canLoadMoreJoinedClubs, setCanLoadMoreJoinedClubs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingYourClubs, setLoadingYourClubs] = useState(false);

  type YourClubsViewMode = "overview" | "allCreated" | "allJoined";
  const [yourClubsViewMode, setYourClubsViewMode] =
    useState<YourClubsViewMode>("overview");

  const [paginatedCreatedClubs, setPaginatedCreatedClubs] = useState<
    ClubData[]
  >([]);
  const [paginatedJoinedClubs, setPaginatedJoinedClubs] = useState<ClubData[]>(
    []
  );

  const {
    loading,
    error,
    getClubs,
    getCreatedClubs,
    getUserClubs,
    joinClub,
    leaveClub,
    internalLoading,
  } = useClubs();

  // Preview limit for the overview
  const yourClubsPreviewLimit = 4;

  const loadInitialClubs = useCallback(async () => {
    // Reset pagination and lists for both tabs
    setExploreSkip(0);
    setCreatedClubsSkip(0);
    setJoinedClubsSkip(0);
    setExploreClubs([]);
    setCreatedClubsPreview([]);
    setJoinedClubsPreview([]);
    setPaginatedCreatedClubs([]);
    setPaginatedJoinedClubs([]);
    setCanLoadMoreExplore(true);
    setCanLoadMoreCreatedClubs(true);
    setCanLoadMoreJoinedClubs(true);
    setYourClubsViewMode("overview"); // Reset view mode

    if (activeTab === "explore") {
      setLoadingYourClubs(false); // Not loading your clubs
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
      setLoadingYourClubs(true);
      if (isAuthenticated) {
        try {
          // Fetch created preview
          const createdResult = await getCreatedClubs(0, yourClubsPreviewLimit);
          if (createdResult.success && createdResult.data?.clubs) {
            console.log(
              "[Your Clubs Tab - Overview] Fetched created preview:",
              createdResult.data.clubs
            );
            setCreatedClubsPreview(createdResult.data.clubs);
          } else {
            setCreatedClubsPreview([]); // Set empty if error or no data
          }

          // Fetch joined preview
          const joinedResult = await getUserClubs(0, yourClubsPreviewLimit);

          console.log(
            "[Your Clubs Tab - DEBUG] Raw joinedResult:",
            JSON.stringify(joinedResult, null, 2) // Stringify for better object logging
          );

          if (joinedResult.success && joinedResult.data?.clubs) {
            console.log(
              "[Your Clubs Tab - Overview] Fetched joined preview (raw):",
              joinedResult.data.clubs
            );
            // Filter out clubs where the user is the creator
            const filteredJoinedPreview = joinedResult.data.clubs.filter(
              (club) => !club.is_creator
            );
            console.log(
              "[Your Clubs Tab - Overview] Filtered joined preview:",
              filteredJoinedPreview
            );
            setJoinedClubsPreview(filteredJoinedPreview);
          } else {
            setJoinedClubsPreview([]); // Set empty if error or no data
          }
        } catch (error) {
          console.error(
            "[Your Clubs Tab - Overview] Error loading previews:",
            error
          );
          setCreatedClubsPreview([]);
          setJoinedClubsPreview([]);
          // Optionally show a toast error
        } finally {
          setLoadingYourClubs(false);
        }
      } else {
        // Not authenticated, clear everything for this tab
        setCreatedClubsPreview([]);
        setJoinedClubsPreview([]);
        setPaginatedCreatedClubs([]);
        setPaginatedJoinedClubs([]);
        setLoadingYourClubs(false);
      }
    }
  }, [
    activeTab,
    debouncedSearch,
    mediaType,
    getClubs,
    getCreatedClubs,
    getUserClubs,
    isAuthenticated,
    previewLimit,
    loadLimit,
    yourClubsPreviewLimit,
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
    } else if (
      activeTab === "your" &&
      canLoadMoreCreatedClubs &&
      isAuthenticated
    ) {
      currentSkip = createdClubsSkip;
      setClubsFunc = setCreatedClubsPreview;
      setSkipFunc = setCreatedClubsSkip;
      setCanLoadMoreFunc = setCanLoadMoreCreatedClubs;
      result = await getCreatedClubs(currentSkip, loadLimit);
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
    createdClubsSkip,
    canLoadMoreExplore,
    canLoadMoreCreatedClubs,
    getClubs,
    getCreatedClubs,
    getUserClubs,
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
      setCreatedClubsPreview((prev) => prev.map(updateClub));
      setJoinedClubsPreview((prev) => prev.map(updateClub));
      setPaginatedCreatedClubs((prev) => prev.map(updateClub));
      setPaginatedJoinedClubs((prev) => prev.map(updateClub));
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

  const handleSeeAll = (type: string) => {
    setMediaType(type);
  };

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
                src={normalizeImageUrl(club.cover_image) || "/placeholder.png"}
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
            </div>
          </div>
          {/* Join/Leave Button - moved below details, full width */}
          {!club.is_creator && (
            <Button
              variant={club.is_member ? "outline" : "default"}
              size="sm"
              onClick={() => handleJoinLeave(club)}
              disabled={isJoiningOrLeaving}
              className="w-full mt-4" // Add width and top margin
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
    );
  };

  // Helper function to load paginated created or joined clubs
  const loadPaginatedYourClubs = useCallback(
    async (type: "created" | "joined", skip: number) => {
      if (loadingYourClubs) return;
      setLoadingYourClubs(true);
      setLoadingMore(true);

      try {
        let result;
        if (type === "created") {
          result = await getCreatedClubs(skip, loadLimit);
        } else {
          result = await getUserClubs(skip, loadLimit);
        }

        if (result.success && result.data?.clubs) {
          const newClubs = result.data.clubs;
          if (type === "created") {
            setPaginatedCreatedClubs((prev: ClubData[]) =>
              skip === 0 ? newClubs : [...prev, ...newClubs]
            );
            setCreatedClubsSkip((prev: number) => prev + newClubs.length);
            setCanLoadMoreCreatedClubs(newClubs.length === loadLimit);
          } else {
            const filteredNewJoinedClubs = newClubs.filter(
              (club) => !club.is_creator
            );
            setPaginatedJoinedClubs((prev: ClubData[]) =>
              skip === 0
                ? filteredNewJoinedClubs
                : [...prev, ...filteredNewJoinedClubs]
            );
            setJoinedClubsSkip((prev: number) => prev + newClubs.length);
            setCanLoadMoreJoinedClubs(newClubs.length === loadLimit);
          }
        } else {
          if (type === "created") setCanLoadMoreCreatedClubs(false);
          else setCanLoadMoreJoinedClubs(false);
        }
      } catch (error) {
        console.error(
          `[Your Clubs Tab - Loading Paginated] Error loading ${type} clubs:`,
          error
        );
        if (type === "created") setCanLoadMoreCreatedClubs(false);
        else setCanLoadMoreJoinedClubs(false);
      } finally {
        setLoadingYourClubs(false);
        setLoadingMore(false);
      }
    },
    [
      getCreatedClubs,
      getUserClubs,
      loadLimit,
      loadingYourClubs,
      setPaginatedCreatedClubs,
      setCreatedClubsSkip,
      setCanLoadMoreCreatedClubs,
      setPaginatedJoinedClubs,
      setJoinedClubsSkip,
      setCanLoadMoreJoinedClubs,
    ]
  );

  // Function to handle clicking "See All"
  const handleSeeAllYourClubs = (type: "created" | "joined") => {
    setYourClubsViewMode(type === "created" ? "allCreated" : "allJoined");
    // Reset the specific list and pagination before loading the first page
    if (type === "created") {
      setPaginatedCreatedClubs([]);
      setCreatedClubsSkip(0);
      setCanLoadMoreCreatedClubs(true);
    } else {
      setPaginatedJoinedClubs([]);
      setJoinedClubsSkip(0);
      setCanLoadMoreJoinedClubs(true);
    }
    loadPaginatedYourClubs(type, 0); // Load the first page
  };

  // Function to handle clicking "Load More" in the "Your Clubs" tab
  const loadMoreYourClubs = () => {
    if (
      yourClubsViewMode === "allCreated" &&
      !loadingMore &&
      canLoadMoreCreatedClubs
    ) {
      loadPaginatedYourClubs("created", createdClubsSkip);
    } else if (
      yourClubsViewMode === "allJoined" &&
      !loadingMore &&
      canLoadMoreJoinedClubs
    ) {
      loadPaginatedYourClubs("joined", joinedClubsSkip);
    }
  };

  // Function to handle clicking "Load More" in the "Explore" tab
  const loadMoreExploreClubs = useCallback(async () => {
    if (loading || loadingMore || mediaType === "any") return;
    setLoadingMore(true);

    try {
      const result = await getClubs(
        exploreSkip,
        loadLimit,
        mediaType === "any" ? undefined : mediaType,
        debouncedSearch
      );

      if (result?.success && result.data?.clubs) {
        const newClubs = result.data.clubs;
        setExploreClubs((prev) => [...prev, ...newClubs]);
        setExploreSkip((prev) => prev + newClubs.length);
        setCanLoadMoreExplore(newClubs.length === loadLimit);
      } else {
        setCanLoadMoreExplore(false);
      }
    } catch (error) {
      console.error("[Explore Tab - Load More] Error:", error);
      setCanLoadMoreExplore(false);
      // Optionally show toast
    } finally {
      setLoadingMore(false);
    }
  }, [
    exploreSkip,
    loadLimit,
    mediaType,
    debouncedSearch,
    getClubs,
    loading,
    loadingMore,
  ]);

  useEffect(() => {
    loadInitialClubs();
  }, [loadInitialClubs]);

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
                    onClick={loadMoreExploreClubs}
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
            ) : loadingYourClubs &&
              yourClubsViewMode === "overview" &&
              !createdClubsPreview.length &&
              !joinedClubsPreview.length ? (
              // Show loader only on initial overview load if no previews exist yet
              <div className="flex justify-center items-center pt-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Overview Mode */}
                {yourClubsViewMode === "overview" && (
                  <>
                    {/* Created Clubs Preview */}
                    {createdClubsPreview.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-2xl font-semibold">
                            Clubs You Created
                          </h2>
                          <Button
                            variant="link"
                            onClick={() => handleSeeAllYourClubs("created")}
                          >
                            See All
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {createdClubsPreview.map((club) => (
                            <ClubCard
                              key={club.id}
                              club={club}
                              isAuthenticated={isAuthenticated}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Joined Clubs Preview */}
                    {joinedClubsPreview.length > 0 && (
                      <div>
                        <div
                          className={`flex justify-between items-center mb-4 ${
                            createdClubsPreview.length > 0 ? "mt-6" : ""
                          }`}
                        >
                          <h2 className="text-2xl font-semibold">
                            Clubs You Joined
                          </h2>
                          <Button
                            variant="link"
                            onClick={() => handleSeeAllYourClubs("joined")}
                          >
                            See All
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {joinedClubsPreview.map((club) => (
                            <ClubCard
                              key={club.id}
                              club={club}
                              isAuthenticated={isAuthenticated}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message if no clubs at all in overview */}
                    {createdClubsPreview.length === 0 &&
                      joinedClubsPreview.length === 0 &&
                      !loadingYourClubs && (
                        <div className="text-center py-10 text-muted-foreground">
                          You haven't joined or created any clubs yet. Explore
                          clubs or create a new one!
                        </div>
                      )}
                  </>
                )}

                {/* All Created Mode */}
                {yourClubsViewMode === "allCreated" && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-semibold">
                        Clubs You Created
                      </h2>
                      <Button
                        variant="outline"
                        onClick={() => setYourClubsViewMode("overview")}
                      >
                        Back to Overview
                      </Button>
                    </div>
                    {loadingYourClubs && paginatedCreatedClubs.length === 0 ? (
                      <div className="flex justify-center items-center pt-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : paginatedCreatedClubs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {paginatedCreatedClubs.map((club) => (
                          <ClubCard
                            key={club.id}
                            club={club}
                            isAuthenticated={isAuthenticated}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        You haven't created any clubs yet.
                      </div>
                    )}
                    {/* Load More Button */}
                    {canLoadMoreCreatedClubs &&
                      paginatedCreatedClubs.length > 0 && (
                        <div className="flex justify-center mt-6">
                          <Button
                            onClick={loadMoreYourClubs}
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
                )}

                {/* All Joined Mode */}
                {yourClubsViewMode === "allJoined" && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-semibold">
                        Clubs You Joined
                      </h2>
                      <Button
                        variant="outline"
                        onClick={() => setYourClubsViewMode("overview")}
                      >
                        Back to Overview
                      </Button>
                    </div>
                    {loadingYourClubs && paginatedJoinedClubs.length === 0 ? (
                      <div className="flex justify-center items-center pt-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : paginatedJoinedClubs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {paginatedJoinedClubs.map((club) => (
                          <ClubCard
                            key={club.id}
                            club={club}
                            isAuthenticated={isAuthenticated}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        You haven't joined any clubs yet.
                      </div>
                    )}
                    {/* Load More Button */}
                    {canLoadMoreJoinedClubs &&
                      paginatedJoinedClubs.length > 0 && (
                        <div className="flex justify-center mt-6">
                          <Button
                            onClick={loadMoreYourClubs}
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
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
