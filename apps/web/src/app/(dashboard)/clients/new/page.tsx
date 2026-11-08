"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import {
  ClientFormFields,
  clientFormSchema,
  emptyClientForm,
  toClientPayload,
  type ClientFormValues,
} from "@/components/clients/client-form-fields";
import { useApi } from "@/hooks/use-api";
import { useErrorMessage } from "@/hooks/use-error-message";

export default function NewClientPage() {
  const t = useTranslations("clients.newPage");
  const tDialog = useTranslations("clients.dialog");
  const mensagemDeErro = useErrorMessage();
  const api = useApi();
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientForm,
  });

  const createClient = useMutation({
    mutationFn: (values: ClientFormValues) => api.post("/clients", toClientPayload(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      router.push("/clients");
    },
  });

  return (
    <section className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="max-w-3xl p-5 sm:p-6">
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => createClient.mutate(values))}
          noValidate
        >
          <ClientFormFields form={form} disabled={createClient.isPending} autoFocus />

          {createClient.error ? <Notice tone="danger">{mensagemDeErro(createClient.error)}</Notice> : null}

          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button asChild variant="ghost">
              <Link href="/clients">{tDialog("cancel")}</Link>
            </Button>
            <Button type="submit" loading={createClient.isPending} loadingText={tDialog("saving")}>
              {tDialog("save")}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
