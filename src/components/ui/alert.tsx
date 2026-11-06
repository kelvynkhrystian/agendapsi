import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "warning" | "success" | "destructive";
  title?: string;
}

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  const styles = {
    info: {
      box: "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[#171717] dark:text-[#F5F5F5] dark:bg-[#202020] dark:border-[#393939]",
      icon: <Info className="h-5 w-5 text-[var(--primary)] dark:text-[#C0C0C0] shrink-0 mt-0.5" />,
    },
    warning: {
      box: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-[#202020] dark:border-[#524020] dark:text-[#F5D8A0]",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-[#E8A540] shrink-0 mt-0.5" />,
    },
    success: {
      box: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-[#202020] dark:border-[#204030] dark:text-[#A0E8B0]",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-[#4ADE80] shrink-0 mt-0.5" />,
    },
    destructive: {
      box: "bg-red-50 border-red-200 text-red-900 dark:bg-[#321E1E] dark:border-[#522525] dark:text-[#F87171]",
      icon: <AlertCircle className="h-5 w-5 text-red-600 dark:text-[#F87171] shrink-0 mt-0.5" />,
    },
  };

  const { box, icon } = styles[variant];

  return (
    <div
      role="alert"
      className={cn("flex gap-3 rounded-xl border p-4 text-sm shadow-xs", box, className)}
      {...props}
    >
      {icon}
      <div className="space-y-1">
        {title && <h5 className="font-bold leading-none tracking-tight">{title}</h5>}
        <div className="text-sm opacity-90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
