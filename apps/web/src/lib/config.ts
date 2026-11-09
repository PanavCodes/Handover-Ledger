import { z } from "zod";

const envSchema = z.object({
  SESSION_SECRET: z.string().default("handover-ledger-default-secret-key-must-be-changed-in-prod"),
  ANTHROPIC_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().default("http://127.0.0.1:54321"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default("dummy-service-role-key-for-local"),
  LLM_MODE: z.enum(["live", "replay"]).default("live"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

const env = envSchema.parse({
  SESSION_SECRET: process.env.SESSION_SECRET,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  LLM_MODE: (process.env.LLM_MODE as "live" | "replay") || "live",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const config = {
  sessionSecret: env.SESSION_SECRET,
  anthropicApiKey: env.ANTHROPIC_API_KEY || "",
  supabaseUrl: env.SUPABASE_URL,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  llmMode: env.LLM_MODE,
  appUrl: env.NEXT_PUBLIC_APP_URL,
};
