// This file ensures problematic dependencies are properly bundled
import { getNonce } from 'get-nonce';
import { isNode } from 'detect-node-es';
import { useSidecar } from 'use-sidecar';
import { styleSingleton, styleHookSingleton, stylesheetSingleton } from 'react-style-singleton';
import { RemoveScroll } from 'react-remove-scroll';

// Reexport for usage
export {
  getNonce,
  isNode,
  useSidecar,
  styleSingleton,
  styleHookSingleton,
  stylesheetSingleton,
  RemoveScroll
}; 