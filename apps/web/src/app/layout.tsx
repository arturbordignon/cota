import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";

import "./globals.css";

import { AppProviders } from "@/components/providers/app-providers";
import { resolveLocale } from "@/lib/locale";
import { loadMessages } from "@/messages/load-messages";
import { fontBrand, fontDisplay, fontSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Cota",
    template: "%s | Cota",
  },
  description: "Propostas comerciais para guindaste, guincho, munck e outros serviços pesados.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = resolveLocale();
  const messages = await loadMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background text-ink antialiased",
          fontSans.variable,
          fontDisplay.variable,
          fontBrand.variable
        )}
      >
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Sao_Paulo">
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
        <div id="portal-root" />
      </body>
    </html>
  );
}
