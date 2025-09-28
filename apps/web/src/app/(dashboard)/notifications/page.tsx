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

export default async function NotificationsPage() {
  const t = await getTranslations('notifications');
  const notifications = (t.raw('items') as NotificationEntry[]) ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={<Button variant="outline">{t('markAll')}</Button>}
      />

      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card key={notification.id} className="flex flex-col gap-3 rounded-2xl border border-outline/40 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">{notification.title}</h3>
                <Badge tone={notification.tone}>{t(`tone.${notification.tone}`)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{notification.description}</p>
            </div>
            <div className="self-start text-xs text-muted md:self-center">{notification.timestamp}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}
