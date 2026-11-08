"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useCurrentUser } from "@/components/providers/user-provider";
import { AuthRequestError } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Select, SelectItem } from "@/components/ui/select";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, status } = useCurrentUser();
  const t = useTranslations("auth.signUp");
  const idiomaAtual = useLocale();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState<"pt-BR" | "en">(idiomaAtual === "en" ? "en" : "pt-BR");
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
      let mensagem = t("errors.generic");
      if (error instanceof AuthRequestError && error.status === 400) mensagem = t("errors.invalid");
      if (error instanceof AuthRequestError && error.status === 429) mensagem = t("errors.tooMany");
      setErrorMessage(mensagem);
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
      <div className="space-y-2">
        <h1 className="font-display text-[32px] font-semibold leading-tight text-ink">{t("title")}</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          {t("description")}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="company">{t("fields.company")}</Label>
          <Input
            id="company"
            name="company"
            placeholder={t("placeholders.company")}
            autoComplete="organization"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">{t("fields.email")}</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            placeholder={t("placeholders.email")}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">{t("fields.password")}</Label>
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
          <p className="text-xs text-muted">{t("fields.passwordHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-locale">{t("fields.locale")}</Label>
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
          <Notice tone="danger">{errorMessage}</Notice>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={isDisabled}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="text-sm text-muted">
        {t("hasAccount")}{' '}
        <Link href="/sign-in" className="font-semibold text-primary-strong underline-offset-4 hover:underline">
          {t("signIn")}
        </Link>
      </div>
    </div>
  );
}
