import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Google AI
  GOOGLE_API_KEY: z.string().min(1),
  GOOGLE_LLM_MODEL: z.string().default("gemini-3-flash-preview"),

  // Auth
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./uploads"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const [field, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${field}: ${issues?.join(", ")}`);
  }
  throw new Error("Invalid environment variables. Check server logs.");
}

export const env = parsed.data;
