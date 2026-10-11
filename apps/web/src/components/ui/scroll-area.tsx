"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";

import { cn } from "@/lib/utils";

const ScrollArea = forwardRef<
  ElementRef<typeof ScrollAreaPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar
      orientation="horizontal"
      className="flex h-2.5 touch-none select-none items-center rounded-full bg-surface-muted p-0.5 transition"
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-outline hover:bg-muted" />
    </ScrollAreaPrimitive.Scrollbar>
  </ScrollAreaPrimitive.Root>
));

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
