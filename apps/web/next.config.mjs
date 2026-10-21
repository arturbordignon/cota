import createNextIntlPlugin from "next-intl/plugin";
import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const appDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(appDir, "..", "..");

for (const filename of [".env", ".env.local"]) {
  const envPath = join(workspaceRoot, filename);
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false });
  }
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const emDesenvolvimento = process.env.NODE_ENV !== "production";

function paraOrigem(endereco) {
  try {
    return new URL(endereco).origin;
  } catch {
    return null;
  }
}

// Photos are uploaded straight to S3 with signed URLs, so the browser must be
// allowed to reach the bucket as well as the API.
function origensDeArmazenamento() {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) {
    return [];
  }
  if (endpoint.includes("amazonaws.com")) {
    return ["https://*.amazonaws.com"];
  }
  return [paraOrigem(endpoint)].filter(Boolean);
}

function montarPoliticaDeConteudo() {
  const api = paraOrigem(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1");
  const armazenamento = origensDeArmazenamento();
  const scripts = ["'self'", "'unsafe-inline'"];
  const conexoes = ["'self'", api, ...armazenamento];
  if (emDesenvolvimento) {
    scripts.push("'unsafe-eval'");
    conexoes.push("ws:");
  }

  return [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${armazenamento.join(" ")}`.trim(),
    "font-src 'self' data:",
    `connect-src ${conexoes.filter(Boolean).join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

function montarCabecalhosDeSeguranca() {
  const cabecalhos = [
    { key: "Content-Security-Policy", value: montarPoliticaDeConteudo() },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Invite links carry their token in the URL; never send it to other sites.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ];
  if (!emDesenvolvimento) {
    cabecalhos.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  }
  return cabecalhos;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  async headers() {
    return [{ source: "/:path*", headers: montarCabecalhosDeSeguranca() }];
  },
};

export default withNextIntl(nextConfig);
