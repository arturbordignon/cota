'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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

import { useCurrentUser } from '@/components/providers/user-provider';
import { dashboardNav, itemVisivel, type NavKey } from '@/config/navigation';
import { cn } from '@/lib/utils';

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
  const router = useRouter();
  const t = useTranslations('navigation');
  const tActions = useTranslations('actions');
  const { isOwner, temPermissao } = useCurrentUser();

  const availableNav = useMemo(
    () => dashboardNav.filter((item) => itemVisivel(item, { isOwner, temPermissao })),
    [isOwner, temPermissao],
  );
  const podeCriarProposta = temPermissao('proposals', 'edit');

  useEffect(() => {
    availableNav.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [availableNav, router]);

  const classeItem = (ativo: boolean) => {
    if (collapsed && ativo) {
      return "justify-center bg-primary py-3 text-ink";
    }
    if (collapsed) {
      return "justify-center py-3 text-muted hover:bg-primary-soft";
    }
    if (ativo) {
      return "gap-3 bg-primary px-3 py-2.5 text-ink";
    }
    return "gap-3 px-3 py-2.5 text-muted hover:bg-primary-soft";
  };

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
        'fixed inset-y-0 left-0 z-40 hidden h-screen flex-col border-r border-outline/40 bg-white py-6 transition-all duration-300 lg:flex',
        collapsed ? 'w-20 px-2' : 'w-72 px-6',
      )}
    >
      <div className={cn('mb-8 flex items-center', collapsed ? 'flex-col gap-3' : 'justify-between')}>
        <Link href="/dashboard" className="font-display text-lg font-semibold text-ink">
          {collapsed && 'CP'}
          {!collapsed && 'Crane Proposals'}
        </Link>

        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-ink"
          aria-label="Toggle sidebar"
        >
          <List size={18} weight="bold" />
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
              prefetch
              onFocus={() => router.prefetch(item.href)}
              onMouseEnter={() => router.prefetch(item.href)}
              className={cn(
                'group relative flex items-center rounded-md text-sm font-medium transition-colors',
                classeItem(isActive),
              )}
            >
              <Icon
                size={20}
                weight={isActive ? 'fill' : 'regular'}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn('mt-6', !podeCriarProposta && 'hidden')}>
        <Link
          href="/proposals/new"
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-ink transition hover:bg-primary/90',
            collapsed ? 'h-10' : 'px-3 py-2.5',
          )}
        >
          <PaperPlaneRight size={20} weight="fill" />
          {!collapsed && <span>{tActions('createProposal')}</span>}
        </Link>
      </div>
    </aside>
  );
}
