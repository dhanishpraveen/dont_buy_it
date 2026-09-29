# Supabase authentication and profile architecture

The connected Supabase project now has an `auth.users`-referenced `public.profiles` table and a secure profile creation/synchronization trigger. RLS restricts profile reads to the signed-in user. The live schema and migration transition are documented in [supabase-postgres-architecture.md](supabase-postgres-architecture.md).

This project uses Supabase Auth as the source of truth for user identity and sessions. The browser creates and maintains the authenticated session using the public anon key, while backend APIs should validate the session server-side when they need authenticated access.

## Environment variables

Create a local `.env` file with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not commit real credentials. The service-role key must never be exposed to the frontend.

## Browser client

The frontend client is created in `src/lib/supabase.ts` and is used by the auth context for sign-in, sign-up, OTP verification, session state, and logout.

## Authentication flow

1. User lands on the sign-in page.
2. New users move to the sign-up page.
3. Registration creates a Supabase auth user.
4. Email verification and phone OTP are handled by Supabase Auth.
5. After verification, the user is routed back to sign in.
6. Successful sign in creates a Supabase session.
7. Protected routes rely on the auth state instead of local custom JWT cookies.

## Profile table

Application profiles live in Supabase/Postgres and are keyed by the authenticated `auth.users.id` value. The database trigger creates/synchronizes identity and verification timestamps; users cannot edit email or verification timestamps through profile table grants.

Example SQL skeleton:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  bio text,
  location_area text,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);
```

## Migration strategy

The project is currently transitioning from the earlier MongoDB/Mongoose authentication flow to Supabase/Postgres. The schema is provisioned, but existing Express auth/profile APIs still include their legacy path and must be moved to verified Supabase token validation before Mongo auth is removed. The existing deterministic AI, scoring, recommendation, and location logic remains untouched.

## Notes

- The LLM remains responsible only for requirement extraction and explanation.
- Supabase is used for user identity and session management only.
- Pricing, scoring, recommendation, distance, and item matching remain deterministic and are not delegated to Supabase or the LLM.
