"use client";

import { useState } from "react";
import {
  Search,
  X,
  MoreHorizontal,
  Paperclip,
  Send,
  Image as ImageIcon,
  Smile,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  lastSeen?: Date;
  isOnline?: boolean;
}

interface Message {
  id: string;
  sender: User;
  content: string;
  timestamp: Date;
  isRead: boolean;
  isSent: boolean;
}

interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup?: boolean;
  name?: string;
}

// Mock data
const currentUser: User = {
  id: "current",
  name: "Current User",
  username: "currentuser",
  avatar: "/placeholder-user.jpg",
  isOnline: true,
};

// Add Dustin to the mock users
const dustinBot: User = {
  id: "dustin",
  name: "Dustin",
  username: "dustin",
  avatar: "/dustin.png",
  isOnline: true,
};

const mockUsers: User[] = [
  {
    id: "user1",
    name: "Jane Smith",
    username: "janesmith",
    avatar: "/placeholder-avatar.jpg",
    lastSeen: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
    isOnline: true,
  },
  {
    id: "user2",
    name: "Alex Johnson",
    username: "alexj",
    avatar: "/placeholder-avatar2.jpg",
    lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    isOnline: false,
  },
  {
    id: "user3",
    name: "Maria García",
    username: "mariagarcia",
    avatar: "/placeholder-avatar3.jpg",
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    isOnline: false,
  },
  {
    id: "user4",
    name: "John Doe",
    username: "johndoe",
    avatar: "/placeholder-avatar4.jpg",
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isOnline: false,
  },
  {
    id: "user5",
    name: "Sarah Wilson",
    username: "sarahw",
    avatar: "/placeholder-avatar5.jpg",
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    isOnline: true,
  },
];

// Create a default Dustin conversation
const dustinConversation: Conversation = {
  id: "dustin-conv",
  participants: [dustinBot],
  lastMessage: {
    id: "dustin-msg-last",
    sender: dustinBot,
    content: "How can I help you discover new books and movies today?",
    timestamp: new Date(),
    isRead: true,
    isSent: true,
  },
  unreadCount: 0,
};

const mockConversations: Conversation[] = [
  dustinConversation,
  {
    id: "conv1",
    participants: [mockUsers[0]],
    lastMessage: {
      id: "msg1",
      sender: mockUsers[0],
      content: "Looking forward to discussing that book next week!",
      timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 min ago
      isRead: true,
      isSent: true,
    },
    unreadCount: 0,
  },
  {
    id: "conv2",
    participants: [mockUsers[1]],
    lastMessage: {
      id: "msg2",
      sender: mockUsers[1],
      content: "Have you watched the latest episode yet?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      isRead: false,
      isSent: true,
    },
    unreadCount: 2,
  },
  {
    id: "conv3",
    participants: [mockUsers[2]],
    lastMessage: {
      id: "msg3",
      sender: currentUser,
      content:
        "I added that movie to my watchlist. Thanks for the recommendation!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      isRead: true,
      isSent: true,
    },
    unreadCount: 0,
  },
  {
    id: "conv4",
    isGroup: true,
    name: "Book Club",
    participants: [mockUsers[0], mockUsers[1], mockUsers[3]],
    lastMessage: {
      id: "msg4",
      sender: mockUsers[3],
      content: "What's everyone reading this month?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      isRead: true,
      isSent: true,
    },
    unreadCount: 0,
  },
  {
    id: "conv5",
    isGroup: true,
    name: "Movie Night",
    participants: [mockUsers[1], mockUsers[2], mockUsers[4]],
    lastMessage: {
      id: "msg5",
      sender: mockUsers[4],
      content: "Let's watch the new Wes Anderson film this weekend!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      isRead: false,
      isSent: true,
    },
    unreadCount: 3,
  },
];

// Add Dustin welcome messages
const dustinMessages: Message[] = [
  {
    id: "dustin-msg1",
    sender: dustinBot,
    content: "👋 Hi there! I'm Dustin, your media discovery assistant.",
    timestamp: new Date(Date.now() - 1000 * 60), // 1 minute ago
    isRead: true,
    isSent: true,
  },
  {
    id: "dustin-msg2",
    sender: dustinBot,
    content:
      "I can help you find new books, movies, TV shows, and articles based on your interests.",
    timestamp: new Date(Date.now() - 1000 * 40), // 40 seconds ago
    isRead: true,
    isSent: true,
  },
  {
    id: "dustin-msg3",
    sender: dustinBot,
    content: "How can I help you discover new books and movies today?",
    timestamp: new Date(), // now
    isRead: true,
    isSent: true,
  },
];

const mockMessages: Record<string, Message[]> = {
  "dustin-conv": dustinMessages,
  conv1: [
    {
      id: "conv1-1",
      sender: mockUsers[0],
      content:
        "Hi! I just finished reading 'The Midnight Library' and I loved it!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-2",
      sender: currentUser,
      content:
        "Oh nice! I've had that on my shelf for a while. What did you like about it?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23), // 23 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-3",
      sender: mockUsers[0],
      content:
        "The concept is so intriguing - imagining all the lives you could have lived if you made different choices. It really makes you think!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22), // 22 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-4",
      sender: currentUser,
      content:
        "That sounds fascinating. I'll move it to the top of my reading list!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 21), // 21 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-5",
      sender: mockUsers[0],
      content:
        "Let me know what you think when you read it. Maybe we can discuss it over coffee?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20), // 20 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-6",
      sender: currentUser,
      content: "That would be great! I'll message you when I finish it.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 19), // 19 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-7",
      sender: mockUsers[0],
      content: "Perfect! Looking forward to it.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-8",
      sender: mockUsers[0],
      content:
        "By the way, the author has another book called 'How to Stop Time' that's also really good.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-9",
      sender: currentUser,
      content: "Thanks for the recommendation! I'll check that one out too.",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv1-10",
      sender: mockUsers[0],
      content: "Looking forward to discussing that book next week!",
      timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 min ago
      isRead: true,
      isSent: true,
    },
  ],
  conv2: [
    {
      id: "conv2-1",
      sender: mockUsers[1],
      content: "Hey! Did you catch the new episode of Succession last night?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv2-2",
      sender: currentUser,
      content: "Not yet, I'm planning to watch it tonight. No spoilers please!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv2-3",
      sender: mockUsers[1],
      content:
        "Don't worry, I won't spoil anything. But prepare yourself... it's intense!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv2-4",
      sender: currentUser,
      content: "Now I'm really curious! Will message you after I watch it.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      isRead: true,
      isSent: true,
    },
    {
      id: "conv2-5",
      sender: mockUsers[1],
      content: "Have you watched the latest episode yet?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      isRead: false,
      isSent: true,
    },
    {
      id: "conv2-6",
      sender: mockUsers[1],
      content: "Let me know what you think when you do!",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      isRead: false,
      isSent: true,
    },
  ],
};

// Helper function to format time
const formatMessageTime = (date: Date) => {
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) {
    // Today, show time
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffInDays === 1) {
    // Yesterday
    return "Yesterday";
  } else if (diffInDays < 7) {
    // Within a week, show day name
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    // Older, show date
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
};

// Online status indicator component
function OnlineStatus({ isOnline }: { isOnline?: boolean }) {
  if (isOnline === undefined) return null;

  return (
    <div
      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
        isOnline ? "bg-green-500" : "bg-gray-400"
      }`}
    />
  );
}

// Main chat interface component
export function ChatInterface() {
  const [conversations, setConversations] =
    useState<Conversation[]>(mockConversations);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    "dustin-conv" // Set Dustin as the default active conversation
  );
  const [messages, setMessages] =
    useState<Record<string, Message[]>>(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    if (conv.isGroup && conv.name) {
      return conv.name.toLowerCase().includes(searchLower);
    }

    return conv.participants.some(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower)
    );
  });

  // Get the current conversation
  const currentConversation = conversations.find(
    (c) => c.id === activeConversation
  );

  // Get messages for the current conversation
  const currentMessages = activeConversation
    ? messages[activeConversation] || []
    : [];

  // Send a new message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: currentUser,
      content: newMessage,
      timestamp: new Date(),
      isRead: false,
      isSent: true,
    };

    // Update messages for the active conversation
    setMessages((prev) => ({
      ...prev,
      [activeConversation]: [...(prev[activeConversation] || []), newMsg],
    }));

    // Update the last message in the conversation list
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation
          ? { ...conv, lastMessage: newMsg, unreadCount: 0 }
          : conv
      )
    );

    // Clear the input
    setNewMessage("");
  };

  // Mark messages as read when switching conversations
  const handleSelectConversation = (convId: string) => {
    setActiveConversation(convId);

    // Mark all messages as read
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === convId ? { ...conv, unreadCount: 0 } : conv
      )
    );
  };

  return (
    <div className="h-full flex border-t bg-background overflow-hidden">
      {/* Sidebar with conversation list */}
      <div className="w-[320px] flex-shrink-0 border-r flex flex-col bg-card overflow-hidden shadow-md relative z-10">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-9 bg-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10 px-1">
            <TabsTrigger value="chats">Chats</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 relative">
            <ScrollArea className="h-[calc(100vh-190px)]">
              <div className="p-3 space-y-2">
                {filteredConversations.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground">
                    No conversations found
                  </p>
                ) : (
                  filteredConversations.map((conversation) => {
                    const isActive = conversation.id === activeConversation;
                    const otherParticipant = conversation.isGroup
                      ? null
                      : conversation.participants[0];

                    return (
                      <button
                        key={conversation.id}
                        className={`w-full flex items-start p-3 gap-3 rounded-lg transition-colors hover:bg-accent/50 ${
                          isActive ? "bg-accent" : ""
                        }`}
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar>
                            <AvatarImage
                              src={
                                conversation.isGroup
                                  ? "/placeholder-group.jpg"
                                  : otherParticipant?.avatar
                              }
                              alt={
                                conversation.isGroup
                                  ? conversation.name
                                  : otherParticipant?.name
                              }
                            />
                            <AvatarFallback>
                              {conversation.isGroup
                                ? conversation.name?.charAt(0).toUpperCase()
                                : otherParticipant?.name
                                    .charAt(0)
                                    .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {!conversation.isGroup && otherParticipant && (
                            <OnlineStatus
                              isOnline={otherParticipant.isOnline}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col items-start overflow-hidden w-[calc(100%-50px)]">
                          <div className="flex justify-between w-full">
                            <span className="font-medium truncate max-w-[150px]">
                              {conversation.isGroup
                                ? conversation.name
                                : otherParticipant?.name}
                            </span>
                            {conversation.lastMessage && (
                              <span className="text-xs text-muted-foreground flex-shrink-0 ml-1">
                                {formatMessageTime(
                                  conversation.lastMessage.timestamp
                                )}
                              </span>
                            )}
                          </div>

                          {conversation.lastMessage && (
                            <div className="flex items-center w-full mt-1 overflow-hidden">
                              <p className="text-sm text-muted-foreground truncate w-full max-w-full pr-1">
                                {conversation.lastMessage.sender.id ===
                                currentUser.id ? (
                                  <span className="inline-block mr-1 opacity-70">
                                    You:
                                  </span>
                                ) : (
                                  conversation.isGroup && (
                                    <span className="inline-block mr-1 opacity-70">
                                      {
                                        conversation.lastMessage.sender.name.split(
                                          " "
                                        )[0]
                                      }
                                      :
                                    </span>
                                  )
                                )}
                                <span className="truncate inline-block align-bottom max-w-[180px]">
                                  {conversation.lastMessage.content}
                                </span>
                              </p>

                              {conversation.unreadCount > 0 && (
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center ml-1">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contacts" className="flex-1">
            <ScrollArea className="h-[calc(100vh-190px)]">
              <div className="p-3 space-y-2">
                {mockUsers.map((user) => (
                  <button
                    key={user.id}
                    className="w-full flex items-center p-3 gap-3 rounded-lg transition-colors hover:bg-accent/50"
                    onClick={() => {
                      // Find if conversation exists
                      const existingConv = conversations.find(
                        (conv) =>
                          !conv.isGroup &&
                          conv.participants.some((p) => p.id === user.id)
                      );

                      if (existingConv) {
                        handleSelectConversation(existingConv.id);
                      } else {
                        // Create new conversation
                        const newConvId = `new-conv-${Date.now()}`;
                        const newConv: Conversation = {
                          id: newConvId,
                          participants: [user],
                          unreadCount: 0,
                        };

                        setConversations([newConv, ...conversations]);
                        setActiveConversation(newConvId);
                      }
                    }}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineStatus isOnline={user.isOnline} />
                    </div>

                    <div className="flex flex-col items-start">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        @{user.username}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden border-l">
        {activeConversation && currentConversation ? (
          <>
            {/* Chat header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-card shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={
                      currentConversation.isGroup
                        ? "/placeholder-group.jpg"
                        : currentConversation.participants[0]?.avatar
                    }
                    alt={
                      currentConversation.isGroup
                        ? currentConversation.name
                        : currentConversation.participants[0]?.name
                    }
                  />
                  <AvatarFallback>
                    {currentConversation.isGroup
                      ? currentConversation.name?.charAt(0).toUpperCase()
                      : currentConversation.participants[0]?.name
                          .charAt(0)
                          .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="font-medium text-base">
                    {currentConversation.isGroup
                      ? currentConversation.name
                      : currentConversation.participants[0]?.name}
                  </h3>
                  {!currentConversation.isGroup && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentConversation.participants[0]?.isOnline
                        ? "Online"
                        : currentConversation.participants[0]?.lastSeen
                        ? `Last seen ${formatMessageTime(
                            currentConversation.participants[0].lastSeen
                          )}`
                        : "Offline"}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View profile</DropdownMenuItem>
                    <DropdownMenuItem>Mute conversation</DropdownMenuItem>
                    <DropdownMenuItem>Clear chat</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Block user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 py-6 px-8 bg-background/50">
              <div className="space-y-8 max-w-3xl mx-auto">
                {currentMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-20">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-2 text-base">
                        No messages yet
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Start the conversation by typing a message below
                      </p>
                    </div>
                  </div>
                ) : (
                  currentMessages.map((message, index) => {
                    const isCurrentUser = message.sender.id === currentUser.id;
                    const showAvatar =
                      !isCurrentUser &&
                      (index === 0 ||
                        currentMessages[index - 1]?.sender.id !==
                          message.sender.id);

                    // Check if this is a new sender compared to previous message
                    const isNewSender =
                      index === 0 ||
                      currentMessages[index - 1]?.sender.id !==
                        message.sender.id;

                    // Add date separator logic
                    const showDateSeparator =
                      index === 0 ||
                      new Date(message.timestamp).toDateString() !==
                        new Date(
                          currentMessages[index - 1].timestamp
                        ).toDateString();

                    return (
                      <div key={message.id} className="space-y-4">
                        {showDateSeparator && (
                          <div className="flex justify-center my-8">
                            <div className="px-4 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleDateString(
                                [],
                                {
                                  weekday: "long",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </div>
                          </div>
                        )}

                        <div
                          className={`${
                            isNewSender && !isCurrentUser ? "mt-8" : ""
                          } 
                            ${!isNewSender && !isCurrentUser ? "mt-1.5" : ""}`}
                        >
                          <div
                            className={`flex items-end gap-4 ${
                              isCurrentUser ? "justify-end" : "justify-start"
                            }`}
                          >
                            {showAvatar ? (
                              <Avatar className="h-9 w-9">
                                <AvatarImage
                                  src={message.sender.avatar}
                                  alt={message.sender.name}
                                />
                                <AvatarFallback>
                                  {message.sender.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              !isCurrentUser && (
                                <div className="w-9" /> // Spacer for alignment
                              )
                            )}

                            <div
                              className={`max-w-[70%] px-5 py-3 rounded-2xl shadow-sm ${
                                isCurrentUser
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted rounded-bl-sm"
                              }`}
                            >
                              <p className="text-[15px] leading-relaxed">
                                {message.content}
                              </p>
                              <div
                                className={`text-xs mt-1.5 flex items-center gap-1 ${
                                  isCurrentUser
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatMessageTime(message.timestamp)}
                                {isCurrentUser &&
                                  (message.isRead ? (
                                    <CheckCircle2 className="h-3 w-3 ml-1" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 ml-1 opacity-50" />
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add extra padding at the bottom for scrolling space */}
              <div className="h-8"></div>
            </ScrollArea>

            {/* Message input */}
            <div className="p-5 border-t bg-card">
              <div className="flex items-center gap-3 max-w-3xl mx-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-full"
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Image
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="h-4 w-4 mr-2" />
                      Document
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 py-6 px-5 bg-muted text-base"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                >
                  <Smile className="h-5 w-5" />
                </Button>

                <Button
                  disabled={!newMessage.trim()}
                  onClick={handleSendMessage}
                  size="icon"
                  className="h-11 w-11 rounded-full"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center bg-card/50">
            <div className="text-center max-w-md p-8 rounded-lg border bg-card shadow-sm">
              <h3 className="text-xl font-medium mb-3">
                Select a conversation
              </h3>
              <p className="text-muted-foreground">
                Choose an existing conversation from the sidebar or start a new
                one by selecting a contact
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
