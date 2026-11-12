import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * Checks whether the dedicated TechCompare Supabase project credentials are configured.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    env.SUPABASE_URL &&
    env.SUPABASE_ANON_KEY &&
    !env.SUPABASE_URL.includes('your-project-ref') &&
    !env.SUPABASE_ANON_KEY.includes('your_supabase_anon_key'),
  );
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    env.SUPABASE_URL &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_URL.includes('your-project-ref') &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes('your_supabase_service_role_key'),
  );
}

/**
 * Public Supabase client (uses SUPABASE_ANON_KEY, enforces RLS policies).
 * Used for all public read queries (catalog, product detail, variants, specs).
 */
export function getSupabasePublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!publicClient) {
    publicClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return publicClient;
}

/**
 * Admin Supabase client (uses SUPABASE_SERVICE_ROLE_KEY, server-only).
 * Never exposed to the frontend; used only after server-side admin verification.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) return null;
  if (!adminClient) {
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
