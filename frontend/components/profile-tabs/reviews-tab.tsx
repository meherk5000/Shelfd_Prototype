import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface ReviewsTabProps {
  sortBy: string
}

export function ReviewsTab({ sortBy }: ReviewsTabProps) {
  const reviews = [
    {
      id: 1,
      title: "My Dark Vanessa",
      author: "Kate Elizabeth Russell",
      rating: 3.5,
      date: "18w",
      username: "MeherK",
      userAvatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 2,
      title: "Frankenstein",
      author: "Mary Shelley",
      rating: 4,
      date: "18w",
      username: "MeherK",
      userAvatar: "/placeholder.svg?height=40&width=40",
    },
    // Add more reviews as needed
  ]

  return (
    <div className="grid grid-cols-1 gap-4 mt-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-start space-x-4">
              <Avatar>
                <AvatarImage src={review.userAvatar} alt={review.username} />
                <AvatarFallback>{review.username.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center">
                  <CardTitle className="text-sm font-medium mr-2">{review.username}</CardTitle>
                  <span className="text-xs text-muted-foreground">@{review.username.toLowerCase()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{review.date}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <h3 className="text-sm font-semibold">
                {review.title} by {review.author}
              </h3>
              <div className="flex items-center mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(review.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm mt-2">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc bibendum scelerisque magna, sed semper
              ligula pretium quis...
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

