"use client";

import React from "react";
import { ShelfList } from "@/components/shelf/shelf-list";

interface ShelfListClientProps {
  type: "books" | "movies" | "tv-shows" | "articles";
  shelfName: string;
}

export function ShelfListClient({ type, shelfName }: ShelfListClientProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold capitalize">{shelfName}</h1>
      </div>
      <ShelfList type={type} initialList={shelfName} />
    </div>
  );
}
