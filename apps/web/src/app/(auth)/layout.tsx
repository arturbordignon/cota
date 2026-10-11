"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { ProposalSheet } from "@/components/brand/proposal-sheet";
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
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10 lg:px-16">
        <Link href="/" className="self-start rounded-lg">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{content}</div>
        </div>
      </div>

      <aside className="hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div className="max-w-md">
          <h2 className="text-balance font-display text-[34px] font-semibold leading-[1.1] text-ink">
            Do pedido de içamento à proposta aceita, no mesmo fluxo.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/75">
            Monte a operação, gere o PDF com a sua marca e envie um link para o cliente aceitar ou recusar.
          </p>
        </div>
        <div className="mt-10">
          <ProposalSheet className="rotate-[-1.5deg]" />
        </div>
      </aside>
    </div>
  );
}
