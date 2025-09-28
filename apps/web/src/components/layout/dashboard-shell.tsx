'use client';

import { PropsWithChildren, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';

interface DashboardShellProps extends PropsWithChildren {
  headerActions?: ReactNode;
  userName?: string;
  credits?: number;
}

export function DashboardShell({
  children,
  headerActions,
  userName,
  credits,
}: DashboardShellProps) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:pl-72">
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Topbar
          userName={userName}
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
