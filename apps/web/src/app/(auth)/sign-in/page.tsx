"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useCurrentUser } from "@/components/providers/user-provider";
import { AuthRequestError } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";

const ACCOUNT_SLUG_KEY = "cota.accountSlug";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, status } = useCurrentUser();
  const t = useTranslations("auth.signIn");

  const [accountSlug, setAccountSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
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
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(mensagemDeErro(error));
      setIsSubmitting(false);
    }
  };

  const mensagemDeErro = (error: unknown) => {
    if (error instanceof AuthRequestError) {
      if (error.status === 401 || error.status === 400) return t("errors.invalid");
      if (error.status === 429) return t("errors.tooMany");
    }
    return t("errors.generic");
  };

  const isDisabled =
    isSubmitting || accountSlug.trim().length === 0 || !email.includes("@") || password.length < 8;

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
          <Label htmlFor="account-slug">{t("fields.account")}</Label>
          <Input
            id="account-slug"
            name="accountSlug"
            placeholder={t("placeholders.account")}
            autoComplete="organization"
            value={accountSlug}
            onChange={(event) => setAccountSlug(event.target.value)}
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-muted">{t("fields.accountHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("fields.email")}</Label>
          <Input
            id="email"
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
          <Label htmlFor="password">{t("fields.password")}</Label>
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
        </div>
        {errorMessage ? (
          <Notice tone="danger">{errorMessage}</Notice>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={isDisabled}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="text-sm text-muted">
        {t("noAccount")}{' '}
        <Link href="/sign-up" className="font-semibold text-primary-strong underline-offset-4 hover:underline">
          {t("createAccount")}
        </Link>
      </div>
    </div>
  );
}
