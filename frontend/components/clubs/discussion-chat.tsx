"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import {
  createMessage,
  getMessages,
  MessageResponse,
} from "@/services/club-messages";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DiscussionChatProps {
  clubId: string;
  isMember: boolean;
}

export function DiscussionChat({ clubId, isMember }: DiscussionChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  type ScrollCallback = () => void;
  const scrollToBottom = useCallback((callback?: ScrollCallback) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      if (callback) callback();
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setError(null);
      const fetchedMessages = await getMessages(clubId);
      // Sort messages by created_at in ascending order (oldest first)
      const sortedMessages = [...fetchedMessages].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sortedMessages);
      // Reset retry count on successful load
      setRetryCount(0);
    } catch (error) {
      console.error("Error loading messages:", error);
      setError("Failed to load messages");

      if (error instanceof Error) {
        if (error.message === "Not authenticated") {
          toast.error("Please log in to view messages");
          router.push("/login");
        } else {
          // Increment retry count and show error
          setRetryCount((prev) => prev + 1);
          if (retryCount < 3) {
            toast.error(
              `Failed to load messages. Retrying... (Attempt ${
                retryCount + 1
              }/3)`
            );
            // Try again after a short delay
            const retryFn = () => loadMessages();
            setTimeout(retryFn, 2000);
          } else {
            toast.error(
              "Failed to load messages after multiple attempts. Please try refreshing the page."
            );
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [clubId, retryCount, router]);

  useEffect(() => {
    loadMessages();

    // Set up polling for new messages
    pollIntervalRef.current = setInterval(() => {
      // Only poll if there's no error
      if (!error) {
        loadMessages();
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [clubId, error, loadMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom(() => {});
  }, [messages, scrollToBottom]);

  const formatTimestamp = (dateString: string) => {
    try {
      // Parse the UTC date string
      const utcDate = parseISO(dateString);

      // Convert to local timezone
      const localDate = utcToZonedTime(
        utcDate,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );

      const now = new Date();
      const isToday = localDate.toDateString() === now.toDateString();

      if (isToday) {
        // Show time like "8:10 PM"
        return format(localDate, "h:mm a");
      } else {
        // Show date and time like "Apr 18, 8:10 PM"
        return format(localDate, "MMM d, h:mm a");
      }
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return dateString; // Fallback to original string if parsing fails
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const messageContent = newMessage;
    setNewMessage("");

    try {
      // Check if we have a token
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to send messages");
        router.push("/login");
        return;
      }

      console.log("Attempting to send message:", {
        clubId,
        content: messageContent,
        hasToken: !!token,
      });

      await createMessage(clubId, { content: messageContent });
      console.log("Message sent successfully");
      await loadMessages();
      scrollToBottom(() => {});
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof Error) {
        if (error.message === "Not authenticated") {
          toast.error("Please log in to send messages");
          router.push("/login");
        } else {
          console.error("Detailed error:", {
            message: error.message,
            stack: error.stack,
            clubId,
            isMember,
          });
          toast.error(`Failed to send message: ${error.message}`);
        }
      } else {
        toast.error("Failed to send message. Please try again.");
      }
      // Restore the message if sending failed
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error && retryCount >= 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
        <p className="text-red-500">{error}</p>
        <Button
          onClick={() => {
            setRetryCount(0);
            setError(null);
            loadMessages();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Club Discussion</h3>
        {error && retryCount < 3 && (
          <p className="text-sm text-red-500">
            Retrying... ({retryCount + 1}/3)
          </p>
        )}
      </div>

      <Card className="p-4">
        <div
          ref={messagesContainerRef}
          className="space-y-4 max-h-[500px] overflow-y-auto"
        >
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.author_username?.substring(0, 2).toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {message.author_username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.created_at)}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{message.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {isMember ? (
          <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!!(isSending || (error && retryCount >= 3))}
            />
            <Button
              type="submit"
              disabled={
                !!(
                  isSending ||
                  !newMessage.trim() ||
                  (error && retryCount >= 3)
                )
              }
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        ) : (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Join the club to participate in the discussion
          </div>
        )}
      </Card>
    </div>
  );
}
