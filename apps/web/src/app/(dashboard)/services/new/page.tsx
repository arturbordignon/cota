"use client";

import type { Route } from "next";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";

function numeroOuNulo(valor: string) {
  if (!valor.trim()) {
    return null;
  }
  const convertido = Number(valor.replace(",", "."));
  if (!Number.isFinite(convertido)) {
    return null;
  }
  return convertido;
}

export default function NovoServicoPage() {
  const api = useApi();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [diaria, setDiaria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const registrar = useMutation({
    mutationFn: () =>
      api.post("/equipment", {
        name: nome.trim(),
        capacityTons: numeroOuNulo(capacidade) ?? undefined,
        dailyRate: numeroOuNulo(diaria) ?? undefined,
        description: descricao.trim() || undefined,
        notes: observacoes.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["equipment"] });
      router.push("/services" as Route);
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        setErro(error.message);
        return;
      }
      setErro("Não foi possível salvar o serviço.");
    },
  });

  const salvar = (event: FormEvent) => {
    event.preventDefault();
    if (!nome.trim()) {
      setErro("Informe o nome do serviço.");
      return;
    }
    setErro(null);
    registrar.mutate();
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Novo serviço"
        description="Cadastre um equipamento ou pacote para reutilizar nas propostas."
      />
      <Card className="max-w-3xl p-5 sm:p-6">
        <form className="space-y-5" onSubmit={salvar}>
          <Field label="Nome" htmlFor="service-name">
            <Input
              id="service-name"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Guindaste 50t"
              required
              disabled={registrar.isPending}
            />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Capacidade (t)" htmlFor="service-capacity">
              <Input
                id="service-capacity"
                inputMode="decimal"
                value={capacidade}
                onChange={(event) => setCapacidade(event.target.value)}
                placeholder="Ex.: 50"
                disabled={registrar.isPending}
              />
            </Field>
            <Field label="Valor diário (BRL)" htmlFor="service-rate">
              <Input
                id="service-rate"
                inputMode="decimal"
                value={diaria}
                onChange={(event) => setDiaria(event.target.value)}
                placeholder="Ex.: 2500"
                disabled={registrar.isPending}
              />
            </Field>
          </div>
          <Field label="Descrição" htmlFor="service-description">
            <Textarea
              id="service-description"
              rows={3}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Resumo do serviço ou equipamento"
              disabled={registrar.isPending}
            />
          </Field>
          <Field label="Observações internas" htmlFor="service-notes">
            <Textarea
              id="service-notes"
              rows={2}
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Links, restrições ou observações"
              disabled={registrar.isPending}
            />
          </Field>
          {erro ? <Notice tone="danger">{erro}</Notice> : null}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" asChild>
              <Link href={"/services" as Route}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={registrar.isPending || !nome.trim()} loading={registrar.isPending} loadingText="Salvando...">
              Salvar serviço
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
