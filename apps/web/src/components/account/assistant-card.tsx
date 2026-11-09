"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Address of the hosted MCP server that Claude or ChatGPT connect to. Each
// person signs in with their own Cota account when they connect.
const ENDERECO_MCP = process.env.NEXT_PUBLIC_MCP_URL ?? "";

export function AssistantCard() {
  const t = useTranslations("account.assistant");
  const [copiado, setCopiado] = useState(false);

  if (!ENDERECO_MCP) {
    return null;
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(ENDERECO_MCP);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <Card className="p-5">
      <CardTitle>{t("title")}</CardTitle>
      <CardDescription>{t("description")}</CardDescription>
      <div className="mt-4 flex gap-2">
        <Input readOnly value={ENDERECO_MCP} aria-label={t("address")} onFocus={(event) => event.target.select()} />
        <Button type="button" variant="secondary" size="icon" onClick={copiar} aria-label={t("copy")}>
          {copiado ? <Check size={16} weight="bold" /> : <Copy size={16} />}
        </Button>
      </div>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-muted">
        <li>{t("steps.claude")}</li>
        <li>{t("steps.chatgpt")}</li>
        <li>{t("steps.signIn")}</li>
      </ol>
    </Card>
  );
}
