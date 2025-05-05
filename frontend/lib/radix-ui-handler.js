/**
 * Radix UI Handler
 * 
 * This file pre-loads all Radix UI components to avoid bundling issues in Next.js.
 * 
 * The Problem:
 * Next.js has issues with the way Radix UI dynamically imports its dependencies.
 * When components are loaded on-demand, their dependencies sometimes fail to load
 * properly, causing errors like "Cannot find module 'get-nonce'" or similar.
 * 
 * The Solution:
 * By eagerly importing ALL Radix UI components that the application uses in a single
 * file, and then importing that file early in the application lifecycle, we ensure
 * that Next.js bundles all the dependencies correctly. This prevents the dynamic import
 * failures that would otherwise occur when components are loaded individually.
 * 
 * How to use:
 * 1. Add any new Radix UI component imports here
 * 2. Make sure this file is imported by RadixProvider
 * 3. Use RadixProvider near the root of your application
 */

// Import all Radix UI components used in the app
// This forces Next.js to bundle them and their dependencies together
import * as RadixAccordion from '@radix-ui/react-accordion';
import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';
import * as RadixAspectRatio from '@radix-ui/react-aspect-ratio';
import * as RadixAvatar from '@radix-ui/react-avatar';
import * as RadixCollapsible from '@radix-ui/react-collapsible';
import * as RadixContextMenu from '@radix-ui/react-context-menu';
import * as RadixDialog from '@radix-ui/react-dialog';
import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import * as RadixHoverCard from '@radix-ui/react-hover-card';
import * as RadixLabel from '@radix-ui/react-label';
import * as RadixMenubar from '@radix-ui/react-menubar';
import * as RadixNavigationMenu from '@radix-ui/react-navigation-menu';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import * as RadixSelect from '@radix-ui/react-select';
import * as RadixSeparator from '@radix-ui/react-separator';
import * as RadixSlider from '@radix-ui/react-slider';
import * as RadixSlot from '@radix-ui/react-slot';
import * as RadixTabs from '@radix-ui/react-tabs';
import * as RadixToast from '@radix-ui/react-toast';
import * as RadixTooltip from '@radix-ui/react-tooltip';

// Export all components so they can be used elsewhere if needed
// Though typically the components would be imported directly from their own packages
export {
  RadixAccordion,
  RadixAlertDialog,
  RadixAspectRatio,
  RadixAvatar,
  RadixCollapsible,
  RadixContextMenu,
  RadixDialog,
  RadixDropdownMenu,
  RadixHoverCard,
  RadixLabel,
  RadixMenubar,
  RadixNavigationMenu,
  RadixRadioGroup,
  RadixSelect,
  RadixSeparator,
  RadixSlider,
  RadixSlot,
  RadixTabs,
  RadixToast,
  RadixTooltip
}; 