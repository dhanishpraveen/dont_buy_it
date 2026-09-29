# Supabase Authentication Architecture

Supabase Auth is the sole source of identity and sessions. The browser uses the single client in `src/lib/supabase.ts`; session persistence and refresh are managed by Supabase JS. The React `AuthContext` listens for auth-state changes, loads the RLS-protected `profiles` row, and exposes email verification state.

## Required environment

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

The server uses the public anon key only to validate a presented bearer token with Supabase Auth and to read the matching profile under RLS. No service-role credential is used by this phase or exposed to the frontend. `.env` is ignored by Git.

## User journey

1. Sign In is the primary auth screen; public Home and Browse remain public for the existing demo.
2. Sign Up collects name, email, password, and confirmation, then calls Supabase `signUp` with metadata and an email redirect to `/verify-otp`.
3. Supabase’s email confirmation link returns to `/verify-otp`. The page refreshes session/profile state and offers resend/refresh controls.
4. After the email is confirmed, the user is redirected back to Sign In and signs in using email + password.
5. Successful sign in creates a Supabase session and the user enters Dashboard.
6. Password recovery uses Supabase recovery email and `updateUser({ password })`.

## Profile and RLS

`public.profiles.id` references `auth.users.id`. The database trigger creates/synchronizes profiles. The frontend reads/updates only through the Supabase client and RLS; it does not send user IDs to select a profile. Editable fields are full name, avatar URL, and approximate location. The optional `phone` field is retained as a nullable column for future phone verification work and is not required for the current authentication flow. See [Supabase PostgreSQL architecture](supabase-postgres-architecture.md) for the database policies and migration mapping.

## Backend-protected operations

Express protected routes require `Authorization: Bearer <Supabase access token>`. Middleware validates the token with Supabase Auth, loads the associated profile through the caller’s RLS-scoped anon client, and rejects users without a verified email. No custom JWT cookies or Mongo password authentication remain. Listing persistence stays on the existing mock/Mongo transition path and is not represented as migrated to Postgres yet.

## Email-only setup

Configure email confirmation and allowed redirect URLs in the Supabase Auth dashboard, including the local `/verify-otp` callback and production equivalent. SMS and phone OTP are intentionally deferred for a future authentication phase. The current app works with Supabase Email + Password authentication and email verification only.
