import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#C7C7CC]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-xl border bg-white dark:bg-[#141416] px-3.5 py-2 text-sm text-[#111827] dark:text-[#F5F5F5] placeholder:text-slate-400 dark:placeholder:text-[#A3A3AD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            error
              ? "border-red-500 focus-visible:ring-red-500/30"
              : "border-[#E2E4E8] dark:border-[#303034]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-[#6B7280] dark:text-[#A3A3AD]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
