"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

function classeChip(ativo: boolean) {
  if (ativo) {
    return "border-primary bg-primary text-ink";
  }
  return "border-outline bg-white text-ink hover:border-primary/60";
}

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
    <div className="flex flex-col gap-3 rounded-xl border border-outline/70 bg-white px-3 py-3 sm:px-4">
      <form className="flex flex-col gap-3 lg:flex-row lg:items-center" onSubmit={enviar}>
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-outline bg-white px-3">
          <MagnifyingGlass size={16} className="shrink-0 text-muted" />
          <input
            value={rascunho}
            onChange={(event) => setRascunho(event.target.value)}
            placeholder={placeholder}
            className="h-full w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </label>
        <Button type="submit" size="sm">
          {tSearch("action")}
        </Button>
        {extra && <div className="shrink-0">{extra}</div>}
        {mostrarLimpar && aoLimpar ? (
          <button
            type="button"
            onClick={() => {
              setRascunho("");
              aoLimpar();
            }}
            className="shrink-0 text-sm font-medium text-muted hover:text-ink"
          >
            {rotuloLimpar}
          </button>
        ) : null}
      </form>
      {opcoes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {opcoes.map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => aoEscolher(opcao.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                classeChip(opcao.id === opcaoAtiva),
              )}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
