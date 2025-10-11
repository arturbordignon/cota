'use client';

import { ReactNode, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Bell, MagnifyingGlass, X } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { GlobalSearch, type SearchScope } from '@/components/layout/global-search';

interface TopbarProps {
  credits?: number;
  onCreateProposal?: () => void;
  actions?: ReactNode;
  mobileNavTrigger?: ReactNode;
}

export function Topbar({
  credits = 100,
  onCreateProposal,
  actions,
  mobileNavTrigger,
}: TopbarProps) {
  const t = useTranslations('dashboard');
  const tActions = useTranslations('actions');
  const tTopbar = useTranslations('topbar');
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  const iconButtonClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline bg-white text-ink shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  const handleSearch = (query: string, scope: SearchScope) => {
    const encodedQuery = encodeURIComponent(query);

    const routeMap: Record<SearchScope, string> = {
      all: `/proposals?search=${encodedQuery}`,
      proposals: `/proposals?search=${encodedQuery}`,
      clients: `/clients?search=${encodedQuery}`,
      templates: `/templates?search=${encodedQuery}`,
    };

    setSearchOpen(false);
    router.push(routeMap[scope]);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-outline/30 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {mobileNavTrigger ? <div className="md:hidden shrink-0">{mobileNavTrigger}</div> : null}
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="truncate text-xl font-semibold text-ink sm:text-xl">{t('title')}</p>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-outline/50 bg-white px-2 py-0.5 text-xs font-medium text-muted">
                {t('credits.label')}:<span className="text-primary">{credits}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className={iconButtonClass} aria-label={tTopbar('openSearch')}>
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
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateProposal}
              className="hidden md:inline-flex"
            >
              {tActions('createProposal')}
            </Button>
          ) : null}
          {actions ? <div className="ml-2 flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
