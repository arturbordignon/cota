"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import * as authClient from "@/lib/auth-client";
import { useCurrentUser } from "@/components/providers/user-provider";

interface InvitePreview {
  email: string;
  fullName?: string | null;
  account: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signIn } = useCurrentUser();

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Convite inválido. Verifique o link recebido.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    authClient
      .getInvitePreview(token)
      .then((response) => {
        if (!active) return;
        setPreview(response.data);
        setFullName(response.data.fullName ?? "");
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setPreview(null);
        setError(err instanceof Error ? err.message : "Não foi possível validar o convite.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preview || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await authClient.acceptInvite({ token, fullName: fullName.trim() || undefined, password });
      await signIn({
        accountSlug: preview.account.slug,
        email: preview.email,
        password,
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível aceitar o convite.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">Validando convite…</h1>
        <p className="text-sm text-muted">Aguarde um instante.</p>
      </div>
    );
  }

  if (!preview || error) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">Convite inválido</h1>
          <p className="text-[15px] leading-relaxed text-muted">
            {error ?? "Não foi possível encontrar este convite. Solicite um novo link ao administrador."}
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/sign-in">Ir para o acesso</Link>
        </Button>
      </div>
    );
  }

  const isDisabled = submitting || password.length < 8;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-[32px] font-semibold leading-tight text-ink">Bem-vindo(a) à {preview.account.name}</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Conclua seu cadastro e comece a colaborar com a equipe.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input value={preview.email} readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accept-name">Nome completo</Label>
          <Input
            id="accept-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accept-password">Defina uma senha</Label>
          <Input
            id="accept-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={submitting}
            required
          />
          <p className="text-xs text-muted">Use ao menos 8 caracteres, misturando letras e números.</p>
        </div>
        {error ? (
          <Notice tone="danger">{error}</Notice>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={isDisabled}>
          {submitting ? "Concluindo convite..." : "Entrar na conta"}
        </Button>
      </form>

      <div className="text-sm text-muted">
        Problemas com o link?{' '}
        <Link href="/sign-in" className="font-semibold text-primary-strong underline-offset-4 hover:underline">
          Acesse com suas credenciais
        </Link>
      </div>
    </div>
  );
}
