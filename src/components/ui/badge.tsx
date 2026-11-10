import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "simulated";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 dark:bg-[#292929] dark:text-[#F5F5F5] dark:border-[var(--primary)]/35",
    secondary: "bg-[#F2F2F2] text-[#525252] dark:bg-[#292929] dark:text-[#D0D0D0] border border-[#E5E5E5] dark:border-[#333333]",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25",
    destructive: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400 border border-red-200 dark:border-red-500/25",
    outline: "border border-[#E5E5E5] dark:border-[#333333] text-[#525252] dark:text-[#D0D0D0] bg-transparent",
    simulated: "bg-amber-50 text-amber-800 dark:bg-[#292929] dark:text-[#D0D0D0] border border-amber-200 dark:border-[#393939] font-bold tracking-wider uppercase",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] leading-tight",
    md: "px-2.5 py-0.5 text-xs",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
