import * as React from "react";
// Slot is a component from Radix UI that lets us forward props to any element
// It's useful for creating polymorphic components (components that can render as different elements)
import { Slot } from "@radix-ui/react-slot";
// class-variance-authority lets us define component variants in a type-safe way
// It's like a mini styling system within our components
import { cva, type VariantProps } from "class-variance-authority";

// Our utility function for merging Tailwind classes
import { cn } from "@/lib/utils";

// Define all the button styles using cva
// This creates a function that will generate the right classes based on the variant/size props
const buttonVariants = cva(
  // Base styles applied to all buttons regardless of variant or size
  // These handle spacing, text size, focus states, etc.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      // Different visual styles for the button
      variant: {
        // Primary button - brown color specific to our app
        default: "bg-[#402924] text-white shadow hover:bg-[#301f1b]",
        // Red button for destructive actions like delete
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        // Button with a border and transparent background
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        // Light gray button for secondary actions
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        // Transparent button that only shows on hover
        ghost: "hover:bg-accent hover:text-[#402924]",
        // Looks like a link but behaves like a button
        link: "text-primary underline-offset-4 hover:text-[#402924] hover:underline",
      },
      // Different size options
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs", // Smaller button
        lg: "h-10 rounded-md px-8", // Larger button
        icon: "h-9 w-9", // Square button for icons only
      },
    },
    // Default settings if variant/size aren't specified
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Define the props that can be passed to our Button component
// Extends the standard HTML button props and adds our variant props
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // When true, the component will render as a child element instead of a button
  // This is useful for making a Link look like a button for example
  asChild?: boolean;
}

// Create the Button component using React.forwardRef to properly pass refs
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // If asChild is true, use Slot which renders the child component
    // Otherwise use a regular HTML button
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        // Merge our variant classes with any custom classes passed in
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
// Set a display name for better debugging in React DevTools
Button.displayName = "Button";

export { Button, buttonVariants };
