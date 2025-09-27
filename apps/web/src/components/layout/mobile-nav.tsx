"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { dashboardNav, type NavKey } from "@/config/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="inline-flex items-center justify-center rounded-lg border border-outline bg-white/90 p-2 text-ink shadow-sm md:hidden"
        >
          <List size={22} weight="bold" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-full max-w-sm -translate-x-full flex-col bg-white",
            "shadow-2xl transition-transform duration-300 ease-out",
            "data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full"
          )}
        >
          <div className="border-b border-outline/30 px-5 pb-4 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">ServicePro</p>
                <p className="text-xs text-muted">Escolha onde deseja navegar</p>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-outline bg-[var(--color-surface-muted)] p-2 text-ink shadow-sm"
                  aria-label="Fechar menu"
                >
                  <X size={18} weight="bold" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <nav className="space-y-1">
              {dashboardNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-outline/40 bg-[var(--color-surface-muted)] text-ink hover:border-primary/60 hover:bg-primary-soft"
                    )}
                    onClick={() => onOpenChange(false)}
                  >
                    <span>{t(item.key as NavKey)}</span>
                    <span className="text-xs text-muted">{isActive ? "Agora" : "Ir"}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-outline/20 px-5 py-5">
            <div className="rounded-xl border border-outline/40 bg-[var(--color-surface-muted)] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted">Idioma da interface</p>
              <div className="mt-2">
                <LocaleSwitcher />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
