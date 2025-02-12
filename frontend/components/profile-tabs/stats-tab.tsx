import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, BookOpen, Film } from "lucide-react"

export function StatsTab() {
  const stats = [
    { title: "Books Read", value: 42, icon: BookOpen },
    { title: "Movies Watched", value: 98, icon: Film },
    { title: "Average Rating", value: 4.2, icon: BarChart },
  ]

  return (
    <div className="grid gap-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Genres</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add a chart or detailed breakdown of genres here */}
          <p>Detailed genre breakdown would go here.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Reading/Watching History</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add a timeline or graph of reading/watching history here */}
          <p>Reading and watching history timeline would go here.</p>
        </CardContent>
      </Card>
    </div>
  )
}

