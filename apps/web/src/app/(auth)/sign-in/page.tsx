"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACCOUNT_SLUG_KEY = "crane.accountSlug";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, status } = useCurrentUser();

  const [accountSlug, setAccountSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSlug = window.localStorage.getItem(ACCOUNT_SLUG_KEY);
    if (storedSlug) {
      setAccountSlug(storedSlug);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn({ accountSlug: accountSlug.trim(), email: email.trim(), password });
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao entrar. Tente novamente.";
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  const isDisabled =
    isSubmitting || accountSlug.trim().length === 0 || !email.includes("@") || password.length < 8;

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-semibold text-ink">Bem-vindo de volta</h1>
        <p className="text-sm text-muted">
          Acesse sua conta para continuar gerando propostas e acompanhando clientes.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="account-slug">Slug da conta</Label>
          <Input
            id="account-slug"
            name="accountSlug"
            placeholder="minha-empresa"
            autoComplete="organization"
            value={accountSlug}
            onChange={(event) => setAccountSlug(event.target.value)}
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-muted">O slug foi gerado no momento do cadastro, ex: minha-empresa.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail corporativo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nome@empresa.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </div>
        </div>
        {errorMessage ? (
          <p className="rounded-lg border border-danger/40 bg-danger-soft/20 px-3 py-2 text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={isDisabled}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="text-center text-sm text-muted">
        Não possui conta?{' '}
        <Link href="/sign-up" className="font-semibold text-primary hover:underline">
          Criar conta agora
        </Link>
      </div>
    </div>
  );
}
