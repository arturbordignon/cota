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
  Target,
  Kanban,
  ChartLine,
  UserCircle,
  Plus,
  CaretDoubleLeft,
  CaretDoubleRight,
} from '@phosphor-icons/react';

import { Logo } from '@/components/brand/logo';
import { useCurrentUser } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { dashboardNav, itemAtivo, itemVisivel, navGroups, type NavItem } from '@/config/navigation';
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

export interface UsageInfo {
  used: number;
  total: number | null;
}

const SEGMENTOS = 12;

// Segmented gauge, read like the load indicator in a crane cab.
export function UsageMeter({ usage, onNavigate }: { usage?: UsageInfo; onNavigate?: () => void }) {
  const t = useTranslations('navigation.usage');
  if (!usage) {
    return null;
  }

  const ilimitado = !usage.total;
  const proporcao = usage.total ? Math.min(usage.used / usage.total, 1) : 0;
  let preenchidos = Math.round(proporcao * SEGMENTOS);
  if (usage.used > 0 && preenchidos === 0) {
    preenchidos = 1;
  }
  const quaseNoLimite = proporcao >= 0.9;

  return (
    <Link
      href="/plans"
      onClick={onNavigate}
      className="block rounded-xl border border-border bg-surface-muted/70 px-3 py-3 transition-colors hover:border-outline hover:bg-surface-muted"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-ink-muted">{t('title')}</span>
        <span className="tabular text-xs font-bold text-ink">
          {ilimitado ? '∞' : t('of', { used: usage.used, total: usage.total ?? 0 })}
        </span>
      </div>
      {ilimitado ? (
        <p className="mt-1 text-xs text-muted">{t('unlimited')}</p>
      ) : (
        <div
          role="meter"
          aria-label={t('title')}
          aria-valuemin={0}
          aria-valuemax={usage.total ?? 0}
          aria-valuenow={usage.used}
          className="mt-2.5 grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${SEGMENTOS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: SEGMENTOS }).map((_, indice) => (
            <span
              key={indice}
              className={cn(
                'h-2 rounded-[2px]',
                indice < preenchidos ? (quaseNoLimite ? 'bg-danger' : 'bg-primary') : 'bg-surface-sunken',
              )}
            />
          ))}
        </div>
      )}
      <span className="mt-2 block text-xs font-semibold text-primary-strong">{t('plans')}</span>
    </Link>
  );
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('navigation');
  const Icon = iconMap[item.icon as keyof typeof iconMap] ?? House;
  const ativo = itemAtivo(item, pathname);
  const rotulo = t(item.key);

  return (
    <Link
      href={item.href}
      prefetch
      onFocus={() => router.prefetch(item.href)}
      onMouseEnter={() => router.prefetch(item.href)}
      onClick={onNavigate}
      aria-current={ativo ? 'page' : undefined}
      aria-label={collapsed ? rotulo : undefined}
      title={collapsed ? rotulo : undefined}
      className={cn(
        'group relative flex h-9 items-center gap-3 rounded-lg text-sm transition-colors',
        collapsed ? 'justify-center' : 'px-3',
        ativo
          ? 'bg-primary-soft font-semibold text-ink'
          : 'font-medium text-ink-muted hover:bg-surface-muted hover:text-ink',
      )}
    >
      {ativo ? (
        <span
          aria-hidden
          className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
        />
      ) : null}
      <Icon
        size={18}
        weight={ativo ? 'fill' : 'regular'}
        className={cn('shrink-0', ativo ? 'text-primary-strong' : 'text-muted group-hover:text-ink-muted')}
      />
      {!collapsed && <span className="truncate">{rotulo}</span>}
    </Link>
  );
}

export function NavContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {podeCriarProposta ? (
        <div className="px-3 pt-4">
          <Button
            asChild
            size={collapsed ? 'icon' : 'md'}
            className={cn(collapsed ? 'mx-auto flex' : 'w-full')}
          >
            <Link
              href="/proposals/new"
              onClick={onNavigate}
              aria-label={collapsed ? tActions('createProposal') : undefined}
              title={collapsed ? tActions('createProposal') : undefined}
            >
              <Plus size={16} weight="bold" />
              {!collapsed && <span>{tActions('createProposal')}</span>}
            </Link>
          </Button>
        </div>
      ) : null}

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {navGroups.map((group) => {
          const itens = availableNav.filter((item) => item.group === group);
          if (itens.length === 0) {
            return null;
          }
          return (
            <div key={group} className="mt-5 first:mt-0">
              {group !== 'home' ? (
                collapsed ? (
                  <div aria-hidden className="mx-auto mb-2 h-px w-6 bg-border" />
                ) : (
                  <p className="mb-1.5 px-3 text-xs font-semibold text-muted">{t(`groups.${group}`)}</p>
                )
              ) : null}
              <ul className="space-y-0.5">
                {itens.map((item) => (
                  <li key={item.key}>
                    <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  usage,
}: {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
  usage?: UsageInfo;
}) {
  const t = useTranslations('navigation');

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden h-screen flex-col border-r border-border bg-white transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center' : 'px-5',
        )}
      >
        <Link href="/dashboard" className="rounded-lg">
          <Logo compact={collapsed} />
        </Link>
      </div>

      <NavContent collapsed={collapsed} />

      <div className="shrink-0 space-y-2 border-t border-border p-3">
        {!collapsed ? <UsageMeter usage={usage} /> : null}
        <button
          type="button"
          onClick={() => onToggle(!collapsed)}
          aria-label={collapsed ? t('expand') : t('collapse')}
          title={collapsed ? t('expand') : undefined}
          className={cn(
            'flex h-9 w-full items-center gap-3 rounded-lg text-[13px] font-medium text-muted transition-colors hover:bg-surface-muted hover:text-ink',
            collapsed ? 'justify-center' : 'px-3',
          )}
        >
          {collapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
          {!collapsed && <span>{t('collapse')}</span>}
        </button>
      </div>
    </aside>
  );
}
