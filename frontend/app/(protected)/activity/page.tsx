"use client";

import { Layout } from "@/components/layout";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        <h1 className="text-3xl font-bold mb-6">Activity</h1>

        <Tabs
          defaultValue="all"
          className="mb-8"
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="all">All Activity</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="you">Mentions</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ActivityFeed type="all" />
          </TabsContent>
          <TabsContent value="following">
            <ActivityFeed type="following" />
          </TabsContent>
          <TabsContent value="you">
            <ActivityFeed type="mentions" />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
