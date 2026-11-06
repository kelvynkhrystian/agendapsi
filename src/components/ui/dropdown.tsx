"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen((prev) => !prev)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-[12rem] rounded-xl border border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#191919] p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150 focus:outline-none",
            align === "right" ? "right-0" : "left-0",
            className
          )}
          role="menu"
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  className,
  children,
  icon,
  destructive,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors text-left cursor-pointer",
        destructive
          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          : "text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F2F2F2] dark:hover:bg-[#242424]",
        className
      )}
      {...props}
    >
      {icon && <span className="h-4 w-4 shrink-0 text-[#737373] dark:text-[#A6A6A6]">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
