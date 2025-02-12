import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface LikesTabProps {
  sortBy: string
}

export function LikesTab({ sortBy }: LikesTabProps) {
  const likes = [
    {
      id: 1,
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      date: "18w",
      username: "YusraK",
      userAvatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 2,
      content: "Nunc bibendum scelerisque magna, sed semper ligula pretium quis...",
      date: "1w",
      username: "AmbrinSK",
      userAvatar: "/placeholder.svg?height=40&width=40",
    },
    // Add more liked posts as needed
  ]

  return (
    <div className="grid grid-cols-1 gap-4 mt-4">
      {likes.map((like) => (
        <Card key={like.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-start space-x-4">
              <Avatar>
                <AvatarImage src={like.userAvatar} alt={like.username} />
                <AvatarFallback>{like.username.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center">
                  <CardTitle className="text-sm font-medium mr-2">{like.username}</CardTitle>
                  <span className="text-xs text-muted-foreground">@{like.username.toLowerCase()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{like.date}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{like.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

