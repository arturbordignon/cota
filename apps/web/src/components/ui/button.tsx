import { Slot } from "@radix-ui/react-slot";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "link";

type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: ReactNode;
}

const baseStyles =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:opacity-50 [&_svg]:shrink-0";

const variantStyles: Record<ButtonVariant, string> = {
  // White label on crane yellow; the text shadow keeps the label readable on the light fill.
  primary:
    "bg-primary text-primary-foreground shadow-press [text-shadow:0_1px_1px_rgb(110_66_0/0.45)] hover:bg-primary-hover active:translate-y-px active:shadow-none",
  secondary:
    "border border-outline bg-white text-ink shadow-card hover:border-ink/25 hover:bg-surface-muted active:bg-surface-sunken",
  outline:
    "border border-outline bg-transparent text-ink hover:border-ink/25 hover:bg-surface-muted active:bg-surface-sunken",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink active:bg-surface-sunken",
  danger: "bg-danger text-white shadow-press hover:bg-danger/90 active:translate-y-px active:shadow-none",
  link: "h-auto rounded-sm px-0 font-semibold text-primary-strong underline-offset-4 hover:underline",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-10 w-10 text-sm",
  "icon-sm": "h-8 w-8 text-[13px]",
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      className,
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = Boolean(disabled);
    const isLoading = Boolean(loading);
    const computedDisabled = isDisabled || isLoading;
    const content = isLoading ? loadingText ?? children : children;

    const baseClass = cn(
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      computedDisabled ? "pointer-events-none" : "",
      className,
    );

    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={baseClass}
          data-loading={isLoading ? "" : undefined}
          aria-disabled={computedDisabled || undefined}
          {...props}
        >
          {content}
        </Comp>
      );
    }

    return (
      <Comp
        ref={ref}
        className={baseClass}
        disabled={computedDisabled}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? <Spinner /> : null}
        {content}
      </Comp>
    );
  }
);

Button.displayName = "Button";
