import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

interface ClubsTabProps {
  sortBy: string
}

export function ClubsTab({ sortBy }: ClubsTabProps) {
  const clubs = [
    { id: 1, name: "Fantasy Book Club", members: 5, lastActivity: "2 New Posts" },
    { id: 2, name: "Superhero Movies Club", members: 5, lastActivity: "2 New Posts" },
    // Add more clubs as needed
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {clubs.map((club) => (
        <Card key={club.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{club.name}</CardTitle>
            <div className="flex items-center text-muted-foreground">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-xs">{club.members}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Latest Activity:</p>
            <p className="text-sm font-medium">{club.lastActivity}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

