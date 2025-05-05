/**
 * RadixProvider Component
 *
 * This component serves as a centralized solution for handling Radix UI dependency issues in Next.js.
 *
 * Problem it solves:
 * Next.js had bundling issues with Radix UI's dynamic imports, especially with dependencies
 * like 'get-nonce', 'detect-node-es', and 'use-sidecar'. These would fail during the build
 * process or cause runtime errors about missing modules.
 *
 * How it works:
 * 1. It pre-loads all Radix UI components eagerly instead of dynamically
 * 2. It imports the radix-dependencies-fix.js file which properly handles problematic dependencies
 * 3. It creates a provider context that can be placed high in the component tree
 *
 * By importing this at the application root level, we ensure all Radix UI components and their
 * dependencies are properly loaded before they're needed by any child components.
 */

import React from "react";
import "../radix-ui-handler";
import "../radix-dependencies-fix";

interface RadixProviderProps {
  children: React.ReactNode;
}

export function RadixProvider({ children }: RadixProviderProps) {
  // This is a simple pass-through component that doesn't add any DOM elements
  // Its purpose is to import and initialize the Radix UI components
  return <>{children}</>;
}
