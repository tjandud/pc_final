import 'dotenv/config';
import { z } from 'zod';

/**
 * Server-side environment validation.
 * Secrets (TechSpecs, Supabase service role) live ONLY here and are never sent to clients.
 */
const boolish = z
  .string()
  .optional()
  .transform((v) => v === 'true');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  TECHSPECS_API_ID: z.string().optional().default(''),
  TECHSPECS_API_KEY: z.string().optional().default(''),
  TECHSPECS_BASE_URL: z.string().url().default('https://api.techspecs.io/v5'),
  TECHSPECS_LIVE_CALL_ENABLED: boolish,
  TECHSPECS_MAX_CALLS_PER_HOUR: z.coerce.number().int().nonnegative().default(8),

  MIN_RELEASE_DATE_DEFAULT: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default('2023-11-01'),
  MIN_RELEASE_DATE_EXTENDED: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default('2022-11-01'),

  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

/** Non-secret status summary, safe to log or expose via health check. */
export function configStatus() {
  return {
    techspecs: {
      credentialsConfigured: Boolean(env.TECHSPECS_API_ID && env.TECHSPECS_API_KEY),
      liveCallEnabled: env.TECHSPECS_LIVE_CALL_ENABLED,
    },
    supabase: {
      configured: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
      adminConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
      dataMode: env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? 'supabase_remote' : 'official_reference_seed',
    },
  };
}
