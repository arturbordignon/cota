"use client";

import type { Route } from "next";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellSimple } from "@phosphor-icons/react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { NOTIFICATIONS_QUERY_KEY } from "@/lib/notifications";
import type { NotificationItem, NotificationsResponse } from "@/types/api";

const toneDot: Record<NotificationItem["tone"], string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
};

const CHAVES_CONHECIDAS = [
  "proposalViewed",
  "proposalAccepted",
  "proposalDeclined",
  "proposalPdfReady",
  "inviteAccepted",
];

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const api = useApi();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => api.get<NotificationsResponse>("/notifications"),
    enabled: api.isAuthenticated,
  });

  const atualizar = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all", {}),
    onSuccess: atualizar,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`, {}),
    onSuccess: atualizar,
  });

  const notifications = notificationsQuery.data?.data ?? [];
  const unread = notificationsQuery.data?.unreadCount ?? 0;

  // Known keys are shown in the user's language; anything else falls back to
  // the text stored with the notification.
  const textos = (item: NotificationItem) => {
    if (item.key && CHAVES_CONHECIDAS.includes(item.key)) {
      return {
        title: t(`entries.${item.key}.title`),
        body: t(`entries.${item.key}.body`, item.params),
      };
    }
    return { title: item.title, body: item.body };
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button
            variant="secondary"
            disabled={unread === 0}
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {t("markAll")}
          </Button>
        }
      />

      {notificationsQuery.isError ? <Notice tone="danger">{t("loadError")}</Notice> : null}

      {notificationsQuery.isLoading ? (
        <Card className="space-y-4 p-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </Card>
      ) : notifications.length === 0 ? (
        <EmptyState icon={<BellSimple size={24} weight="bold" />} title={t("empty")} />
      ) : (
        <Card className="divide-y divide-border">
          {notifications.map((notification) => {
            const { title, body } = textos(notification);
            const conteudo = (
              <>
                <div className="flex min-w-0 gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      notification.isRead ? "bg-outline" : toneDot[notification.tone],
                    )}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cn(
                          "font-sans text-[15px] text-ink",
                          notification.isRead ? "font-medium" : "font-semibold",
                        )}
                      >
                        {title}
                      </h3>
                      <Badge tone={notification.tone}>{t(`tone.${notification.tone}`)}</Badge>
                      {!notification.isRead ? <span className="sr-only">{t("unread")}</span> : null}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
                  </div>
                </div>
                <time
                  dateTime={notification.createdAt}
                  className="shrink-0 pl-5 text-xs text-muted sm:pl-0"
                  title={format.dateTime(new Date(notification.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                >
                  {format.relativeTime(new Date(notification.createdAt))}
                </time>
              </>
            );
            const classe =
              "flex flex-col gap-2 px-5 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-6";
            const marcar = () => {
              if (!notification.isRead) markOne.mutate(notification.id);
            };
            return notification.link ? (
              <Link
                key={notification.id}
                href={notification.link as Route}
                onClick={marcar}
                className={cn(classe, "hover:bg-surface-muted")}
              >
                {conteudo}
              </Link>
            ) : (
              <article key={notification.id} className={classe} onClick={marcar}>
                {conteudo}
              </article>
            );
          })}
        </Card>
      )}
    </section>
  );
}
