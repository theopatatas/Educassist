import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),

  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string(),
  DB_NAME_TEST: z.string().optional(),
  DB_USER: z.string(),
  DB_PASS: z.string().optional().default(""),

  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // ✅ optional for now
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  MAIL_API_URL: z.string().url().optional(),
  MAIL_API_KEY: z.string().optional(),

  // seed admin (dev only)
  ADMIN_SEED_EMAIL: z.string().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "test") {
  if (!env.DB_NAME_TEST || !/test/i.test(env.DB_NAME_TEST)) {
    throw new Error(
      "NODE_ENV=test requires DB_NAME_TEST with a database name containing 'test'",
    );
  }
}
