"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Globe } from "@phosphor-icons/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { setLocale } from "@/actions/set-locale";
import { locales, type AppLocale, localeLabels } from "@/i18n/routing";
import { Select, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface LocaleSwitcherProps {
  variant?: "default" | "icon";
  ariaLabel?: string;
}

export function LocaleSwitcher({ variant = "default", ariaLabel = "Change language" }: LocaleSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const changeLocale = (nextLocale: AppLocale) => {
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }

    setOpen(false);
    startTransition(async () => {
      await setLocale(nextLocale);
      router.refresh();
    });
  };

  const handleChange = (value: string) => {
    changeLocale(value as AppLocale);
  };

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (variant === "icon") {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={isPending}
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline bg-white text-ink shadow-sm transition",
            "hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isPending && "opacity-60"
          )}
        >
          <Globe size={18} weight="bold" />
        </button>

        {open ? (
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-outline/40 bg-white p-1 shadow-xl">
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">Idioma</p>
            <div className="space-y-1">
              {locales.map((loc) => {
                const isActive = loc === locale;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => changeLocale(loc)}
                    disabled={isPending}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-ink hover:bg-[var(--color-surface-muted)]/80"
                    )}
                  >
                    <span>{localeLabels[loc]}</span>
                    {isActive ? <Check size={14} weight="bold" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      {locales.map((loc) => (
        <SelectItem key={loc} value={loc}>
          {localeLabels[loc]}
        </SelectItem>
      ))}
    </Select>
  );
}
