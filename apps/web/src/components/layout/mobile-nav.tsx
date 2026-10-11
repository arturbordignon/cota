"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NavContent, UsageMeter, type UsageInfo } from "@/components/layout/sidebar";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usage?: UsageInfo;
}

export function MobileNav({ open, onOpenChange, usage }: MobileNavProps) {
  const t = useTranslations("navigation");
  const fechar = () => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={t("openMenu")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface-muted lg:hidden"
        >
          <List size={22} weight="bold" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/45 data-[state=open]:animate-overlay-in" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[300px] flex-col bg-white shadow-raised focus:outline-none data-[state=open]:animate-drawer-in">
          <Dialog.Title className="sr-only">Crane Proposals</Dialog.Title>
          <Dialog.Description className="sr-only">{t("openMenu")}</Dialog.Description>
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border pl-5 pr-3">
            <Link href="/dashboard" onClick={fechar} className="rounded-lg">
              <Logo />
            </Link>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-ink"
                aria-label={t("closeMenu")}
              >
                <X size={18} weight="bold" />
              </button>
            </Dialog.Close>
          </div>

          <NavContent onNavigate={fechar} />

          <div className="shrink-0 space-y-3 border-t border-border p-3">
            <UsageMeter usage={usage} onNavigate={fechar} />
            <div className="space-y-1.5 px-1">
              <p className="text-xs font-semibold text-muted">{t("language")}</p>
              <LocaleSwitcher ariaLabel={t("language")} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
