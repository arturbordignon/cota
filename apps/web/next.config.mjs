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

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
};

export default withNextIntl(nextConfig);
