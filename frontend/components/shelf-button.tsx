import { Button } from "@/components/ui/button";
import { useShelf, ShelfStatus } from "@/lib/hooks/use-shelf";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import type { MediaTypeMapping } from "@/lib/hooks/use-shelf";
import { Loader2, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ShelfButtonProps {
  mediaType: keyof MediaTypeMapping;
  item: {
    id: string;
    title: string;
    image_url?: string;
    creator?: string;
  };
}

export function ShelfButton({ mediaType, item }: ShelfButtonProps) {
  const { addToShelf, loading } = useShelf();
  const { isAuthenticated } = useAuth();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToShelf = async (status: ShelfStatus) => {
    if (!isAuthenticated) {
      window.location.href = "/auth/sign-in";
      return;
    }

    try {
      const result = await addToShelf(mediaType, status, item);
      if (!result.success) {
        toast({
          title: "Already in Shelf",
          description: `${
            item.title
          } is already in your ${mediaType.toLowerCase()} shelf.`,
          variant: "default",
        });
        return;
      }

      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);

      toast({
        title: "Success!",
        description: `${
          item.title
        } has been added to your ${mediaType.toLowerCase()} shelf.`,
      });
    } catch (error: any) {
      console.error("Failed to add to shelf:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.detail ||
          "Failed to add to shelf. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      onClick={() => handleAddToShelf(ShelfStatus.WANT_TO)}
      disabled={loading || isAdded}
      className={cn(
        "w-[200px] transition-all duration-200",
        isAdded
          ? "bg-green-500 text-white hover:bg-green-600"
          : "bg-[#FDF7E4] text-black hover:bg-[#F5EDD7]"
      )}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding...
        </div>
      ) : isAdded ? (
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          Added!
        </div>
      ) : (
        "Want to Read"
      )}
    </Button>
  );
}
