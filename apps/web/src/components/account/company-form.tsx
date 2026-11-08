"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import type { AccountSettingsResponse, CompanyInfo } from "@/types/api";

const empresaVazia: Required<CompanyInfo> = {
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  tagline: "",
};

const campos: Array<keyof CompanyInfo> = ["name", "cnpj", "phone", "email", "address", "tagline"];

export function CompanyForm() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { isOwner } = useCurrentUser();
  const t = useTranslations("account.company");
  const [empresa, setEmpresa] = useState(empresaVazia);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const contaQuery = useQuery({
    queryKey: ["account", "settings"],
    queryFn: () => api.get<AccountSettingsResponse>("/account"),
    enabled: api.isAuthenticated,
  });

  useEffect(() => {
    if (!contaQuery.data) {
      return;
    }
    setEmpresa({ ...empresaVazia, ...contaQuery.data.data.company });
  }, [contaQuery.data]);

  const salvarEmpresa = useMutation({
    mutationFn: () => api.put<{ data: { company: CompanyInfo } }>("/account/company", empresa),
    onMutate: () => setMensagem(null),
    onSuccess: () => {
      setMensagem(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["account", "settings"] });
    },
    onError: () => setMensagem(t("error")),
  });

  return (
    <Card>
      <div className="space-y-1 border-b border-border p-5 sm:px-6">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        {contaQuery.data && (
          <p className="pt-2 text-sm text-muted">
            {t("accountId")}{" "}
            <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-semibold text-ink">
              {contaQuery.data.data.slug}
            </span>
          </p>
        )}
      </div>

      <form
        className="grid gap-5 p-5 sm:grid-cols-2 sm:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          salvarEmpresa.mutate();
        }}
      >
        {campos.map((campo) => (
          <Field
            key={campo}
            label={t(`fields.${campo}`)}
            htmlFor={`company-${campo}`}
            className={campo === "address" || campo === "tagline" ? "sm:col-span-2" : undefined}
          >
            <Input
              id={`company-${campo}`}
              value={empresa[campo]}
              placeholder={t(`placeholders.${campo}`)}
              disabled={!isOwner}
              required={campo === "name"}
              onChange={(event) => setEmpresa((anterior) => ({ ...anterior, [campo]: event.target.value }))}
            />
          </Field>
        ))}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5 sm:col-span-2">
          {mensagem && <p className="mr-auto text-sm text-muted">{mensagem}</p>}
          {isOwner && (
            <Button type="submit" loading={salvarEmpresa.isPending} loadingText={t("saving")}>
              {t("save")}
            </Button>
          )}
          {!isOwner && (
            <p className="text-xs text-muted">{t("ownerOnly")}</p>
          )}
        </div>
      </form>
    </Card>
  );
}
