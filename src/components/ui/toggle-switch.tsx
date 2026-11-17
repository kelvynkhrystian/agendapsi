"use client";

import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
}

/**
 * Toggle Switch animado padrão do PSI, idêntico ao de Configurações → Horários.
 */
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  className = "",
}: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${
        checked ? "bg-[var(--primary,#16a34a)]" : "bg-[#D4D4D4] dark:bg-[#333333]"
      } ${className}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
