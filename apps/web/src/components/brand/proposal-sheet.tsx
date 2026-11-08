import { CheckCircle, Truck } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

// Illustrative proposal used on the marketing and sign-in screens.
export function ProposalSheet({ className }: { className?: string }) {
  const t = useTranslations("proposalSheet");
  const linhas = [
    { rotulo: t("mobilization"), valor: t("mobilizationValue") },
    { rotulo: t("daily"), valor: t("dailyValue") },
  ];

  return (
    <div
      aria-hidden
      className={cn(
        "w-full max-w-[380px] rounded-2xl border border-ink/10 bg-white p-6 text-left shadow-[0_30px_60px_-30px_rgb(27_31_36/0.45)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted">{t("number")}</p>
          <p className="mt-1 font-display text-lg font-semibold leading-tight text-ink">
            {t("title")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success ring-1 ring-inset ring-success/20">
          <CheckCircle size={12} weight="fill" />
          {t("status")}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary-strong ring-1 ring-border">
          <Truck size={18} weight="bold" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink">{t("equipment")}</p>
          <p className="truncate text-xs text-muted">{t("site")}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 text-sm">
        {linhas.map((linha) => (
          <div key={linha.rotulo} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">{linha.rotulo}</dt>
            <dd className="tabular font-medium text-ink">{linha.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-end justify-between border-t border-dashed border-outline pt-4">
        <span className="text-sm font-semibold text-ink">{t("total")}</span>
        <span className="tabular font-display text-[28px] font-semibold leading-none text-ink">
          {t("totalValue")}
        </span>
      </div>

      <p className="mt-4 text-xs text-muted">{t("acceptedAt")}</p>
    </div>
  );
}
