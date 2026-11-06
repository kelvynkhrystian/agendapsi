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
        "relative w-full overflow-auto rounded-2xl border border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#202020] shadow-xs",
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
        "border-b border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#1B1B1B]",
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
      className={cn("divide-y divide-[#E5E5E5] dark:divide-[#393939]", className)}
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
        "border-t border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#141414] font-medium text-[#171717] dark:text-[#F5F5F5]",
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
        "transition-colors hover:bg-[#F2F2F2]/70 dark:hover:bg-[#292929]/70 data-[state=selected]:bg-[#F2F2F2] dark:data-[state=selected]:bg-[#292929]",
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
        "h-11 px-4 sm:px-6 text-left align-middle font-heading text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A6A6A6]",
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
      className={cn("p-4 sm:px-6 sm:py-4 align-middle text-sm text-[#171717] dark:text-[#F5F5F5]", className)}
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
      className={cn("mt-4 text-xs text-[#737373] dark:text-[#A6A6A6]", className)}
      {...props}
    />
  );
}
