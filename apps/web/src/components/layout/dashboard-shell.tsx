'use client';

import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/use-api';
import { useCurrentUser } from '@/components/providers/user-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import type { BillingOverviewResponse } from '@/types/api';

interface DashboardShellProps extends PropsWithChildren {
  headerActions?: ReactNode;
}

function montarCreditos(resposta?: BillingOverviewResponse) {
  if (!resposta) {
    return undefined;
  }
  if (!resposta.data.usage.total) {
    return '∞';
  }
  return String(Math.max(resposta.data.usage.total - resposta.data.usage.used, 0));
}

export function DashboardShell({ children, headerActions }: DashboardShellProps) {
  const router = useRouter();
  const api = useApi();
  const { status, temPermissao } = useCurrentUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const overviewQuery = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: () => api.get<BillingOverviewResponse>('/billing/overview'),
    enabled: status === 'authenticated',
  });

  // load from cookie
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)sidebar-collapsed=(true|false)/);
    if (match) setSidebarCollapsed(match[1] === 'true');
  }, []);

  // redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/sign-in');
  }, [status, router]);

  const handleToggleSidebar = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    document.cookie = `sidebar-collapsed=${collapsed ? 'true' : 'false'}; Path=/; Max-Age=${
      60 * 60 * 24 * 30
    }; SameSite=Lax`;
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    );
  }
  if (status === 'unauthenticated') return null;

  let abrirNovaProposta: (() => void) | undefined;
  if (temPermissao('proposals', 'edit')) {
    abrirNovaProposta = () => router.push('/proposals/new');
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-background transition-all duration-300',
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72',
      )}
    >
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
      <div className="flex min-h-screen flex-col">
        <Topbar
          credits={montarCreditos(overviewQuery.data)}
          actions={headerActions}
          onCreateProposal={abrirNovaProposta}
          mobileNavTrigger={<MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
