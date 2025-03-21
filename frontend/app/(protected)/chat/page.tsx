"use client";

import { Layout } from "@/components/layout";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <Layout>
      <div className="h-[calc(100vh-70px)] mx-auto w-full px-0">
        <ChatInterface />
      </div>
    </Layout>
  );
}
