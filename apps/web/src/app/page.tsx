"use client";

import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/brand/logo";
import { ProposalSheet } from "@/components/brand/proposal-sheet";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

const passos = ["build", "pdf", "send"] as const;

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="hidden w-[170px] sm:block">
              <LocaleSwitcher ariaLabel={t("language")} />
            </div>
            <Button asChild variant="ghost">
              <Link href={"/sign-in" as Route}>{t("signIn")}</Link>
            </Button>
            <Button asChild>
              <Link href={"/sign-up" as Route}>{t("signUp")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <p className="text-sm font-semibold text-primary-strong">{t("eyebrow")}</p>
            <h1 className="mt-3 max-w-xl text-balance font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.015em] md:text-[56px]">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
              {t("description")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={"/sign-up" as Route}>{t("start")}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={"/sign-in" as Route}>{t("haveAccount")}</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center pb-6 pr-6 lg:justify-end">
            <div className="relative w-full max-w-[380px]">
              <div aria-hidden className="absolute inset-0 translate-x-5 translate-y-5 rounded-2xl bg-primary" />
              <ProposalSheet className="relative rotate-[-1.5deg]" />
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface-muted/60">
          <ol className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
            {passos.map((passo, indice) => (
              <li key={passo} className="flex gap-4">
                <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-base font-semibold text-white">
                  {indice + 1}
                </span>
                <div>
                  <h2 className="text-xl font-semibold leading-tight">{t(`steps.${passo}.title`)}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(`steps.${passo}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
