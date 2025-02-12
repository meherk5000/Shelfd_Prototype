import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MediaTabsProps {
  tabs: string[]
  activeTab: string
  onChange: (value: string) => void
}

export function MediaTabs({ tabs, activeTab, onChange }: MediaTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onChange} className="w-full">
      <TabsList className="w-full justify-start border-b bg-transparent p-0 h-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

