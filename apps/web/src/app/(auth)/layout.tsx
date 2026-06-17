"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/components/providers/user-provider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useCurrentUser();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const content =
    status === "loading" ? (
      <div className="flex min-h-[280px] items-center justify-center text-sm text-muted">
        Carregando sessão...
      </div>
    ) : (
      children
    );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-white via-white to-primary-soft lg:flex-row">
      <div className="flex w-full flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="glass-panel w-full max-w-md bg-white/90 p-8 shadow-lg sm:p-10">
          {content}
        </div>
      </div>
      <aside className="hidden w-full max-w-xl flex-col justify-between gap-12 bg-surface/70 px-12 py-16 text-ink lg:flex">
        <div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Crane Proposals
          </span>
          <h2 className="mt-6 text-3xl font-semibold leading-snug text-ink">
            Transforme pedidos em propostas profissionais em minutos.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Gere PDFs bilíngues, acompanhe status e compartilhe links seguros com seus clientes. Nosso fluxo combina templates ajustáveis com upload de fotos e totalizadores automáticos.
          </p>
        </div>
        <div className="rounded-2xl border border-outline bg-white/70 p-6 shadow-sm">
          <p className="text-sm text-muted">“Economizamos horas toda semana com o gerador de propostas. Os clientes recebem o PDF e a landing page com a nossa marca em segundos.”</p>
          <div className="mt-4 text-sm font-semibold text-ink">Ana Ribeiro • Diretora Comercial</div>
        </div>
      </aside>
    </div>
  );
}
