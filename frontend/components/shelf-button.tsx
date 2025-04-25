import { Button } from "@/components/ui/button";
import { useShelf, ShelfStatus } from "@/lib/hooks/use-shelf";
import { useAuth } from "@/lib/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import type { MediaTypeMapping } from "@/lib/hooks/use-shelf";
import { Loader2, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AddToCustomShelfDialog } from "./add-to-custom-shelf-dialog";
import { ShelfStatusChangeDialog } from "./shelf-status-change-dialog";

interface ShelfButtonProps {
  mediaType: keyof MediaTypeMapping;
  item: {
    id: string;
    title: string;
    image_url?: string;
    creator?: string;
  };
  onShelfUpdated?: () => void;
}

export function ShelfButton({
  mediaType,
  item,
  onShelfUpdated,
}: ShelfButtonProps) {
  const { addToShelf, getCustomShelves, loading } = useShelf();
  const { isAuthenticated } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ShelfStatus>(
    mediaType === "Articles" ? ShelfStatus.SAVED : ShelfStatus.WANT_TO
  );
  const [customShelves, setCustomShelves] = useState<any[]>([]);
  const [isCustomShelfDialogOpen, setIsCustomShelfDialogOpen] = useState(false);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] =
    useState(false);
  const [pendingFinishStatus, setPendingFinishStatus] =
    useState<ShelfStatus | null>(null);
  const [pendingShelfId, setPendingShelfId] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    let mounted = true;

    const fetchCustomShelves = async () => {
      if (!isAuthenticated) return;

      try {
        const shelves = await getCustomShelves(mediaType);
        if (mounted) {
          setCustomShelves(shelves);
        }
      } catch (error) {
        console.error("Error fetching custom shelves:", error);
      }
    };

    fetchCustomShelves();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, mediaType, getCustomShelves]);

  const handleAddToShelf = async (
    status: ShelfStatus | string,
    shelfId?: string
  ) => {
    if (!isAuthenticated) {
      window.location.href = "/auth/sign-in";
      return;
    }

    // If the status is "Finished", show the rating dialog
    if (status === ShelfStatus.FINISHED) {
      setPendingFinishStatus(status as ShelfStatus);
      setPendingShelfId(shelfId);
      setIsStatusChangeDialogOpen(true);
      return;
    }

    // Otherwise, proceed with adding to shelf
    await completeAddToShelf(status, shelfId);
  };

  const completeAddToShelf = async (
    status: ShelfStatus | string,
    shelfId?: string
  ) => {
    try {
      const result = await addToShelf(mediaType, status, item, shelfId);

      if (!result.success) {
        toast({
          title: "Action Failed",
          description: result.message || "An unknown error occurred.",
          variant: "destructive",
        });
        return;
      }

      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
      if (!shelfId) {
        setSelectedStatus(status as ShelfStatus);
      }

      toast({
        title: "Success!",
        description: result.message,
      });

      if (onShelfUpdated) {
        onShelfUpdated();
      }
    } catch (error: any) {
      console.error("Unexpected error in completeAddToShelf:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDialogComplete = () => {
    // After rating dialog is closed, complete the shelf addition
    if (pendingFinishStatus) {
      completeAddToShelf(pendingFinishStatus, pendingShelfId);
      setPendingFinishStatus(null);
      setPendingShelfId(undefined);
    }
  };

  const handleAddToCustomShelf = async (shelfId: string) => {
    await handleAddToShelf("", shelfId);
  };

  const getStatusLabel = (status: ShelfStatus): string => {
    if (mediaType === "Books") {
      switch (status) {
        case ShelfStatus.WANT_TO:
          return "Want to Read";
        case ShelfStatus.CURRENT:
          return "Currently Reading";
        case ShelfStatus.FINISHED:
          return "Finished";
        case ShelfStatus.DNF:
          return "Did Not Finish";
        default:
          return "Want to Read";
      }
    } else if (mediaType === "Movies" || mediaType === "TV Shows") {
      switch (status) {
        case ShelfStatus.WANT_TO:
          return "Want to Watch";
        case ShelfStatus.CURRENT:
          return "Currently Watching";
        case ShelfStatus.FINISHED:
          return "Finished";
        case ShelfStatus.DNF:
          return "Did Not Finish";
        default:
          return "Want to Watch";
      }
    } else {
      // Articles
      switch (status) {
        case ShelfStatus.SAVED:
          return "Save";
        case ShelfStatus.FINISHED:
          return "Finished";
        default:
          return "Save";
      }
    }
  };

  const getMenuItems = () => {
    if (mediaType === "Books") {
      return [
        { status: ShelfStatus.WANT_TO, label: "Want to Read" },
        { status: ShelfStatus.CURRENT, label: "Currently Reading" },
        { status: ShelfStatus.FINISHED, label: "Finished" },
        { status: ShelfStatus.DNF, label: "Did Not Finish" },
      ];
    } else if (mediaType === "Movies" || mediaType === "TV Shows") {
      return [
        { status: ShelfStatus.WANT_TO, label: "Want to Watch" },
        { status: ShelfStatus.CURRENT, label: "Currently Watching" },
        { status: ShelfStatus.FINISHED, label: "Finished" },
        { status: ShelfStatus.DNF, label: "Did Not Finish" },
      ];
    } else {
      return [
        { status: ShelfStatus.SAVED, label: "Save" },
        { status: ShelfStatus.FINISHED, label: "Finished" },
      ];
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={loading || isAdded}
            className={cn(
              "w-[200px] transition-all duration-200 flex items-center justify-between",
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
              <>
                <span>{getStatusLabel(selectedStatus)}</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {getMenuItems().map(({ status, label }) => (
            <DropdownMenuItem
              key={status}
              onClick={() => handleAddToShelf(status)}
            >
              {label}
            </DropdownMenuItem>
          ))}

          {customShelves.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsCustomShelfDialogOpen(true)}
              >
                Add to shelf list...
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AddToCustomShelfDialog
        isOpen={isCustomShelfDialogOpen}
        onClose={() => setIsCustomShelfDialogOpen(false)}
        onAddToShelf={handleAddToCustomShelf}
        mediaType={mediaType}
      />

      <ShelfStatusChangeDialog
        open={isStatusChangeDialogOpen}
        onOpenChange={setIsStatusChangeDialogOpen}
        mediaId={item.id}
        mediaType={mediaType}
        mediaTitle={item.title}
        mediaImage={item.image_url}
        mediaCreator={item.creator}
        onComplete={handleDialogComplete}
      />
    </>
  );
}
