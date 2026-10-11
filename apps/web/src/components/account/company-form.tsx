"use client";

import { useEffect, useState } from "react";
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

const campos: Array<{ chave: keyof CompanyInfo; rotulo: string; placeholder: string }> = [
  { chave: "name", rotulo: "Nome da empresa", placeholder: "Guindastes Exemplo Ltda" },
  { chave: "cnpj", rotulo: "CNPJ", placeholder: "00.000.000/0001-00" },
  { chave: "phone", rotulo: "Telefone", placeholder: "(11) 0000-0000" },
  { chave: "email", rotulo: "E-mail comercial", placeholder: "contato@empresa.com.br" },
  { chave: "address", rotulo: "Endereço", placeholder: "Rua, número - Cidade/UF" },
  { chave: "tagline", rotulo: "Slogan", placeholder: "Içamentos com segurança e precisão" },
];

export function CompanyForm() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { isOwner } = useCurrentUser();
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
      setMensagem("Dados da empresa atualizados.");
      queryClient.invalidateQueries({ queryKey: ["account", "settings"] });
    },
    onError: (error: Error) => setMensagem(error.message),
  });

  return (
    <Card>
      <div className="space-y-1 border-b border-border p-5 sm:px-6">
        <CardTitle>Dados da empresa</CardTitle>
        <CardDescription>
          Estas informações aparecem no cabeçalho e no rodapé de todas as propostas.
        </CardDescription>
        {contaQuery.data && (
          <p className="pt-2 text-sm text-muted">
            Identificador da conta (usado no login):{" "}
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
            key={campo.chave}
            label={campo.rotulo}
            htmlFor={`company-${campo.chave}`}
            className={campo.chave === "address" || campo.chave === "tagline" ? "sm:col-span-2" : undefined}
          >
            <Input
              id={`company-${campo.chave}`}
              value={empresa[campo.chave]}
              placeholder={campo.placeholder}
              disabled={!isOwner}
              required={campo.chave === "name"}
              onChange={(event) => setEmpresa((anterior) => ({ ...anterior, [campo.chave]: event.target.value }))}
            />
          </Field>
        ))}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5 sm:col-span-2">
          {mensagem && <p className="mr-auto text-sm text-muted">{mensagem}</p>}
          {isOwner && (
            <Button type="submit" loading={salvarEmpresa.isPending} loadingText="Salvando...">
              Salvar dados da empresa
            </Button>
          )}
          {!isOwner && (
            <p className="text-xs text-muted">Somente o proprietário da conta pode alterar estes dados.</p>
          )}
        </div>
      </form>
    </Card>
  );
}
