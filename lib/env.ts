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

let _env: z.infer<typeof envSchema> | undefined;

const isBuildTime =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.SKIP_ENV_VALIDATION === "1";

function getEnv() {
  if (_env) return _env;
  if (isBuildTime) {
    // Return raw process.env with defaults — skip strict validation at build time
    return process.env as unknown as z.infer<typeof envSchema>;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    for (const [field, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
      console.error(`  ${field}: ${issues?.join(", ")}`);
    }
    throw new Error("Invalid environment variables. Check server logs.");
  }
  _env = parsed.data;
  return _env;
}

export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof z.infer<typeof envSchema>];
  },
});
