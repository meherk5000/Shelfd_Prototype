"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MediaActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button>Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Test Item</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
