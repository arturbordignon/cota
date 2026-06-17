"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useCurrentUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, status } = useCurrentUser();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState<"pt-BR" | "en">("pt-BR");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signUp({ accountName: companyName.trim(), email: email.trim(), password, locale });
      router.replace("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar a conta.";
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const isDisabled =
    isSubmitting || companyName.trim().length < 2 || !email.includes("@") || password.length < 8;

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-semibold text-ink">Criar conta</h1>
        <p className="text-sm text-muted">
          Monte seu ambiente, defina idioma padrão e convide a equipe para colaborar nas propostas.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="company">Nome da empresa</Label>
          <Input
            id="company"
            name="company"
            placeholder="ServicePro"
            autoComplete="organization"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">E-mail profissional</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            placeholder="contato@empresa.com.br"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Senha</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-muted">Use pelo menos 8 caracteres, incluindo letras e números.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-locale">Idioma padrão</Label>
          <Select
            value={locale}
            onValueChange={(value) => setLocale(value as "pt-BR" | "en")}
            disabled={isSubmitting}
          >
            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </Select>
        </div>
        {errorMessage ? (
          <p className="rounded-lg border border-danger/40 bg-danger-soft/20 px-3 py-2 text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={isDisabled}>
          {isSubmitting ? "Criando conta..." : "Criar conta gratuita"}
        </Button>
      </form>

      <div className="text-center text-sm text-muted">
        Já possui uma conta?{' '}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  );
}
