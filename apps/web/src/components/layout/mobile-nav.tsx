"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

import { useCurrentUser } from "@/components/providers/user-provider";
import { dashboardNav, itemVisivel, type NavKey } from "@/config/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("navigation");
  const { isOwner, temPermissao } = useCurrentUser();

  const availableNav = useMemo(
    () => dashboardNav.filter((item) => itemVisivel(item, { isOwner, temPermissao })),
    [isOwner, temPermissao]
  );

  useEffect(() => {
    if (!open) return;
    availableNav.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [availableNav, open, router]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="inline-flex items-center justify-center rounded-md p-2 text-ink lg:hidden"
        >
          <List size={22} weight="bold" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-full max-w-sm -translate-x-full flex-col bg-white",
            "transition-transform duration-300 ease-out",
            "data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full"
          )}
        >
          <div className="px-5 pb-4 pt-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold text-ink">Crane Proposals</p>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md p-2 text-muted hover:bg-primary-soft hover:text-ink"
                  aria-label="Fechar menu"
                >
                  <X size={18} weight="bold" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <nav className="space-y-1">
              {availableNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch
                    className={cn(
                      "flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition",
                      isActive
                        ? "bg-primary text-ink"
                        : "text-muted hover:bg-primary-soft hover:text-ink"
                    )}
                    onClick={() => onOpenChange(false)}
                  >
                    <span>{t(item.key as NavKey)}</span>
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
