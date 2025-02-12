import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const posts = [
  {
    id: 1,
    user: { name: "YusraK", avatar: "/placeholder.svg?height=48&width=48" },
    date: "15 Dec",
    type: "review",
    content: {
      title: "Wuthering Heights",
      author: "Emily Brontë",
      rating: 3.5,
      text: "Wuthering Heights by Emily Brontë is an astonishingly powerful and haunting tale of love, obsession, and revenge. Set on the isolated Yorkshire moors, the novel is a whirlwind of raw emotion and complex characters. The narrative follows Heathcliff and Catherine Earnshaw, whose passionate, destructive relationship shapes the lives of everyone around them. The characters...",
    },
    stats: { likes: 30, comments: 5, shares: 0 },
  },
  {
    id: 2,
    user: { name: "YusraK", avatar: "/placeholder.svg?height=48&width=48" },
    date: "12 Dec",
    type: "review",
    content: {
      title: "Howl's Moving Castle",
      author: "Diana Wynne Jones",
      rating: 5.0,
      text: "Howl's Moving Castle by Diana Wynne Jones is an absolute gem of a fantasy novel that blends whimsical adventure, deep character development, and a strong sense of magic. From the moment Sophie, the protagonist, is cursed by a wicked witch and transformed into an old woman, the story takes readers on a whirlwind journey of self-discovery, love, and the untangling of mysteries. The ...",
    },
    stats: { likes: 12, comments: 1, shares: 1 },
  },
  {
    id: 3,
    user: { name: "AmbrinSK", avatar: "/placeholder.svg?height=48&width=48" },
    date: "12 Dec",
    type: "post",
    content: {
      text: "I. Love. This. Show. OMG!!!!",
      media: { title: "Arcane", image: "/placeholder.svg?height=200&width=300" },
    },
    stats: { likes: 100, comments: 25, shares: 2 },
  },
]

export function Feed() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {posts.map((post) => (
        <article key={post.id} className="bg-card border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={post.user.avatar || "/placeholder.svg"}
                alt={post.user.name}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{post.user.name}</h3>
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                </div>
                {post.type === "review" && (
                  <div className="text-sm text-muted-foreground">
                    <span>
                      Reviewed {post.content.title} by {post.content.author}
                    </span>
                    {post.content.rating && (
                      <span className="ml-2 text-yellow-500">{"★".repeat(Math.floor(post.content.rating))}</span>
                    )}
                  </div>
                )}
                {post.type === "post" && post.content.media && (
                  <div className="text-sm text-muted-foreground">
                    <span>Posted about {post.content.media.title}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                Follow +
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Report</DropdownMenuItem>
                  <DropdownMenuItem>Block</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="mb-4">{post.content.text}</p>
          {post.content.media && (
            <img
              src={post.content.media.image || "/placeholder.svg"}
              alt={post.content.media.title}
              className="rounded-lg mb-4 max-w-full h-auto"
            />
          )}
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" className="gap-2">
              <Heart className="w-4 h-4" />
              {post.stats.likes}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              {post.stats.comments}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Repeat2 className="w-4 h-4" />
              {post.stats.shares}
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}

