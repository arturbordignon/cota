import 'dotenv/config';
import { z } from 'zod';
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3333),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.string().default('info'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional().or(z.literal('')),
    AWS_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('crane-proposals-local'),
    S3_ENDPOINT: z.string().default('http://localhost:9000'),
    S3_ACCESS_KEY: z.string().default('minio'),
    S3_SECRET_KEY: z.string().default('minio123'),
    JWT_ACCESS_SECRET: z.string().default('change-me'),
    JWT_REFRESH_SECRET: z.string().default('change-me-refresh'),
    FRONTEND_BASE_URL: z.string().default('http://localhost:5173'),
    CDN_BASE_URL: z.string().default('http://localhost:3000'),
    QUEUE_PREFIX: z.string().default('crane'),
    PDF_RENDER_TIMEOUT_MS: z.coerce.number().default(120000)
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
const env = parsed.data;
export default env;
