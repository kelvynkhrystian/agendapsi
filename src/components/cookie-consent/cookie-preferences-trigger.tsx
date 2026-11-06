"use client";

import React from "react";

export function CookiePreferencesTrigger({ className = "" }: { className?: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-psi-cookie-preferences"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`hover:text-[var(--primary)] hover:underline cursor-pointer transition-colors text-inherit font-inherit ${className}`}
    >
      Preferências de cookies
    </button>
  );
}
