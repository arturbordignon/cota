'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { ReactNode, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Bell, Check, MagnifyingGlass, Plus, SignOut, UserCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/components/providers/user-provider';
import { useLocaleChange } from '@/components/layout/locale-switcher';
import { GlobalSearch, type SearchScope } from '@/components/layout/global-search';
import { locales, localeLabels } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface TopbarProps {
  credits?: string;
  onCreateProposal?: () => void;
  actions?: ReactNode;
  mobileNavTrigger?: ReactNode;
}

function iniciais(nome?: string | null) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase() || '?';
}

function UserMenu() {
  const { user, signOut } = useCurrentUser();
  const tTopbar = useTranslations('common.topbar');
  const tNav = useTranslations('navigation');
  const { locale, changeLocale, isPending } = useLocaleChange();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tTopbar('openUserMenu')}
        className={cn(
          'flex h-10 items-center gap-2.5 rounded-lg pl-1 pr-1 transition-colors hover:bg-surface-muted sm:pr-2.5',
          open && 'bg-surface-muted',
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
          {iniciais(user?.name ?? user?.email)}
        </span>
        <span className="hidden max-w-[160px] text-left leading-tight md:block">
          <span className="block truncate text-sm font-semibold text-ink">{user?.name ?? user?.email}</span>
          <span className="block truncate text-xs text-muted">{user?.account.name}</span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-white p-1.5 shadow-raised animate-pop-in"
        >
          <div className="px-2.5 pb-2.5 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <div className="border-t border-border py-1.5">
            <Link href="/account" className={itemClass} role="menuitem" onClick={() => setOpen(false)}>
              <UserCircle size={18} />
              {tNav('account')}
            </Link>
          </div>
          <div className="border-t border-border py-1.5">
            <p className="px-2.5 pb-1 pt-1 text-xs font-semibold text-muted">{tTopbar('language')}</p>
            {locales.map((loc) => (
              <button
                key={loc}
                type="button"
                role="menuitemradio"
                aria-checked={loc === locale}
                disabled={isPending}
                onClick={() => {
                  changeLocale(loc);
                  setOpen(false);
                }}
                className={cn(itemClass, 'justify-between', loc === locale && 'text-ink')}
              >
                <span>{localeLabels[loc]}</span>
                {loc === locale ? <Check size={14} weight="bold" className="text-primary-strong" /> : null}
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-1.5">
            <button
              type="button"
              role="menuitem"
              className={cn(itemClass, 'hover:bg-danger-soft hover:text-danger')}
              onClick={() => signOut()}
            >
              <SignOut size={18} />
              {tTopbar('signOut')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Topbar({
  credits,
  onCreateProposal,
  actions,
  mobileNavTrigger,
}: TopbarProps) {
  const t = useTranslations('dashboard');
  const tActions = useTranslations('actions');
  const tTopbar = useTranslations('common.topbar');
  const [searchOpen, setSearchOpen] = useState(false);
  const [atalho, setAtalho] = useState('Ctrl K');
  const router = useRouter();

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setAtalho('⌘K');
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const iconButtonClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-ink';

  const handleSearch = (query: string, scope: SearchScope) => {
    const encodedQuery = encodeURIComponent(query);

    const routeMap: Record<SearchScope, string> = {
      all: `/proposals?search=${encodedQuery}`,
      proposals: `/proposals?search=${encodedQuery}`,
      clients: `/clients?search=${encodedQuery}`,
      templates: `/templates?search=${encodedQuery}`,
    };

    setSearchOpen(false);
    router.push(routeMap[scope] as Route);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-white/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6 lg:px-8">
      {mobileNavTrigger ? <div className="shrink-0 lg:hidden">{mobileNavTrigger}</div> : null}

      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="hidden h-10 w-full max-w-md items-center gap-2.5 rounded-lg border border-border bg-surface-muted/70 px-3 text-sm text-muted transition-colors hover:border-outline hover:bg-white md:flex"
            aria-label={tTopbar('openSearch')}
          >
            <MagnifyingGlass size={16} className="shrink-0" />
            <span className="flex-1 truncate text-left">{tTopbar('searchHint')}</span>
            <kbd className="rounded-md border border-border bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted">
              {atalho}
            </kbd>
          </button>
        </Dialog.Trigger>
        <Dialog.Trigger asChild>
          <button type="button" className={`${iconButtonClass} md:hidden`} aria-label={tTopbar('openSearch')}>
            <MagnifyingGlass size={20} />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/45 data-[state=open]:animate-overlay-in" />
          <Dialog.Content className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[12vh] focus:outline-none data-[state=open]:[&>*]:animate-dialog-in">
            <div className="w-full max-w-2xl">
              <Dialog.Title className="sr-only">{tTopbar('openSearch')}</Dialog.Title>
              <Dialog.Description className="sr-only">{tTopbar('searchHint')}</Dialog.Description>
              <GlobalSearch autoFocus onSearch={handleSearch} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {credits && (
          <span className="mr-1 hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted sm:inline-flex lg:hidden">
            {t('credits.label')}
            <span className="tabular font-bold text-ink">{credits}</span>
          </span>
        )}
        {onCreateProposal ? (
          <Button
            size="icon"
            onClick={onCreateProposal}
            className="mr-1 lg:hidden"
            aria-label={tActions('createProposal')}
          >
            <Plus size={18} weight="bold" />
          </Button>
        ) : null}
        <button
          type="button"
          className={iconButtonClass}
          aria-label={tTopbar('openNotifications')}
          onClick={() => router.push('/notifications')}
        >
          <Bell size={20} />
        </button>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
