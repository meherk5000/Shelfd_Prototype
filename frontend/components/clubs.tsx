"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Filter, Users } from "lucide-react"

const clubCategories = [
  { id: "popular", name: "Popular Clubs" },
  { id: "new", name: "New Clubs" },
  { id: "book", name: "Book Clubs" },
  { id: "movie", name: "Movie Clubs" },
]

const clubs = [
  { id: 1, name: "Sci-Fi TV Shows Club", members: 1000, category: "popular" },
  { id: 2, name: "Action Movie Club", members: 100, category: "popular" },
  { id: 3, name: "Classics Book Club", members: 500, category: "book" },
  { id: 4, name: "Literary Fiction Club", members: 100, category: "book" },
  { id: 5, name: "Fantasy Book Club", members: 300, category: "new" },
  { id: 6, name: "Superhero Movies Club", members: 250, category: "movie" },
]

export function Clubs() {
  const [activeTab, setActiveTab] = useState("explore")
  const [activeCategory, setActiveCategory] = useState("popular")

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="explore">Explore Clubs</TabsTrigger>
          <TabsTrigger value="your">Your Clubs</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex justify-between items-center">
        <Input placeholder="Search clubs..." className="max-w-sm" />
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      <div className="space-y-6">
        {clubCategories.map((category) => (
          <section key={category.id}>
            <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubs
                .filter((club) => club.category === category.id)
                .map((club) => (
                  <div key={club.id} className="bg-card border rounded-lg overflow-hidden">
                    <div className="aspect-video bg-muted" />
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{club.name}</h3>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{club.members} members</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

