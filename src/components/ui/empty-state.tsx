import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[#E2E4E8] dark:border-[#303034] bg-white/50 dark:bg-[#19191C]/50 backdrop-blur-2xs",
        className
      )}
    >
      {icon && (
        <div className="h-12 w-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-4 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="font-heading text-base sm:text-lg font-semibold text-[#111827] dark:text-[#F5F5F5] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs sm:text-sm text-[#6B7280] dark:text-[#A3A3AD] max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <a href={action.href}>
              <Button size="sm" className="gap-2">
                {action.icon}
                <span>{action.label}</span>
              </Button>
            </a>
          ) : (
            <Button size="sm" onClick={action.onClick} className="gap-2">
              {action.icon}
              <span>{action.label}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
