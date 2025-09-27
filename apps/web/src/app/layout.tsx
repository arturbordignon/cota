import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";

import "./globals.css";

import { AppProviders } from "@/components/providers/app-providers";
import { resolveLocale } from "@/lib/locale";
import { fontDisplay, fontSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Crane Proposals",
    template: "%s | Crane Proposals",
  },
  description:
    "Plataforma SaaS para criação de propostas bilíngues de serviços pesados e locação de guindastes.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = resolveLocale();
  const messages = (await import(`@/messages/${locale}/common.json`)).default;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background text-ink antialiased",
          fontSans.variable,
          fontDisplay.variable
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
