"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProfileHeader } from "./profile-header"
import { ReviewsTab } from "./profile-tabs/reviews-tab"
import { ClubsTab } from "./profile-tabs/clubs-tab"
import { PostsTab } from "./profile-tabs/posts-tab"
import { LikesTab } from "./profile-tabs/likes-tab"
import { StatsTab } from "./profile-tabs/stats-tab"

const tabs = ["Reviews", "Clubs", "Posts", "Likes", "Stats"]

export function Profile() {
  const [activeTab, setActiveTab] = useState("Reviews")
  const [sortBy, setSortBy] = useState("recent")

  return (
    <div className="container max-w-5xl mx-auto py-8">
      <ProfileHeader />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <div className="flex justify-between items-center border-b">
          <TabsList className="bg-transparent">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {activeTab !== "Stats" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <TabsContent value="Reviews">
          <ReviewsTab sortBy={sortBy} />
        </TabsContent>
        <TabsContent value="Clubs">
          <ClubsTab sortBy={sortBy} />
        </TabsContent>
        <TabsContent value="Posts">
          <PostsTab sortBy={sortBy} />
        </TabsContent>
        <TabsContent value="Likes">
          <LikesTab sortBy={sortBy} />
        </TabsContent>
        <TabsContent value="Stats">
          <StatsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

