"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "pulsoicon-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  preventClose?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  preventClose = false,
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preventClose) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, preventClose]);

  if (!isOpen) return null;

  const maxStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!preventClose) onClose();
      }}
    >
      <div
        className={cn(
          "w-full flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] rounded-2xl bg-white dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#393939] p-4 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200",
          maxStyles[maxWidth]
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start sm:items-center justify-between shrink-0 pb-3 sm:pb-4 border-b border-[#E5E5E5] dark:border-[#393939] gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base sm:text-lg font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight leading-snug">
              {title}
            </h2>
            {description && (
              <p className="text-xs sm:text-sm text-[#525252] dark:text-[#A6A6A6] mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {!preventClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[#737373] hover:text-[#171717] dark:text-[#C0C0C0] dark:hover:text-[#FFFFFF] hover:bg-[#F2F2F2] dark:hover:bg-[#383838] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] dark:focus-visible:ring-[#525252] transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
              aria-label="Fechar modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="pt-4 sm:pt-5 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}

export const Dialog = Modal;
