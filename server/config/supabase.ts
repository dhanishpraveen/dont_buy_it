import { createClient } from '@supabase/supabase-js';

export function getSupabaseUrl(): string {
  const value = process.env.SUPABASE_URL?.trim();
  if (!value) throw new Error('SUPABASE_URL is required when using Supabase-backed auth.');
  return value;
}

export function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side Supabase operations.');
  return value;
}

export function getSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
