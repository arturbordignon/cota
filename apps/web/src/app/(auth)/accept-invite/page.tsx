"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

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

type MotivoInvalido = "missing" | "notFound" | "used" | "expired" | "generic";

function motivoDoErro(err: unknown): MotivoInvalido {
  if (err instanceof authClient.AuthRequestError) {
    if (err.status === 404) return "notFound";
    if (err.status === 400) return "used";
    if (err.status === 410) return "expired";
  }
  return "generic";
}

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signIn } = useCurrentUser();
  const t = useTranslations("auth.acceptInvite");

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // A bad link and a failed submit are different: only the first one hides the form.
  const [motivoInvalido, setMotivoInvalido] = useState<MotivoInvalido | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMotivoInvalido("missing");
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
        setMotivoInvalido(null);
      })
      .catch((err) => {
        if (!active) return;
        setPreview(null);
        setMotivoInvalido(motivoDoErro(err));
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
    setErroEnvio(null);

    try {
      await authClient.acceptInvite({ token, fullName: fullName.trim() || undefined, password });
      await signIn({
        accountSlug: preview.account.slug,
        email: preview.email,
        password,
      });
      router.replace("/dashboard");
    } catch (err) {
      const motivo = motivoDoErro(err);
      if (motivo === "used" || motivo === "expired" || motivo === "notFound") {
        setPreview(null);
        setMotivoInvalido(motivo);
      } else {
        setErroEnvio(t("submitError"));
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{t("checking")}</h1>
        <p className="text-sm text-muted">{t("wait")}</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{t("invalidTitle")}</h1>
          <p className="text-[15px] leading-relaxed text-muted">{t(`invalid.${motivoInvalido ?? "generic"}`)}</p>
        </div>
        <Button asChild variant="primary">
          <Link href="/sign-in">{t("goToSignIn")}</Link>
        </Button>
      </div>
    );
  }

  const isDisabled = submitting || password.length < 8;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-[32px] font-semibold leading-tight text-ink">
          {t("title", { account: preview.account.name })}
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">{t("description")}</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="accept-email">{t("fields.email")}</Label>
          <Input id="accept-email" value={preview.email} readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accept-name">{t("fields.name")}</Label>
          <Input
            id="accept-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={t("placeholders.name")}
            autoComplete="name"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accept-password">{t("fields.password")}</Label>
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
          <p className="text-xs text-muted">{t("fields.passwordHint")}</p>
        </div>
        {erroEnvio ? <Notice tone="danger">{erroEnvio}</Notice> : null}
        <Button type="submit" size="lg" className="w-full" disabled={isDisabled}>
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="text-sm text-muted">
        {t("trouble")}{" "}
        <Link href="/sign-in" className="font-semibold text-primary-strong underline-offset-4 hover:underline">
          {t("signIn")}
        </Link>
      </div>
    </div>
  );
}
