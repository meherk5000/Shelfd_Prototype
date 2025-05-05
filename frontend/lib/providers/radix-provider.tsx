/**
 * This component pre-loads all Radix UI components to avoid dynamic imports
 * which can cause bundling issues in Next.js
 */

import React from "react";
import "../radix-ui-handler";
import "../radix-dependencies-fix";

interface RadixProviderProps {
  children: React.ReactNode;
}

export function RadixProvider({ children }: RadixProviderProps) {
  return <>{children}</>;
}
