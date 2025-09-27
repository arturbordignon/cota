"use client";

import { CaretDown, Check } from "@phosphor-icons/react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export interface SelectProps extends SelectPrimitive.SelectProps {
  placeholder?: string;
}

export function Select({ children, placeholder, ...props }: SelectProps) {
  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        disabled={props.disabled}
        className={cn(
          "inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-outline bg-white px-4 text-sm font-medium text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <CaretDown size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-outline bg-white shadow-xl"
          position="popper"
        >
          <SelectPrimitive.Viewport className="p-1">
            {children}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export const SelectItem = forwardRef<
  HTMLDivElement,
  SelectPrimitive.SelectItemProps & { inset?: boolean }
>(function SelectItem({ className, children, inset, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-ink outline-none transition hover:bg-primary-soft focus:bg-primary-soft",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 inline-flex h-4 w-4 items-center justify-center text-primary">
        <SelectPrimitive.ItemIndicator>
          <Check size={14} weight="bold" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
