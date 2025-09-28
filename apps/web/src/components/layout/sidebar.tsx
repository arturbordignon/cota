'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  House,
  Files,
  EnvelopeSimple,
  UsersThree,
  Briefcase,
  UserList,
  Star,
  PaperPlaneRight,
  Target,
  Kanban,
  ChartLine,
} from '@phosphor-icons/react';

import { useCurrentUser } from '@/components/providers/user-provider';
import { dashboardNav, type NavKey } from '@/config/navigation';
import { cn } from '@/lib/utils';

const iconMap = {
  house: House,
  files: Files,
  envelope: EnvelopeSimple,
  users: UsersThree,
  briefcase: Briefcase,
  userList: UserList,
  star: Star,
  target: Target,
  kanban: Kanban,
  chart: ChartLine,
};

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const tActions = useTranslations('actions');
  const { isOwner } = useCurrentUser();

  const availableNav = dashboardNav.filter((item) => (item.key === 'activity' ? isOwner : true));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-72 flex-col border-r border-outline/40 bg-white/95 px-6 py-8 shadow-xl lg:flex">
      <div className="flex-1 space-y-10 overflow-y-auto pr-2">
        <Link href="/" className="block">
          <div className="font-display text-lg font-semibold text-ink">ServicePro</div>
          <div className="text-sm text-muted">Menu</div>
        </Link>

        <nav className="space-y-2">
          {availableNav.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? House;
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const label = t(item.key as NavKey);

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-md font-medium transition',
                  isActive ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-primary-soft',
                )}
              >
                <Icon
                  size={20}
                  weight={isActive ? 'fill' : 'regular'}
                  className={cn(isActive ? 'text-white' : 'text-muted')}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Link
        href="/proposals/new"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5"
      >
        <PaperPlaneRight size={18} weight="fill" />
        {tActions('createProposal')}
      </Link>
    </aside>
  );
}
