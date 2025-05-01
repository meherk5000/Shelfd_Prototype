import { Button } from "@/components/ui/button";
import { useShelf, ShelfStatus } from "@/lib/hooks/use-shelf";
import { useAuth } from "@/lib/context/AuthContext";
import { toast } from "sonner";
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

  const handleDialogComplete = async () => {
    console.log("[ShelfButton] handleDialogComplete called");
    if (pendingFinishStatus) {
      console.log(
        "[ShelfButton] Pending status found, calling completeAddToShelf..."
      );
      // Await the completion of the shelf update
      await completeAddToShelf(pendingFinishStatus, pendingShelfId);
      console.log(
        "[ShelfButton] completeAddToShelf finished. Resetting state."
      );
      // Remove the explicit call to onShelfUpdated. Rely on state changes from
      // completeAddToShelf/useShelf to trigger updates on the details page.
      // if (onShelfUpdated) {
      //   console.log("[ShelfButton] Calling onShelfUpdated...");
      //   onShelfUpdated();
      //   console.log("[ShelfButton] onShelfUpdated finished.");
      // }

      // Reset pending state AFTER potentially triggering updates
      setPendingFinishStatus(null);
      setPendingShelfId(undefined);
    } else {
      console.log(
        "[ShelfButton] No pending status found in handleDialogComplete"
      );
    }
  };

  const completeAddToShelf = async (
    status: ShelfStatus | string,
    shelfId?: string
  ) => {
    console.log(
      `[ShelfButton] completeAddToShelf called with status: ${status}, shelfId: ${shelfId}`
    );
    try {
      const result = await addToShelf(mediaType, status, item, shelfId);

      toast.success(result.message || "Item added successfully!");
      console.log("[ShelfButton] completeAddToShelf SUCCESS");

      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
      if (!shelfId) {
        setSelectedStatus(status as ShelfStatus);
      }
    } catch (error: any) {
      console.error(
        "[ShelfButton] Unexpected error in completeAddToShelf:",
        error
      );
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to update shelf. Please try again.";

      // --- Check if it's the specific 409 "already exists" error ---
      const isAlreadyExistsError =
        error.response?.status === 409 &&
        errorMessage.includes("is already in your");

      if (!isAlreadyExistsError) {
        // Show error toast only if it's NOT the expected 409 error
        toast.error(errorMessage);
      } else {
        // Optionally log that we are ignoring the expected 409 error
        console.log(
          "[ShelfButton] Ignoring expected 409 'already exists' error during dialog complete flow."
        );
        // *** SHOW A TOAST TO THE USER ***
        toast.error(errorMessage); // Display the specific conflict message from the backend
      }
      // --- End check ---

      console.log("[ShelfButton] completeAddToShelf FAILED:", errorMessage);
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
