"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full rounded-2xl bg-white dark:bg-[#191919] border border-[#E5E5E5] dark:border-[#333333] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200",
          maxStyles[maxWidth]
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] dark:border-[#333333]">
          <div>
            <h2 className="font-heading text-lg font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs sm:text-sm text-[#525252] dark:text-[#A6A6A6] mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#737373] hover:text-[#171717] dark:text-[#A6A6A6] dark:hover:text-[#F5F5F5] hover:bg-[#F2F2F2] dark:hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}

export const Dialog = Modal;
