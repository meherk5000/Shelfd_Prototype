"use client"

import { useState } from "react"
import { Layout } from "@/components/layout"
import { MediaHeader } from "@/components/media/media-header"
import { MediaTabs } from "@/components/media/media-tabs"

const tabs = ["About", "People you follow", "Posts", "Clubs", "Content Warnings"]

export default function ArticlePage() {
  const [activeTab, setActiveTab] = useState("About")

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="space-y-8">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-02-02%20at%2022.18.07-LoJCPXJN7XBkelgNUeRjumKcrgesbm.png"
            alt="Article featured image"
            className="w-full rounded-lg max-h-[400px] object-cover"
          />

          <div>
            <MediaHeader
              title="Is there ever such thing as a 'preventative facelift'?"
              subtitle="By Laura Pitcher | January 24, 2025"
              tags={["Trending", "Beauty"]}
              primaryAction={{
                label: "Save",
                onClick: () => {},
              }}
              secondaryActions={[
                {
                  label: "Read Now",
                  onClick: () => {},
                },
              ]}
            />
          </div>
        </div>

        <div className="mt-8">
          <MediaTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="mt-6">
            {activeTab === "About" && (
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-2">Overview</h2>
                  <p className="text-muted-foreground">
                    People in their 20s and 30s are getting their faces 'lifted into oblivion' in the latest iteration
                    of the 'preventative' ageing trap.
                  </p>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

