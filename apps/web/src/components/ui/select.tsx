"use client";

import { CaretDown, Check } from "@phosphor-icons/react";
import * as SelectPrimitive from "@radix-ui/react-select";
import type {
  SelectProps as RadixSelectProps,
  SelectItemProps as RadixSelectItemProps,
} from "@radix-ui/react-select";
import { forwardRef } from "react";

import { fieldStyles } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SelectProps extends RadixSelectProps {
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export function Select({
  children,
  placeholder,
  className,
  id,
  "aria-label": ariaLabel,
  ...props
}: SelectProps) {
  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        disabled={props.disabled}
        className={cn(
          fieldStyles,
          "group inline-flex h-10 items-center justify-between gap-2 px-3 text-left data-[placeholder]:text-muted [&>span]:truncate",
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="shrink-0 text-muted transition-transform duration-150 group-data-[state=open]:rotate-180">
          <CaretDown size={14} weight="bold" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 max-h-[min(var(--radix-select-content-available-height),360px)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-white shadow-raised data-[state=open]:animate-pop-in"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export const SelectItem = forwardRef<
  HTMLDivElement,
  RadixSelectItemProps & { inset?: boolean }
>(function SelectItem({ className, children, inset, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-3 pr-9 text-sm text-ink-muted outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-muted data-[state=checked]:font-semibold data-[highlighted]:text-ink data-[state=checked]:text-ink data-[disabled]:opacity-50",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex h-4 w-4 items-center justify-center text-primary-strong">
        <Check size={14} weight="bold" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
