'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Files,
  EnvelopeSimple,
  UsersThree,
  Briefcase,
  UserList,
  PaperPlaneRight,
  Target,
  Kanban,
  ChartLine,
  UserCircle,
  List,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useCurrentUser } from '@/components/providers/user-provider';
import { dashboardNav, type NavKey } from '@/config/navigation';

const iconMap = {
  house: House,
  files: Files,
  envelope: EnvelopeSimple,
  users: UsersThree,
  briefcase: Briefcase,
  userList: UserList,
  target: Target,
  kanban: Kanban,
  chart: ChartLine,
  userCircle: UserCircle,
};

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const tActions = useTranslations('actions');
  const { isOwner } = useCurrentUser();

  const availableNav = dashboardNav.filter((item) => (item.key === 'activity' ? isOwner : true));

  const toggle = () => {
    const newState = !collapsed;
    document.cookie = `sidebar-collapsed=${newState ? 'true' : 'false'}; Path=/; Max-Age=${
      60 * 60 * 24 * 30
    }; SameSite=Lax`;
    onToggle?.(newState);
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden h-screen flex-col border-r border-outline/40 bg-white/95 py-6 shadow-xl transition-all duration-300 lg:flex',
        collapsed ? 'w-20 px-2' : 'w-72 px-6',
      )}
    >
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className={cn(
            'font-display text-lg font-semibold text-ink',
            collapsed && 'text-center w-full',
          )}
        >
          {collapsed ? 'SP' : 'ServicePro'}
        </Link>

        <button
          onClick={toggle}
          className={cn(
            'ml-2 flex h-9 w-9 items-center justify-center rounded-md hover:bg-primary-soft transition',
            collapsed && 'mx-auto',
          )}
          aria-label="Toggle sidebar"
        >
          <List size={22} weight="bold" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
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
                'group flex items-center rounded-lg text-md font-medium transition-all duration-200',
                isActive ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-primary-soft',
                collapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2',
              )}
            >
              <Icon
                size={22}
                weight={isActive ? 'fill' : 'regular'}
                className={cn(isActive ? 'text-white' : 'text-muted')}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        <Link
          href="/proposals/new"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 w-full',
            collapsed ? 'h-10 justify-center' : 'px-4 py-2',
          )}
        >
          <PaperPlaneRight size={20} weight="fill" />
          {!collapsed && <span>{tActions('createProposal')}</span>}
        </Link>
      </div>
    </aside>
  );
}
