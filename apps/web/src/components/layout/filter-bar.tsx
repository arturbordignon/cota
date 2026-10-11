"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";

export type OpcaoFiltro = {
  id: string;
  rotulo: string;
};

type FilterBarProps = {
  busca: string;
  placeholder: string;
  aoBuscar: (valor: string) => void;
  opcoes: OpcaoFiltro[];
  opcaoAtiva: string;
  aoEscolher: (id: string) => void;
  extra?: ReactNode;
  aoLimpar?: () => void;
  rotuloLimpar?: string;
};

export function FilterBar({
  busca,
  placeholder,
  aoBuscar,
  opcoes,
  opcaoAtiva,
  aoEscolher,
  extra,
  aoLimpar,
  rotuloLimpar,
}: FilterBarProps) {
  const tSearch = useTranslations("common.search");
  const [rascunho, setRascunho] = useState(busca);

  useEffect(() => {
    setRascunho(busca);
  }, [busca]);

  let mostrarLimpar = busca.trim().length > 0;
  if (opcoes.length > 0 && opcaoAtiva !== opcoes[0].id) {
    mostrarLimpar = true;
  }

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    aoBuscar(rascunho.trim());
  };

  return (
    <div className="space-y-3">
      <form className="flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={enviar}>
        <div className="flex min-w-0 flex-1 gap-2">
          <label className="group flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-outline bg-white px-3 shadow-card transition-[border-color,box-shadow] hover:border-ink/30 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/25">
            <MagnifyingGlass size={16} className="shrink-0 text-muted" />
            <input
              value={rascunho}
              onChange={(event) => setRascunho(event.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-full w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-muted/80 focus:outline-none"
            />
          </label>
          <Button type="submit" variant="secondary">
            {tSearch("action")}
          </Button>
        </div>
        {extra ? <div className="shrink-0 sm:w-48">{extra}</div> : null}
      </form>
      {opcoes.length > 0 || (mostrarLimpar && aoLimpar) ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {opcoes.length > 0 ? (
            <Segmented
              options={opcoes.map((opcao) => ({ value: opcao.id, label: opcao.rotulo }))}
              value={opcaoAtiva}
              onChange={aoEscolher}
              size="sm"
            />
          ) : (
            <span />
          )}
          {mostrarLimpar && aoLimpar ? (
            <button
              type="button"
              onClick={() => {
                setRascunho("");
                aoLimpar();
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
            >
              <X size={12} weight="bold" />
              {rotuloLimpar}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
