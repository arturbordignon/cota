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

type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: ReactNode;
}

const baseStyles =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90",
  secondary: "bg-surface text-ink shadow-sm hover:bg-primary-soft",
  ghost: "bg-transparent text-ink hover:bg-primary-soft",
  outline: "border border-outline bg-transparent text-ink hover:bg-primary-soft",
  danger: "bg-danger text-white hover:bg-danger/90",
  link: "bg-transparent text-primary underline-offset-4 hover:underline",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

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
      variantStyles[variant],
      sizeStyles[size],
      computedDisabled ? 'pointer-events-none' : '',
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
        {...props}
      >
        {content}
      </Comp>
    );
  }
);

Button.displayName = "Button";
