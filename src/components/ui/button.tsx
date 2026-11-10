import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-heading font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0C0C0C] disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98] select-none";

    const variantStyles = {
      primary:
        "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] hover:brightness-110 active:brightness-95 dark:bg-[var(--dark-accent,var(--button-bg,var(--primary)))] dark:text-[#FFFFFF] focus-visible:ring-[var(--primary)] shadow-xs",
      secondary:
        "bg-[var(--button-secondary-bg,#ffffff)] text-[var(--button-secondary-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#242424] dark:text-[#F5F5F5] dark:border-[#333333] dark:hover:bg-[#2C2C2C] focus-visible:ring-[var(--primary)] shadow-2xs",
      outline:
        "border border-[var(--primary)]/30 dark:border-[#333333] bg-[var(--button-outline-bg,#ffffff)] dark:bg-[#1E1E1E] hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/[0.04] dark:hover:bg-[#262626] text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] dark:text-[#F5F5F5] focus-visible:ring-[var(--primary)] shadow-2xs",
      ghost:
        "bg-[var(--button-ghost-bg,transparent)] hover:bg-white hover:border-[var(--primary)]/20 border border-transparent dark:hover:bg-[#242424] dark:hover:border-[#333333] text-[var(--button-ghost-fg,var(--button-bg,var(--primary)))] dark:text-[#D0D0D0] dark:hover:text-[#FFFFFF] focus-visible:ring-[var(--primary)]",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 dark:bg-[#DC2626] dark:hover:bg-[#B91C1C] focus-visible:ring-red-500 shadow-xs",
      link:
        "bg-transparent text-[var(--button-outline-fg,var(--primary))] dark:text-[var(--dark-accent-vivid,var(--primary))] hover:underline underline-offset-4 p-0 h-auto font-medium focus-visible:ring-[var(--primary)]",
    };

    const sizeStyles = {
      sm: "text-xs px-3.5 py-1.5 min-h-[36px] gap-2 rounded-xl",
      md: "text-sm px-4.5 py-2 min-h-[40px] gap-2 rounded-xl",
      lg: "text-base px-6 py-2.5 min-h-[46px] gap-2.5 rounded-xl",
      icon: "h-9 w-9 min-h-[36px] min-w-[36px] p-0 rounded-xl flex items-center justify-center shrink-0",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
