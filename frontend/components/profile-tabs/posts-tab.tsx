import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface PostsTabProps {
  sortBy: string
}

export function PostsTab({ sortBy }: PostsTabProps) {
  const posts = [
    {
      id: 1,
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      date: "18w",
      username: "MeherK",
      userAvatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 2,
      content: "Nunc bibendum scelerisque magna, sed semper ligula pretium quis...",
      date: "18w",
      username: "MeherK",
      userAvatar: "/placeholder.svg?height=40&width=40",
    },
    // Add more posts as needed
  ]

  return (
    <div className="grid grid-cols-1 gap-4 mt-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-start space-x-4">
              <Avatar>
                <AvatarImage src={post.userAvatar} alt={post.username} />
                <AvatarFallback>{post.username.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center">
                  <CardTitle className="text-sm font-medium mr-2">{post.username}</CardTitle>
                  <span className="text-xs text-muted-foreground">@{post.username.toLowerCase()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{post.date}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{post.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

