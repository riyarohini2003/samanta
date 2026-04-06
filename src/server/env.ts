import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().positive().default(2_592_000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  COOKIE_DOMAIN: z.string().optional(),
});

function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");

      throw new Error(
        `Invalid environment variables:\n${missing}\n\n` +
          "Please check your .env file and ensure all required variables are set.",
      );
    }
    throw error;
  }
}

export const env = parseEnv();
