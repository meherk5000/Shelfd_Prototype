"use client"

import { useState } from "react"
import { Layout } from "@/components/layout"
import { MediaHeader } from "@/components/media/media-header"
import { MediaTabs } from "@/components/media/media-tabs"

const tabs = ["About", "Reviews & Rating", "People you follow", "Posts", "Clubs", "Content Warnings"]

export default function MoviePage() {
  const [activeTab, setActiveTab] = useState("About")

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <div>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-02-02%20at%2022.17.51-WvKutxC4wF8ttv5DJj2baAUzRvWcqv.png"
              alt="Howl's Moving Castle"
              className="w-full rounded-lg"
            />
          </div>
          <div>
            <MediaHeader
              title="Howl's Moving Castle"
              subtitle="2004 | Directed By Hayao Miyazaki"
              rating={4.5}
              tags={["Fiction", "Animated", "Fantasy"]}
              primaryAction={{
                label: "Want To Watch",
                onClick: () => {},
              }}
              secondaryActions={[
                {
                  label: "Where to Watch",
                  onClick: () => {},
                },
                {
                  label: "Trailer",
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
                    Sophie, a young milliner, is turned into an elderly woman by a witch who enters her shop and curses
                    her. She encounters a wizard named Howl and gets caught up in his resistance to fighting for the
                    king.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-2">Cast</h2>
                  <div className="space-y-2">
                    <h3 className="font-medium">Japanese Cast:</h3>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>Sophie Hatter (Young) – Chieko Baishō</li>
                      <li>Sophie Hatter (Old) – Chieko Baishō (both versions)</li>
                      <li>Howl – Takuya Kimura</li>
                      <li>Witch of the Waste – Akihiro Miwa</li>
                    </ul>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

