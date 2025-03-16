import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FieldValues } from "react-hook-form";
import * as z from "zod";
import { toast } from "@/components/ui/use-toast";
import { useShelf } from "@/lib/hooks/use-shelf";
import { useAuth } from "@/lib/context/AuthContext";
import api from "@/lib/api";

const mediaTypes = [
  { value: "Books", label: "Books" },
  { value: "Movies", label: "Movies" },
  { value: "TV Shows", label: "TV Shows" },
  { value: "Articles", label: "Articles" },
] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  mediaType: z.enum(["Books", "Movies", "TV Shows", "Articles"]),
  description: z.string().max(500, "Description is too long").optional(),
  isPrivate: z.boolean().default(false),
  hasCollaborators: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateShelfDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { getUserShelves } = useShelf();
  const { isAuthenticated } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isPrivate: false,
      hasCollaborators: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!isAuthenticated) {
      toast({
        title: "Error",
        description: "Please sign in to create a shelf list",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Call the backend API to create the shelf
      await api.post("/api/shelves/custom", {
        name: data.name,
        media_type: data.mediaType,
        description: data.description,
        is_private: data.isPrivate,
        has_collaborators: data.hasCollaborators,
      });

      toast({
        title: "Success",
        description: "Shelf list created successfully!",
      });

      // Refresh the shelves data
      getUserShelves(data.mediaType);
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error creating shelf:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.detail ||
          "Failed to create shelf list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create New Shelf List
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Shelf List</DialogTitle>
          <DialogDescription>
            Create a new list to organize your media. You can add items to it
            later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }: { field: FieldValues }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Favorite Books" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your list a descriptive name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mediaType"
              render={({ field }: { field: FieldValues }) => (
                <FormItem>
                  <FormLabel>Media Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a media type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mediaTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose which tab this list will appear in
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }: { field: FieldValues }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A collection of my all-time favorites..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add a description to help others understand your list
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }: { field: FieldValues }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Private List</FormLabel>
                    <FormDescription>
                      Only you can see private lists
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hasCollaborators"
              render={({ field }: { field: FieldValues }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Allow Collaborators
                    </FormLabel>
                    <FormDescription>
                      Let others add to your list
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create List"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
