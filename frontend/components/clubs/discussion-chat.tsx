"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async () => {
    try {
      setError(null);
      const fetchedMessages = await getMessages(clubId);
      setMessages(fetchedMessages);
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
            setTimeout(() => void loadMessages(), 2000);
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
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const message = await createMessage(clubId, {
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      toast.success("Message sent!");
      scrollToBottom();

      // Reset error state if message sends successfully
      setError(null);
      setRetryCount(0);
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof Error) {
        if (error.message === "Not authenticated") {
          toast.error("Please log in to send messages");
          router.push("/login");
        } else {
          toast.error("Failed to send message. Please try again.");
        }
      }
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
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
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
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
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
