import { CheckCircle, Info, WarningCircle, WarningOctagon } from "@phosphor-icons/react/dist/ssr";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type NoticeTone = "info" | "success" | "warning" | "danger" | "neutral";

const toneStyles: Record<NoticeTone, { box: string; icon: string }> = {
  info: { box: "border-info/25 bg-info-soft", icon: "text-info" },
  success: { box: "border-success/25 bg-success-soft", icon: "text-success" },
  warning: { box: "border-warning/25 bg-warning-soft", icon: "text-warning" },
  danger: { box: "border-danger/25 bg-danger-soft", icon: "text-danger" },
  neutral: { box: "border-border bg-surface-muted", icon: "text-muted" },
};

const toneIcons = {
  info: Info,
  success: CheckCircle,
  warning: WarningCircle,
  danger: WarningOctagon,
  neutral: Info,
};

interface NoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: NoticeTone;
  title?: ReactNode;
  action?: ReactNode;
}

export function Notice({ tone = "info", title, action, className, children, ...props }: NoticeProps) {
  const Icon = toneIcons[tone];
  const styles = toneStyles[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed text-ink",
        styles.box,
        className
      )}
      {...props}
    >
      <Icon size={18} weight="fill" className={cn("mt-0.5 shrink-0", styles.icon)} />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="break-words text-ink-muted">{children}</div>
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
