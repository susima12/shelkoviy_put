import * as React from "react";
import { cn } from "@/lib/utils";

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select"> & { placeholder?: string }
>(({ className, placeholder, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm transition-colors",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className
    )}
    {...props}
  >
    {placeholder && (
      <option value="" disabled={props.required}>
        {placeholder}
      </option>
    )}
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";
