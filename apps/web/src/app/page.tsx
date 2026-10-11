"use client";

import type { Route } from "next";
import Link from "next/link";

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
      <header className="border-b border-outline/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="font-display text-lg font-semibold">Crane Proposals</span>
          <div className="flex items-center gap-3">
            <Link href={"/sign-in" as Route} className="text-sm font-medium text-muted hover:text-ink">
              Entrar
            </Link>
            <Link
              href={"/sign-up" as Route}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-ink hover:bg-primary/90"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p className="text-sm font-medium text-[var(--color-primary-strong)]">Propostas de içamento</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight md:text-5xl">
            A proposta sai pronta para o cliente abrir e responder.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Cadastre o serviço, monte a operação e envie um link. O cliente vê o valor, baixa o PDF e aceita ou recusa.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={"/sign-up" as Route}
              className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-ink hover:bg-primary/90"
            >
              Começar
            </Link>
            <Link
              href={"/sign-in" as Route}
              className="rounded-lg border border-outline px-5 py-3 text-sm font-semibold text-ink hover:bg-primary-soft"
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        <section className="border-t border-outline/40 bg-[var(--color-background)]">
          <ol className="mx-auto grid max-w-5xl gap-8 px-6 py-14 md:grid-cols-3">
            {passos.map((passo, indice) => (
              <li key={passo.titulo}>
                <p className="text-sm font-semibold text-[var(--color-primary-strong)]">{indice + 1}</p>
                <h2 className="mt-2 text-lg font-semibold">{passo.titulo}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
