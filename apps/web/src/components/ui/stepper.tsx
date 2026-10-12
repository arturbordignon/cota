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
    <ol className="grid gap-3 sm:grid-cols-[repeat(var(--steps),minmax(0,1fr))] sm:gap-0" style={{ "--steps": steps.length } as React.CSSProperties}>
      {steps.map((step, index) => {
        const status = index < activeStep ? "complete" : index === activeStep ? "current" : "upcoming";
        const isLast = index === steps.length - 1;
        return (
          <li
            key={step.id}
            aria-current={status === "current" ? "step" : undefined}
            className="relative flex items-start gap-3 sm:flex-col sm:gap-2.5 sm:pr-4"
          >
            <div className="flex items-center gap-3 sm:w-full">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular transition-colors",
                  status === "complete" && "bg-primary-soft text-primary-strong",
                  status === "current" &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  status === "upcoming" && "border border-outline bg-white text-muted"
                )}
              >
                {status === "complete" ? <Check size={14} weight="bold" /> : step.id}
              </span>
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "hidden h-0.5 flex-1 rounded-full sm:block",
                    status === "complete" ? "bg-ink" : "bg-border"
                  )}
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold leading-snug",
                  status === "upcoming" ? "text-muted" : "text-ink"
                )}
              >
                {step.title}
              </p>
              {step.description ? (
                <p className="mt-0.5 text-[13px] leading-snug text-muted">{step.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
