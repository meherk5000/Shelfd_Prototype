// This file ensures problematic dependencies are properly bundled
// We had issues with these packages when building with Next.js, so we're manually
// importing and re-exporting them to make sure they get bundled correctly

// getNonce is used to generate unique identifiers for scripts/styles to prevent XSS attacks
import { getNonce } from 'get-nonce';

// isNode helps determine if code is running in Node.js environment vs browser
// useful for conditional rendering or logic that should only run on client/server
import { isNode } from 'detect-node-es';

// useSidecar is a React hook for loading separate chunks of code on demand
// helps with code splitting and performance optimization
import { useSidecar } from 'use-sidecar';

// These are used to manage singleton styles in React to prevent duplicate styles
// especially important when using styled components or emotion in SSR apps
import { styleSingleton, styleHookSingleton, stylesheetSingleton } from 'react-style-singleton';

// RemoveScroll is a component that prevents background scrolling
// commonly used when modals or drawers are open
import { RemoveScroll } from 'react-remove-scroll';

// Re-export everything so we can import from this file instead of directly from
// the problematic packages. This ensures webpack bundles them correctly.
export {
  getNonce,
  isNode,
  useSidecar,
  styleSingleton,
  styleHookSingleton,
  stylesheetSingleton,
  RemoveScroll
}; 