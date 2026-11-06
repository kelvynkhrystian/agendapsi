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
      "inline-flex items-center justify-center font-heading font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#080808] disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98] select-none";

    const variantStyles = {
      primary:
        "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,var(--primary-foreground,#ffffff))] hover:brightness-105 active:brightness-95 focus-visible:ring-[var(--primary)] shadow-xs",
      secondary:
        "bg-[#F2F2F2] text-[#171717] hover:bg-[#E5E5E5] dark:bg-[#242424] dark:text-[#F5F5F5] dark:hover:bg-[#2C2C2C] focus-visible:ring-[#A6A6A6] dark:focus-visible:ring-[#525252] shadow-xs",
      outline:
        "border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#191919] hover:bg-[#F2F2F2] dark:hover:bg-[#242424] text-[#171717] dark:text-[#F5F5F5] focus-visible:ring-[var(--primary)] shadow-xs",
      ghost:
        "bg-transparent hover:bg-[#F2F2F2] dark:hover:bg-[#242424] text-[#525252] dark:text-[#CCCCCC] hover:text-[#171717] dark:hover:text-[#F5F5F5] focus-visible:ring-[var(--primary)]",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus-visible:ring-red-500 shadow-xs",
      link:
        "bg-transparent text-[var(--primary)] hover:underline underline-offset-4 p-0 h-auto font-medium focus-visible:ring-[var(--primary)]",
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
