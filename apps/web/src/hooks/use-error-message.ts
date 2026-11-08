"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/hooks/use-api";

type MensagensPorStatus = Partial<Record<number, string>> & {
  /** Used when the status has no message of its own (server errors, network). */
  padrao?: string;
};

const CHAVES: Record<number, string> = {
  400: "invalid",
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
  429: "tooMany",
  503: "unavailable",
};

// The API answers in its own words (and language); screens show a message in
// the user's language picked from the status, or a more specific one they pass.
export function useErrorMessage() {
  const t = useTranslations("errors");
  return useCallback(
    (error: unknown, especificas: MensagensPorStatus = {}) => {
      if (error instanceof ApiError) {
        const especifica = especificas[error.status];
        if (especifica) return especifica;
        const chave = CHAVES[error.status];
        if (chave) return t(chave);
      }
      return especificas.padrao ?? t("generic");
    },
    [t],
  );
}
