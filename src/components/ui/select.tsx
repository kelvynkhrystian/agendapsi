import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, id, children, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs sm:text-sm font-medium text-[#404040] dark:text-[#F5F5F5]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "flex h-10 w-full appearance-none rounded-xl border bg-white dark:bg-[#1B1B1B] px-3.5 pr-10 py-2 text-sm text-[#171717] dark:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)] dark:focus-visible:ring-[#525252]/40 dark:focus-visible:border-[#525252] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-2xs cursor-pointer",
              error
                ? "border-red-500 focus-visible:ring-red-500/30"
                : "border-[#E5E5E5] dark:border-[#393939]",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#C0C0C0]">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-[#737373] dark:text-[#A6A6A6]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
