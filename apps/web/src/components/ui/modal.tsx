"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import type { FormEventHandler, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
};

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  /** Renders the panel as a <form> so the footer submit button works with Enter. */
  onSubmit?: FormEventHandler<HTMLFormElement>;
  closeLabel?: string;
  hideClose?: boolean;
  children: ReactNode;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  onSubmit,
  closeLabel = "Fechar",
  hideClose = false,
  children,
}: ModalProps) {
  const panelClass = cn(
    "flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-raised sm:max-h-[min(88vh,760px)]",
    sizeClasses[size]
  );

  const header = (
    <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
      <div className="min-w-0 space-y-1">
        <Dialog.Title className="font-display text-xl font-semibold leading-tight text-ink">
          {title}
        </Dialog.Title>
        {description ? (
          <Dialog.Description className="text-sm leading-relaxed text-muted">
            {description}
          </Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
        )}
      </div>
      {!hideClose ? (
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label={closeLabel}
            className="-mr-2 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X size={18} weight="bold" />
          </button>
        </Dialog.Close>
      ) : null}
    </header>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/45 data-[state=open]:animate-overlay-in" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-end justify-center p-4 focus:outline-none sm:items-center data-[state=open]:[&>*]:animate-dialog-in">
          {onSubmit ? (
            <form onSubmit={onSubmit} className={panelClass}>
              {header}
              {children}
            </form>
          ) : (
            <div className={panelClass}>
              {header}
              {children}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-1", className)} {...props} />
  );
}

export function ModalFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <footer
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border bg-surface-muted/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

export const ModalClose = Dialog.Close;
