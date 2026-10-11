import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type NotificationEntry = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: 'success' | 'info' | 'warning';
};

const toneDot: Record<NotificationEntry['tone'], string> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
};

export default async function NotificationsPage() {
  const t = await getTranslations('notifications');
  const notifications = (t.raw('items') as NotificationEntry[]) ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={<Button variant="secondary">{t('markAll')}</Button>}
      />

      <Card className="divide-y divide-border">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
          >
            <div className="flex min-w-0 gap-3">
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[notification.tone]}`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-sans text-[15px] font-semibold text-ink">{notification.title}</h3>
                  <Badge tone={notification.tone}>{t(`tone.${notification.tone}`)}</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{notification.description}</p>
              </div>
            </div>
            <div className="shrink-0 pl-5 text-xs text-muted sm:pl-0">{notification.timestamp}</div>
          </article>
        ))}
      </Card>
    </section>
  );
}
