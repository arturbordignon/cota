"use client";

import { ReactNode } from "react";
import { Check } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

type Step = {
  id: number;
  title: string;
  description?: string;
  footer?: ReactNode;
};

interface StepperProps {
  steps: Step[];
  activeStep: number;
}

export function Stepper({ steps, activeStep }: StepperProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((step, index) => {
          const status = index < activeStep ? "complete" : index === activeStep ? "current" : "upcoming";
          return (
            <div key={step.id} className="flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  status === "complete" && "border-success bg-success text-white",
                  status === "current" && "border-primary bg-primary/10 text-primary",
                  status === "upcoming" && "border-outline text-muted"
                )}
              >
                {status === "complete" ? <Check size={18} weight="bold" /> : step.id}
              </div>
              <div className="flex flex-col sm:items-center">
                <span className="text-sm font-semibold text-ink sm:text-base">{step.title}</span>
                {step.description ? (
                  <span className="text-xs text-muted sm:text-center sm:text-sm">{step.description}</span>
                ) : null}
              </div>
              {index < steps.length - 1 && (
                <span className="hidden flex-1 border-t border-dashed border-outline sm:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
