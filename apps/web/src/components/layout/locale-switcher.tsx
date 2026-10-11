"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { setLocale } from "@/actions/set-locale";
import { locales, type AppLocale, localeLabels } from "@/i18n/routing";
import { Select, SelectItem } from "@/components/ui/select";

export function useLocaleChange() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const changeLocale = (nextLocale: AppLocale) => {
    if (nextLocale === locale) {
      return;
    }
    startTransition(async () => {
      await setLocale(nextLocale);
      router.refresh();
    });
  };

  return { locale, changeLocale, isPending };
}

interface LocaleSwitcherProps {
  ariaLabel?: string;
}

export function LocaleSwitcher({ ariaLabel = "Change language" }: LocaleSwitcherProps) {
  const { locale, changeLocale, isPending } = useLocaleChange();

  return (
    <Select
      value={locale}
      onValueChange={(value) => changeLocale(value as AppLocale)}
      disabled={isPending}
      aria-label={ariaLabel}
    >
      {locales.map((loc) => (
        <SelectItem key={loc} value={loc}>
          {localeLabels[loc]}
        </SelectItem>
      ))}
    </Select>
  );
}
