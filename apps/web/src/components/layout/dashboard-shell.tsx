'use client';

import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCurrentUser } from '@/components/providers/user-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';

interface DashboardShellProps extends PropsWithChildren {
  headerActions?: ReactNode;
  credits?: number;
}

export function DashboardShell({ children, headerActions, credits }: DashboardShellProps) {
  const router = useRouter();
  const { status } = useCurrentUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/sign-in');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background lg:pl-72">
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Topbar
          credits={credits}
          actions={headerActions}
          onCreateProposal={() => router.push('/proposals/new')}
          mobileNavTrigger={<MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
