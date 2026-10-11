'use client';

import type { Route } from 'next';
import { ReactNode, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Bell, MagnifyingGlass, X } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { GlobalSearch, type SearchScope } from '@/components/layout/global-search';

interface TopbarProps {
  credits?: string;
  onCreateProposal?: () => void;
  actions?: ReactNode;
  mobileNavTrigger?: ReactNode;
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
  const tSearch = useTranslations('common.search');
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  const iconButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

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
    <header className="sticky top-0 z-30 border-b border-outline/40 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {mobileNavTrigger ? <div className="shrink-0 lg:hidden">{mobileNavTrigger}</div> : null}
          <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="hidden h-9 min-w-[240px] max-w-md flex-1 items-center gap-2 rounded-md border border-outline bg-white px-3 text-sm text-muted md:inline-flex"
                aria-label={tTopbar('openSearch')}
              >
                <MagnifyingGlass size={16} />
                <span className="truncate">{tSearch('action')}</span>
              </button>
            </Dialog.Trigger>
            <Dialog.Trigger asChild>
              <button type="button" className={`${iconButtonClass} md:hidden`} aria-label={tTopbar('openSearch')}>
                <MagnifyingGlass size={18} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
              <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
                <div className="relative w-full max-w-2xl">
                  <GlobalSearch autoFocus onSearch={handleSearch} />
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="absolute -top-12 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline bg-white text-ink shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label={tTopbar('closeSearch')}
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {credits && (
            <span className="mr-2 hidden items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs text-muted sm:inline-flex">
              {t('credits.label')}
              <span className="font-semibold text-ink">{credits}</span>
            </span>
          )}
          <button
            type="button"
            className={iconButtonClass}
            aria-label={tTopbar('openNotifications')}
            onClick={() => router.push('/notifications')}
          >
            <Bell size={18} />
          </button>
          <LocaleSwitcher variant="icon" ariaLabel={tTopbar('openLocale')} />
          {onCreateProposal ? (
            <Button size="sm" onClick={onCreateProposal} className="ml-2 hidden md:inline-flex">
              {tActions('createProposal')}
            </Button>
          ) : null}
          {actions ? <div className="ml-2 flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
