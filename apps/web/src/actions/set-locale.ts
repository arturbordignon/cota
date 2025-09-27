"use server";

import { cookies } from "next/headers";

import { defaultLocale, isLocale } from "@/i18n/routing";

const COOKIE_NAME = "locale";

export async function setLocale(locale: string) {
  const value = isLocale(locale) ? locale : defaultLocale;
  cookies().set(COOKIE_NAME, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
