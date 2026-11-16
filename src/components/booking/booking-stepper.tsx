"use client";

import React from "react";
import { Check } from "pulsoicon-react";

export interface BookingStepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS = [
  { num: 1, label: "Serviço", shortLabel: "Serviço" },
  { num: 2, label: "Data e Horário", shortLabel: "Horário" },
  { num: 3, label: "Identificação", shortLabel: "Identificação" },
  { num: 4, label: "Pagamento", shortLabel: "Pagamento" },
] as const;

export function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <div className="w-full max-w-md mx-auto mb-6 sm:mb-8 select-none">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.num;
          const isCurrent = currentStep === step.num;
          const isUpcoming = currentStep < step.num;

          return (
            <React.Fragment key={step.num}>
              {/* Nó do Passo */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-[var(--primary)] text-white shadow-xs"
                      : isCurrent
                      ? "bg-[var(--primary)] text-white shadow-sm ring-4 ring-[var(--primary)]/20 scale-105"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <span>{step.num}</span>
                  )}
                </div>

                <span
                  className={`text-[10px] min-[380px]:text-[11px] sm:text-xs tracking-tight transition-colors duration-200 ${
                    isCurrent
                      ? "font-bold text-[var(--primary)]"
                      : isCompleted
                      ? "font-medium text-slate-700"
                      : "font-normal text-slate-400"
                  }`}
                >
                  {/* No mobile muito pequeno usa o label curto, no desktop/tablet usa o label completo */}
                  <span className="hidden min-[380px]:inline">{step.label}</span>
                  <span className="inline min-[380px]:hidden">{step.shortLabel}</span>
                </span>
              </div>

              {/* Linha Conectora entre os Passos */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-1.5 sm:mx-2.5 mb-5">
                  <div
                    className={`h-0.5 w-full rounded-full transition-colors duration-300 ${
                      currentStep > step.num ? "bg-[var(--primary)]" : "bg-slate-200"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
