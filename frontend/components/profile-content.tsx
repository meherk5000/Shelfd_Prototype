import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProfileContentProps {
  tab: string
  sortBy: string
}

export function ProfileContent({ tab, sortBy }: ProfileContentProps) {
  // This is mock data. In a real application, you'd fetch this data based on the active tab and sort option
  const items = [
    { id: 1, title: "Item 1", date: "18w", rating: 3.5 },
    { id: 2, title: "Item 2", date: "18w", rating: 4 },
    { id: 3, title: "Item 3", date: "1w", rating: 5 },
    // Add more items as needed
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Date: {item.date}</p>
            {tab === "Reviews" && <p>Rating: {item.rating}</p>}
            {/* Add more content based on the tab */}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

