import { Button } from "@/components/ui/button"

export function ProfileHeader() {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-6">
        <img
          src="/placeholder.svg?height=100&width=100"
          alt="Profile"
          className="rounded-full w-24 h-24 object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold">Meher K</h1>
          <p className="text-muted-foreground">@merri</p>
          <div className="flex gap-4 mt-2">
            <span className="text-sm">
              <strong>20</strong> Followers
            </span>
            <span className="text-sm">
              <strong>20</strong> Following
            </span>
          </div>
        </div>
      </div>
      <Button variant="outline">Edit Profile</Button>
    </div>
  )
}

