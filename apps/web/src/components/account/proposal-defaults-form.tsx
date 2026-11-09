"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import type { ProposalDefaults, ProposalDefaultsResponse } from "@/types/api";

type Formulario = { condicoes: string; equipe: string; validade: string };

function separarLinhas(texto: string) {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}

function paraFormulario(padroes: ProposalDefaults): Formulario {
  return {
    condicoes: padroes.terms.join("\n"),
    equipe: padroes.team.join("\n"),
    validade: padroes.validityDays ? String(padroes.validityDays) : "",
  };
}

// Terms, crew and validity every new proposal starts with, in the wizard and
// through the assistant. Typed once here instead of on every proposal.
export function ProposalDefaultsForm() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { temPermissao } = useCurrentUser();
  const podeEditar = temPermissao("templates", "edit");
  const t = useTranslations("account.defaults");
  const [formulario, setFormulario] = useState<Formulario>({ condicoes: "", equipe: "", validade: "" });
  const [mensagem, setMensagem] = useState<string | null>(null);

  const padroesQuery = useQuery({
    queryKey: ["account", "proposal-defaults"],
    queryFn: () => api.get<ProposalDefaultsResponse>("/account/proposal-defaults"),
    enabled: api.isAuthenticated,
  });

  useEffect(() => {
    if (padroesQuery.data) {
      setFormulario(paraFormulario(padroesQuery.data.data));
    }
  }, [padroesQuery.data]);

  const salvar = useMutation({
    mutationFn: () => {
      const dias = Number(formulario.validade);
      const corpo: ProposalDefaults = {
        terms: separarLinhas(formulario.condicoes),
        team: separarLinhas(formulario.equipe),
        validityDays: Number.isInteger(dias) && dias > 0 ? dias : null,
      };
      return api.put<ProposalDefaultsResponse>("/account/proposal-defaults", corpo);
    },
    onMutate: () => setMensagem(null),
    onSuccess: () => {
      setMensagem(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["account", "proposal-defaults"] });
    },
    onError: () => setMensagem(t("error")),
  });

  return (
    <Card>
      <div className="space-y-1 border-b border-border p-5 sm:px-6">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </div>

      <form
        className="grid gap-5 p-5 sm:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          salvar.mutate();
        }}
      >
        <Field label={t("terms")} htmlFor="padrao-condicoes" hint={t("oneLine")}>
          <Textarea
            id="padrao-condicoes"
            value={formulario.condicoes}
            placeholder={t("termsPlaceholder")}
            disabled={!podeEditar}
            rows={5}
            onChange={(event) => setFormulario((anterior) => ({ ...anterior, condicoes: event.target.value }))}
          />
        </Field>
        <Field label={t("team")} htmlFor="padrao-equipe" hint={t("oneLine")}>
          <Textarea
            id="padrao-equipe"
            value={formulario.equipe}
            placeholder={t("teamPlaceholder")}
            disabled={!podeEditar}
            rows={3}
            onChange={(event) => setFormulario((anterior) => ({ ...anterior, equipe: event.target.value }))}
          />
        </Field>
        <Field label={t("validity")} htmlFor="padrao-validade" className="max-w-[220px]">
          <Input
            id="padrao-validade"
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={formulario.validade}
            placeholder="15"
            disabled={!podeEditar}
            onChange={(event) => setFormulario((anterior) => ({ ...anterior, validade: event.target.value }))}
          />
        </Field>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
          {mensagem && <p className="mr-auto text-sm text-muted">{mensagem}</p>}
          {podeEditar ? (
            <Button type="submit" loading={salvar.isPending} loadingText={t("saving")}>
              {t("save")}
            </Button>
          ) : (
            <p className="text-xs text-muted">{t("noPermission")}</p>
          )}
        </div>
      </form>
    </Card>
  );
}
