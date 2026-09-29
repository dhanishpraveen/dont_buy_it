import { createClient } from "@supabase/supabase-js";

export function getSupabaseUrl(): string {
  const value =
    process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  if (!value)
    throw new Error(
      "SUPABASE_URL is required when using Supabase-backed auth.",
    );
  return value;
}

export function getSupabaseAnonKey(): string {
  const value =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!value)
    throw new Error(
      "SUPABASE_ANON_KEY is required for server-side token validation.",
    );
  return value;
}

export function getSupabaseUserClient(accessToken: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function getSupabasePublicClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
