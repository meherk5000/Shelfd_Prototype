"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation"; // Use useParams for client components
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext"; // Corrected import path
import { API_BASE_URL } from "@/lib/config"; // Import API base URL

// Define types (adjust based on your actual API response)
interface ThreadMessage {
  id: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  created_at: string;
}

interface ThreadDetails {
  id: string;
  title: string;
  club_id: string; // Need club_id to link back
  // Add other relevant thread details if needed (e.g., creator, is_locked)
}

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = params.threadId as string; // Get threadId from URL

  const [thread, setThread] = useState<ThreadDetails | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessageContent, setNewMessageContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const { user } = useAuth(); // Get current user info

  useEffect(() => {
    if (threadId) {
      loadThreadDetails();
      loadMessages();
    }
  }, [threadId]);

  const loadThreadDetails = async () => {
    // TODO: Implement actual API call to fetch thread details
    // For now, simulate loading and set dummy data
    // setIsLoading(true); // Loading starts here, ends in loadMessages
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required to view threads.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch thread details");
      }
      setThread(data); // Assuming API returns ThreadDetails structure
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load thread details"
      );
      toast.error("Failed to load thread details.");
      setThread(null); // Clear thread on error
    } finally {
      // setIsLoading(false); // Loading finishes when messages are also loaded
    }
  };

  const loadMessages = async () => {
    // TODO: Implement actual API call to fetch messages for the thread
    setIsLoading(true); // Keep loading until messages are fetched
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      // Error should be set by loadThreadDetails, but double-check
      setError("Authentication required.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/threads/${threadId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch messages");
      }
      // Assuming API returns { messages: ThreadMessage[] } or just ThreadMessage[]
      setMessages(Array.isArray(data) ? data : data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
      toast.error("Failed to load messages.");
      setMessages([]);
    } finally {
      setIsLoading(false); // Loading finishes here
    }
  };

  const handlePostMessage = async () => {
    if (!newMessageContent.trim() || !threadId || !user) {
      toast.error("Message cannot be empty.");
      return;
    }
    setIsPosting(true);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required to post messages.");
      setIsPosting(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/threads/${threadId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: newMessageContent }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to post message");
      }

      // Assuming the API returns the newly created message object
      const postedMessage = data;

      setMessages((prev) => [...prev, postedMessage]); // Add to list
      setNewMessageContent(""); // Clear textarea
      toast.success("Message posted!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post message");
      toast.error("Failed to post message.");
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-destructive">
          Error Loading Thread
        </h2>
        <p className="text-muted-foreground mb-4">
          {error || "Could not load the thread details or messages."}
        </p>
        <Button variant="outline" asChild>
          <Link href="/clubs">Back to Clubs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-[900px] mx-auto space-y-6">
      {/* Back Link and Title */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clubs/${thread.club_id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold truncate">{thread.title}</h1>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {messages.map((message) => (
          <Card key={message.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 bg-muted/30 p-3 border-b">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={message.author.avatar}
                  alt={message.author.username}
                />
                <AvatarFallback>
                  {message.author.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{message.author.username}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 text-sm whitespace-pre-wrap">
              {message.content}
            </CardContent>
          </Card>
        ))}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            No messages in this thread yet. Be the first to post!
          </div>
        )}
      </div>

      {/* Post Message Form */}
      {user && ( // Only show if user is logged in
        <Card>
          <CardHeader className="p-3 border-b">
            <p className="text-sm font-medium">Post a reply</p>
          </CardHeader>
          <CardContent className="p-4">
            <Textarea
              placeholder="Write your message here..."
              value={newMessageContent}
              onChange={(e) => setNewMessageContent(e.target.value)}
              rows={4}
              className="mb-3"
              disabled={isPosting}
            />
          </CardContent>
          <CardFooter className="p-3 border-t flex justify-end">
            <Button
              onClick={handlePostMessage}
              disabled={isPosting || !newMessageContent.trim()}
            >
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...
                </>
              ) : (
                "Post Message"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
