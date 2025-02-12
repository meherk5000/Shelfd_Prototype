"use client"

import { useState } from "react"
import { Layout } from "@/components/layout"
import { MediaHeader } from "@/components/media/media-header"
import { MediaTabs } from "@/components/media/media-tabs"

const tabs = ["About", "Reviews & Rating", "People you follow", "Posts", "Clubs", "Content Warnings"]

export default function TVShowPage() {
  const [activeTab, setActiveTab] = useState("About")

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <div>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-02-02%20at%2022.17.58-uAP9nwH2MYmsgT46dUcNa8YWFVbWGa.png"
              alt="The Good Place"
              className="w-full rounded-lg"
            />
          </div>
          <div>
            <MediaHeader
              title="The Good Place"
              subtitle="NBC"
              rating={4.5}
              tags={["Fiction", "Sitcom", "Funny"]}
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
                    Eleanor, a deceased saleswoman who lived a morally corrupt life, finds herself in a heaven-like
                    afterlife in a case of mistaken identity and tries to hide her past in order to stay there.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-2">Cast</h2>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Eleanor Shellstrop – Kristen Bell</li>
                    <li>Chidi Anagonye – William Jackson Harper</li>
                    <li>Tahani Al-Jamil – Jameela Jamil</li>
                    <li>Jason Mendoza – Manny Jacinto</li>
                    <li>Michael – Ted Danson</li>
                    <li>Janet – D'Arcy Carden</li>
                  </ul>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

