import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <Link href="/" aria-label="Cota">
        <Logo />
      </Link>
      <div className="max-w-md space-y-3">
        <p className="tabular font-display text-5xl font-semibold text-ink">404</p>
        <h1 className="font-display text-2xl font-semibold text-ink">{t("title")}</h1>
        <p className="text-sm leading-relaxed text-muted">{t("description")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/dashboard">{t("dashboard")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </main>
  );
}
