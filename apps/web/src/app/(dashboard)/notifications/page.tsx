import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const notifications = [
  {
    id: 'notif-1',
    title: 'Proposta aceita',
    description: 'A empresa Atlas Engenharia aprovou a proposta #2418.',
    timestamp: 'Há 2 horas',
    tone: 'success' as const,
  },
  {
    id: 'notif-2',
    title: 'Comentário adicionado',
    description: 'João Lima comentou na proposta #2397 pedindo ajuste de valores.',
    timestamp: 'Ontem',
    tone: 'info' as const,
  },
  {
    id: 'notif-3',
    title: 'Pagamento pendente',
    description: 'A assinatura da equipe Operations expira em 3 dias.',
    timestamp: 'Há 3 dias',
    tone: 'warning' as const,
  },
];

export default async function NotificationsPage() {
  const t = await getTranslations('notifications');

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
