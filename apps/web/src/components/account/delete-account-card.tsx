"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";

import { useCurrentUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { ApiError, useApi } from "@/hooks/use-api";

// Right to erasure: the owner removes the workspace and all of its data.
export function DeleteAccountCard() {
  const api = useApi();
  const { user, isOwner, signOut } = useCurrentUser();
  const t = useTranslations("account.deleteAccount");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const excluirConta = useMutation({
    mutationFn: () => api.del("/account", { password: senha, confirmSlug: confirmacao }),
    onSuccess: () => signOut(),
  });

  if (!isOwner || !user) {
    return null;
  }

  const mensagemDeErro = (error: unknown) => {
    if (error instanceof ApiError && error.status === 400) return t("errors.slug");
    if (error instanceof ApiError && error.status === 403) return t("errors.password");
    if (error instanceof ApiError && error.status === 502) return t("errors.billing");
    return t("errors.generic");
  };

  const slug = user.account.slug;
  const podeExcluir = senha.length > 0 && confirmacao.trim() === slug;

  return (
    <Card className="border-danger/40 p-5">
      <CardTitle>{t("title")}</CardTitle>
      <CardDescription>{t("description")}</CardDescription>

      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          excluirConta.mutate();
        }}
      >
        <Field label={t("confirmLabel", { slug })} htmlFor="delete-account-slug">
          <Input
            id="delete-account-slug"
            value={confirmacao}
            autoComplete="off"
            onChange={(event) => setConfirmacao(event.target.value)}
          />
        </Field>
        <Field label={t("password")} htmlFor="delete-account-password">
          <Input
            id="delete-account-password"
            type="password"
            value={senha}
            autoComplete="current-password"
            onChange={(event) => setSenha(event.target.value)}
          />
        </Field>

        {excluirConta.isError && <Notice tone="danger">{mensagemDeErro(excluirConta.error)}</Notice>}

        <Button
          type="submit"
          variant="danger"
          disabled={!podeExcluir}
          loading={excluirConta.isPending}
          loadingText={t("submitting")}
        >
          {t("submit")}
        </Button>
      </form>
    </Card>
  );
}
