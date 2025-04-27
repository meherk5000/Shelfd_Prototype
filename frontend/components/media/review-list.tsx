import { useState, useEffect } from "react";
import { useReviews, ReviewData, ReviewStats } from "@/lib/hooks/use-reviews";
import { HalfStarRating } from "@/components/ui/half-star-rating";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ThumbsUp, Flag, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReviewListProps {
  mediaId: string;
  mediaType: string;
  refreshTrigger?: number;
  initialStats?: ReviewStats | null;
}

export function ReviewList({
  mediaId,
  mediaType,
  refreshTrigger = 0,
  initialStats = null,
}: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(initialStats);
  const [loading, setLoading] = useState(!initialStats);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const { getMediaReviews, likeReview } = useReviews();
  const limit = 10;

  useEffect(() => {
    setPage(1);
    setReviews([]);
    setStats(refreshTrigger > 0 ? null : initialStats);
    setLoading(true);
    loadReviews();
  }, [mediaId, mediaType, sortBy, refreshTrigger]);

  const loadReviews = async (append = false) => {
    setLoading(true);

    try {
      const skip = append ? (page - 1) * limit : 0;
      const result = await getMediaReviews(
        mediaType,
        mediaId,
        sortBy,
        limit,
        skip
      );

      if (result.success && result.data) {
        const newReviews = result.data.reviews || [];
        const newStats = result.data.stats;

        if (append) {
          setReviews((prev) => [...prev, ...newReviews]);
        } else {
          setReviews(newReviews);
        }

        if (!append) {
          setStats(newStats);
        }

        setHasMore(newReviews.length === limit);
      } else if (!result.success) {
        console.error("API request failed:", result.error);
        setHasMore(false);
        if (!append) {
          setReviews([]);
        }
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
    loadReviews(true);
  };

  const handleLike = async (reviewId: string) => {
    const result = await likeReview(reviewId);

    if (result.success) {
      setReviews((prevReviews) =>
        prevReviews.map((review) => {
          if (review.id === reviewId) {
            const liked = !review.has_liked;
            return {
              ...review,
              has_liked: liked,
              likes_count: liked
                ? review.likes_count + 1
                : Math.max(0, review.likes_count - 1),
            };
          }
          return review;
        })
      );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Use formatDistanceToNow directly for consistency and accuracy
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e, "Input:", dateString);
      return dateString; // Fallback to original string on error
    }
  };

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "highest_rating", label: "Highest Rating" },
    { value: "lowest_rating", label: "Lowest Rating" },
    { value: "most_liked", label: "Most Liked" },
  ];

  return (
    <div className="space-y-6">
      {/* Review Stats */}
      {stats && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h3 className="text-xl font-bold">
                  {stats.average_rating > 0
                    ? `${stats.average_rating.toFixed(1)}/5`
                    : "No ratings yet"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {stats.total_reviews}{" "}
                  {stats.total_reviews === 1 ? "review" : "reviews"}
                </p>
              </div>

              {stats.total_reviews > 0 && (
                <div className="flex items-center mt-2 md:mt-0">
                  <HalfStarRating
                    value={stats.average_rating}
                    readOnly
                    size="md"
                  />
                </div>
              )}
            </div>
          </CardHeader>

          {stats.total_reviews > 0 && (
            <CardContent>
              <div className="space-y-2">
                {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map((rating) => {
                  const count =
                    stats.rating_distribution[rating.toFixed(1)] || 0;
                  const percentage = (count / stats.total_reviews) * 100;

                  return (
                    <div key={rating} className="flex items-center space-x-2">
                      <span className="text-sm w-6">{rating}</span>
                      <Progress value={percentage} className="h-2 flex-1" />
                      <span className="text-sm w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Sort controls */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Reviews</h3>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {loading && reviews.length === 0 ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-3 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-4/5 mb-2" />
                <Skeleton className="h-4 w-3/5" />
              </CardContent>
            </Card>
          ))
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-muted-foreground">
                No reviews yet. Be the first to review!
              </p>
            </CardContent>
          </Card>
        ) : (
          // Reviews
          reviews.map((review) => (
            <Card
              key={review.id}
              className={review.contains_spoilers ? "border-yellow-400" : ""}
            >
              {review.contains_spoilers && (
                <div className="bg-yellow-100 p-2 text-yellow-800 text-xs flex items-center rounded-t-lg">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  This review contains spoilers
                </div>
              )}

              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <Avatar>
                      <AvatarImage
                        src={review.user_avatar}
                        alt={review.username}
                      />
                      <AvatarFallback>
                        {review.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <div className="font-medium">
                        <span>{review.username}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(review.created_at)}
                        {review.updated_at &&
                          review.updated_at !== review.created_at && (
                            <span
                              title={`Updated ${formatDate(review.updated_at)}`}
                            >
                              {" "}
                              (edited)
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <HalfStarRating value={review.rating} readOnly size="sm" />
                </div>
              </CardHeader>

              {review.review_text && (
                <CardContent>
                  <p className="text-sm whitespace-pre-line">
                    {review.review_text}
                  </p>
                </CardContent>
              )}

              <CardFooter className="flex justify-between py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(review.id)}
                  className={review.has_liked ? "text-primary" : ""}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  <span>{review.likes_count}</span>
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48" align="end">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Report review</p>
                      <p className="text-xs text-muted-foreground">
                        Flag this review for inappropriate content
                      </p>
                      <Button size="sm" className="w-full mt-2">
                        Report
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardFooter>
            </Card>
          ))
        )}

        {!loading && hasMore && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More Reviews"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
