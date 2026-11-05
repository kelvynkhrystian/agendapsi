import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  containerClassName,
  ...props
}: React.HTMLAttributes<HTMLTableElement> & { containerClassName?: string }) {
  return (
    <div
      className={cn(
        "relative w-full overflow-auto rounded-2xl border border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#19191C] shadow-xs",
        containerClassName
      )}
    >
      <table
        className={cn("w-full caption-bottom text-sm text-left", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-[#E2E4E8] dark:border-[#303034] bg-[#F8F9FA] dark:bg-[#101012]/80",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-[#E2E4E8] dark:divide-[#303034]", className)}
      {...props}
    />
  );
}

export function TableFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn(
        "border-t border-[#E2E4E8] dark:border-[#303034] bg-[#F8F9FA] dark:bg-[#101012] font-medium text-[#111827] dark:text-[#F5F5F5]",
        className
      )}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-[#F3F4F6]/70 dark:hover:bg-[#222226]/50 data-[state=selected]:bg-[#F3F4F6] dark:data-[state=selected]:bg-[#222226]",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-11 px-4 text-left align-middle font-heading text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#A3A3AD]",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("p-4 align-middle text-sm text-[#111827] dark:text-[#F5F5F5]", className)}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn("mt-4 text-xs text-[#6B7280] dark:text-[#A3A3AD]", className)}
      {...props}
    />
  );
}
