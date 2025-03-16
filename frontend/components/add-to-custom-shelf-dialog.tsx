import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShelf } from "@/lib/hooks/use-shelf";
import { useState, useEffect } from "react";
import type { MediaTypeMapping } from "@/lib/hooks/use-shelf";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomShelf {
  _id: string;
  name: string;
  media_type: string;
}

interface AddToCustomShelfDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToShelf: (shelfId: string) => Promise<void>;
  mediaType: keyof MediaTypeMapping;
}

export function AddToCustomShelfDialog({
  isOpen,
  onClose,
  onAddToShelf,
  mediaType,
}: AddToCustomShelfDialogProps) {
  const { getCustomShelves } = useShelf();
  const [customShelves, setCustomShelves] = useState<CustomShelf[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchShelves = async () => {
      try {
        const shelves = await getCustomShelves(mediaType);
        setCustomShelves(shelves);
      } catch (error) {
        console.error("Error fetching custom shelves:", error);
      }
    };

    if (isOpen) {
      fetchShelves();
    }
  }, [isOpen, mediaType, getCustomShelves]);

  const handleAddToShelf = async (shelfId: string) => {
    setLoading(true);
    try {
      await onAddToShelf(shelfId);
      onClose();
    } catch (error) {
      console.error("Error adding to shelf:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Custom Shelf</DialogTitle>
          <DialogDescription>
            Choose a custom shelf to add this item to
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[300px] pr-4">
          {customShelves.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No custom shelves found. Create a new shelf to add items.
            </p>
          ) : (
            <div className="space-y-4">
              {customShelves.map((shelf) => (
                <Button
                  key={shelf._id}
                  variant="outline"
                  className="w-full justify-start text-left"
                  disabled={loading}
                  onClick={() => handleAddToShelf(shelf._id)}
                >
                  {shelf.name}
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
