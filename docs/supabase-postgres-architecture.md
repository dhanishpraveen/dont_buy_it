# Supabase PostgreSQL Architecture

The connected Supabase project `dont_buy_it` is provisioned with the relational database foundation for the platform. Supabase Auth owns identities; application profiles reference `auth.users.id`. There are no credentials or seeded production users in this schema.

## Applied migrations

- `20260929052744_primary_postgres_schema`: PostGIS, eight application tables, RLS, indexes, profile and timestamp triggers, nearby-listings RPC, and private Storage buckets.
- `20260929052853_foreign_key_and_request_policy_hardening`: indexes on `exchanges.listing_id` and `reviews.exchange_id`, and tighter access-request insertion policy.

These files are maintained under `supabase/migrations/` and match the MCP migration history.

## MongoDB mapping

| Mongo/Mongoose model | Supabase relation | Notes |
| --- | --- | --- |
| User | `auth.users` + `public.profiles` | Auth credentials remain exclusively in Supabase Auth. Profile trigger mirrors identity and verification timestamps. |
| Item | `public.items` | UUID owner reference, item attributes, image references and specifications. |
| Listing | `public.listings` | Separate item offer with controlled access/availability/status values, price, area, and private geography. |
| AccessRequest | `public.access_requests` | Requester and owner references, listing, lifecycle status and requested times. |
| Exchange | `public.exchanges` | One exchange per request, participants, lifecycle and handover/return timestamps. |
| Review | `public.reviews` | Participant-only review visibility, rating constraint and one review per reviewer/exchange. |
| TrustHistory | `public.trust_history` | Event records; clients cannot insert/update trust events. |
| Notification | `public.notifications` | Owner-scoped reads; clients can only update `is_read`. |

The existing Express/Mongoose service code remains as a transition layer. This migration does not copy Mongo documents or redirect all resource APIs. No MongoDB data was available to migrate, and the existing services are retained until Supabase adapters are implemented and verified.

## Constraints and indexes

- UUID primary keys with PostgreSQL `gen_random_uuid()` defaults.
- All timestamps use `timestamptz`.
- Access types, item/listing condition, listing availability/status, request status, exchange status, and trust event types are constrained.
- Prices/deposits cannot be negative; BORROW price must be zero; RENT price must be positive; ratings are 1–5.
- PostGIS 3.3.7 is installed in the `extensions` schema.
- `public.listings.location` is `extensions.geography(Point,4326)` and has a GiST spatial index. GeoJSON order is longitude, latitude.
- Owner, foreign-key, status, and user-notification lookup indexes are installed.

## Row-level security

RLS is enabled on all eight application tables.

- Profiles are restricted to the signed-in profile owner; profile updates exclude email and verification timestamps.
- Items are visible to their owner or where an active listing exists. Item changes require ownership.
- Active listings are discoverable. Owners can manage their own listings; insert/update checks require item ownership.
- Access requests are visible to participants. New requests must be PENDING, match the listing owner and access type, and target an active listing.
- Exchanges are visible to the recorded owner/borrower only. Client writes are not granted yet.
- Reviews are visible to participants; creation requires a completed exchange and participant relationship.
- Trust history is owner-readable and server-managed.
- Notifications are owner-readable and clients can update only the read flag.

The `nearby_listings` RPC is intentionally `SECURITY DEFINER` so callers can calculate distance without `SELECT` access to raw geography. It has a fixed empty search path, validates coordinate/radius/limit/filter inputs, returns only active listing details, area, public owner display name and distance, and never returns coordinates. Supabase’s advisor flags public execution of this function; this is intentional for public nearby discovery and should be reviewed if the public browse requirement changes.

## Location and nearby discovery

`public.nearby_listings(longitude, latitude, radius_km, category, access_type, availability, limit)` uses PostGIS `ST_DWithin` and `ST_Distance`. It validates longitude/latitude ranges, radius up to 100 km and limit up to 100, filters active/available listings, sorts nearest-first and returns `distance_meters`. The RPC returned an empty result successfully because the project currently has no listings.

Exact listing geography is not selectable by `anon` or `authenticated`; public location output is the `location_area` string and computed distance only.

## Storage

Created three private buckets:

- `listing-images`
- `avatars`
- `condition-images`

Storage object RLS limits read/write/update/delete to authenticated users whose UUID is the first folder component of the object path. No bucket is public and no upload UI/provider credentials were added.

## Environment and runtime transition

`.env.example` includes the Vite public Supabase URL/anon key and optional backend URL/service key variable names. The service-role key must never be exposed to the browser. The actual `.env` remains ignored.

The current application still has Mongo/mock resource services and legacy Express auth routes. This phase provisions the Supabase schema and auth-linked profile trigger but does not claim those existing routes have been migrated. Do not remove the Mongo path until Supabase data adapters and protected API token validation are implemented and verified.

## Empty project state / setup notes

The project had no prior public tables, migrations, policies or buckets. The migration created no fake users or listings; all eight app tables currently contain zero rows. Supabase Auth leaked-password protection is disabled in the project settings and must be enabled in the Supabase dashboard when desired; this MCP integration did not expose a setting operation for it.
