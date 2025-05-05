/**
 * ShelfButton Component
 *
 * This component provides a button with a dropdown menu to add media items
 * (books, movies, TV shows, articles) to different shelves or lists.
 * It handles the UI for adding items to default shelf status categories and custom shelves.
 */

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

// Props definition for the component
interface ShelfButtonProps {
  mediaType: keyof MediaTypeMapping; // Type of media (Books, Movies, TV Shows, Articles)
  item: {
    // Media item information
    id: string;
    title: string;
    image_url?: string;
    creator?: string;
  };
  onShelfUpdated?: () => void; // Optional callback for after a shelf is updated
}

export function ShelfButton({
  mediaType,
  item,
  onShelfUpdated,
}: ShelfButtonProps) {
  // Custom hook for shelf operations
  const { addToShelf, getCustomShelves, loading } = useShelf();
  const { isAuthenticated } = useAuth();

  // State management
  const [isAdded, setIsAdded] = useState(false); // Success state for UI feedback

  // Default selected status based on media type (articles use "SAVED", others use "WANT_TO")
  const [selectedStatus, setSelectedStatus] = useState<ShelfStatus>(
    mediaType === "Articles" ? ShelfStatus.SAVED : ShelfStatus.WANT_TO
  );

  // State for custom shelves
  const [customShelves, setCustomShelves] = useState<any[]>([]);
  const [isCustomShelfDialogOpen, setIsCustomShelfDialogOpen] = useState(false);

  // State for status change dialog (used for "Finished" status to capture ratings)
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] =
    useState(false);
  const [pendingFinishStatus, setPendingFinishStatus] =
    useState<ShelfStatus | null>(null);
  const [pendingShelfId, setPendingShelfId] = useState<string | undefined>(
    undefined
  );

  // Fetch custom shelves when component mounts or auth state changes
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

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, mediaType, getCustomShelves]);

  /**
   * Handle adding an item to a shelf
   * This function determines whether to show the rating dialog (for finished items)
   * or proceed directly with adding to the shelf
   */
  const handleAddToShelf = async (
    status: ShelfStatus | string,
    shelfId?: string
  ) => {
    // Redirect to sign-in if user is not authenticated
    if (!isAuthenticated) {
      window.location.href = "/auth/sign-in";
      return;
    }

    // If the status is "Finished", show the rating dialog first
    if (status === ShelfStatus.FINISHED) {
      setPendingFinishStatus(status as ShelfStatus);
      setPendingShelfId(shelfId);
      setIsStatusChangeDialogOpen(true);
      return;
    }

    // Otherwise, proceed with adding to shelf directly
    await completeAddToShelf(status, shelfId);
  };

  /**
   * Handle completion of the rating dialog
   * This is called after the user submits their rating or closes the dialog
   */
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
      // Note: Previously had an explicit call to onShelfUpdated, now removed
      // and relying on state changes from completeAddToShelf/useShelf instead

      // Reset pending state AFTER potentially triggering updates
      setPendingFinishStatus(null);
      setPendingShelfId(undefined);
    } else {
      console.log(
        "[ShelfButton] No pending status found in handleDialogComplete"
      );
    }
  };

  /**
   * Core function to add an item to a shelf
   * Makes the API call and handles success/error states
   */
  const completeAddToShelf = async (
    status: ShelfStatus | string,
    shelfId?: string
  ) => {
    console.log(
      `[ShelfButton] completeAddToShelf called with status: ${status}, shelfId: ${shelfId}`
    );
    try {
      // Make API call through useShelf hook
      const result = await addToShelf(mediaType, status, item, shelfId);

      // Show success message
      toast.success(result.message || "Item added successfully!");
      console.log("[ShelfButton] completeAddToShelf SUCCESS");

      // Update UI to show success state
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);

      // Update selected status for default shelves
      if (!shelfId) {
        setSelectedStatus(status as ShelfStatus);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to update shelf. Please try again.";

      // Check if it's the specific 409 "already exists" error
      const isAlreadyExistsError =
        error.response?.status === 409 &&
        errorMessage.includes("is already in your");

      if (!isAlreadyExistsError) {
        // Log the full error only if it's not the expected 409 error
        console.error(
          "[ShelfButton] Unexpected error in completeAddToShelf:",
          error
        );
        // Show error toast for unexpected errors
        toast.error(errorMessage);
      } else {
        // Log that we've encountered the expected 409 error
        console.log(
          "[ShelfButton] Ignoring expected 409 'already exists' error during dialog complete flow."
        );
        // Show a toast with the specific conflict message from the backend
        toast.error(errorMessage);
      }
      console.log("[ShelfButton] completeAddToShelf FAILED:", errorMessage);
    }
  };

  /**
   * Handler for adding an item to a custom shelf
   * Custom shelves use a shelfId rather than a status
   */
  const handleAddToCustomShelf = async (shelfId: string) => {
    await handleAddToShelf("", shelfId);
  };

  /**
   * Get the display label for each shelf status
   * Labels change based on media type (e.g., "Want to Read" for books vs "Want to Watch" for movies)
   */
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
      // Articles have different status options
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

  /**
   * Get the appropriate menu items based on media type
   * Different media types have different shelf categories
   */
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
      {/* Main dropdown button for shelf selection */}
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
              // Loading state with spinner
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </div>
            ) : isAdded ? (
              // Success state with checkmark
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Added!
              </div>
            ) : (
              // Default state showing selected shelf status
              <>
                <span>{getStatusLabel(selectedStatus)}</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        {/* Dropdown menu with shelf options */}
        <DropdownMenuContent align="end" className="w-[200px]">
          {getMenuItems().map(({ status, label }) => (
            <DropdownMenuItem
              key={status}
              onClick={() => handleAddToShelf(status)}
            >
              {label}
            </DropdownMenuItem>
          ))}

          {/* Show option for custom shelves if any exist */}
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

      {/* Dialog for selecting a custom shelf */}
      <AddToCustomShelfDialog
        isOpen={isCustomShelfDialogOpen}
        onClose={() => setIsCustomShelfDialogOpen(false)}
        onAddToShelf={handleAddToCustomShelf}
        mediaType={mediaType}
      />

      {/* Dialog for marking an item as finished (includes rating) */}
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
