"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  House,
  UsersThree,
  Files,
  EnvelopeSimple,
  Target,
  Kanban,
  ChartLine,
  Star,
} from "@phosphor-icons/react";

import { dashboardNav, type NavKey } from "@/config/navigation";
import { cn } from "@/lib/utils";

const iconMap = {
  dashboard: House,
  clients: UsersThree,
  templates: Files,
  proposals: EnvelopeSimple,
  prospects: Target,
  crm: Kanban,
  reports: ChartLine,
  plan: Star,
};

const mobileNavItems = ["dashboard", "proposals", "prospects", "crm", "reports"] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations("navigation");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-outline/30 bg-white/95 px-4 shadow-xl backdrop-blur lg:hidden">
      {mobileNavItems.map((key) => {
        const navItem = dashboardNav.find((item) => item.key === key);
        if (!navItem) return null;
        const Icon = iconMap[key as keyof typeof iconMap] ?? House;
        const isActive = pathname === navItem.href || pathname.startsWith(navItem.href);

        return (
          <Link
            key={navItem.key}
            href={navItem.href}
            className={cn(
              "flex flex-col items-center gap-1 text-xs font-medium",
              isActive ? "text-primary" : "text-muted"
            )}
          >
            <Icon size={20} weight={isActive ? "fill" : "regular"} />
            <span>{t(navItem.key as NavKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
