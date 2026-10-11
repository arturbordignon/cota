"use client";

import type { Route } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ProposalSheet } from "@/components/brand/proposal-sheet";
import { Button } from "@/components/ui/button";

const passos = [
  {
    titulo: "Monte a proposta",
    texto: "Escolha o cliente, o equipamento, o período e os valores. O total sai da mobilização mais a diária.",
  },
  {
    titulo: "Gere o PDF",
    texto: "O documento sai com os dados da sua empresa, o escopo e as fotos da operação.",
  },
  {
    titulo: "Envie o link",
    texto: "O cliente abre a proposta, baixa o PDF e aceita ou recusa sem criar conta.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href={"/sign-in" as Route}>Entrar</Link>
            </Button>
            <Button asChild>
              <Link href={"/sign-up" as Route}>Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <p className="text-sm font-semibold text-primary-strong">Propostas de içamento</p>
            <h1 className="mt-3 max-w-xl text-balance font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.015em] md:text-[56px]">
              A proposta sai pronta para o cliente abrir e responder.
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
              Cadastre o serviço, monte a operação e envie um link. O cliente vê o valor, baixa o PDF e aceita ou recusa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={"/sign-up" as Route}>Começar</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={"/sign-in" as Route}>Já tenho conta</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center pb-6 pr-6 lg:justify-end">
            <div className="relative w-full max-w-[380px]">
              <div aria-hidden className="absolute inset-0 translate-x-5 translate-y-5 rounded-2xl bg-primary" />
              <ProposalSheet className="relative rotate-[-1.5deg]" />
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface-muted/60">
          <ol className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
            {passos.map((passo, indice) => (
              <li key={passo.titulo} className="flex gap-4">
                <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-base font-semibold text-white">
                  {indice + 1}
                </span>
                <div>
                  <h2 className="text-xl font-semibold leading-tight">{passo.titulo}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
