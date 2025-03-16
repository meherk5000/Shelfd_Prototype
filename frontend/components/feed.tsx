import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCurrentMedia } from "@/components/user-current-media";
import { useAuth } from "@/lib/context/AuthContext";

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
      media: {
        title: "Arcane",
        image: "/placeholder.svg?height=200&width=300",
      },
    },
    stats: { likes: 100, comments: 25, shares: 2 },
  },
];

export function Feed() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="w-full">{isAuthenticated && <UserCurrentMedia />}</div>
  );
}
