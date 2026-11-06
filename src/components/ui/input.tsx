import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-medium text-[#404040] dark:text-[#F5F5F5]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#737373] dark:text-[#C0C0C0]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-xl border bg-white dark:bg-[#1B1B1B] px-3.5 py-2 text-sm text-[#171717] dark:text-[#F5F5F5] placeholder:text-[#737373] dark:placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)] dark:focus-visible:ring-[#525252]/40 dark:focus-visible:border-[#525252] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-2xs",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error
                ? "border-red-500 focus-visible:ring-red-500/30"
                : "border-[#E5E5E5] dark:border-[#393939]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-[#737373] dark:text-[#C0C0C0]">
              {rightIcon}
            </div>
          )}
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
Input.displayName = "Input";
