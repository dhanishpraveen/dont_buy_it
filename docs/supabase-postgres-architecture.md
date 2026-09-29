# Supabase PostgreSQL Architecture

The connected Supabase project `dont_buy_it` is provisioned with the relational database foundation for the platform. Supabase Auth owns identities; application profiles reference `auth.users.id`. There are no credentials or seeded production users in this schema.

## Applied migrations

- `20260929052744_primary_postgres_schema`: PostGIS, eight application tables, RLS, indexes, profile and timestamp triggers, nearby-listings RPC, and private Storage buckets.
- `20260929052853_foreign_key_and_request_policy_hardening`: indexes on `exchanges.listing_id` and `reviews.exchange_id`, and tighter access-request insertion policy.
- `20260929135148_listing_price_unit`: constrained listing price units for free, per-day, per-week, and one-time offers.
- `20260929135357_public_listing_owner_name`: anon-only profile row access for owners with ACTIVE listings; existing column grants keep private fields unavailable.
- `20260929135435_nearby_listings_invoker` and `20260929135558_nearby_listings_definer`: the nearby RPC was restored to SECURITY DEFINER after verifying that RLS blocks direct geography access.
- `20260929143220_access_request_exchange_lifecycle`: tightened request/exchange table grants, added pending-request uniqueness, and added authenticated lifecycle RPCs.
- `20260929144215_lifecycle_database_guards`: database triggers enforce legal state transitions and recheck listing/date availability on acceptance.
- `20260929144942_lifecycle_read_image_array_fix`: converts `items.images` from `text[]` to JSON before projecting its first image from lifecycle read RPCs.
- `20260929150438_break_listing_item_rls_recursion`: replaces recursive cross-table ownership policy checks with a private, authenticated-only item ownership helper.

These files are maintained under `supabase/migrations/` and match the MCP migration history.

## MongoDB mapping

| Mongo/Mongoose model | Supabase relation                | Notes                                                                                                               |
| -------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| User                 | `auth.users` + `public.profiles` | Auth credentials remain exclusively in Supabase Auth. Profile trigger mirrors identity and verification timestamps. |
| Item                 | `public.items`                   | UUID owner reference, item attributes, image references and specifications.                                         |
| Listing              | `public.listings`                | Separate item offer with controlled access/availability/status values, price, area, and private geography.          |
| AccessRequest        | `public.access_requests`         | Requester and owner references, listing, lifecycle status and requested times.                                      |
| Exchange             | `public.exchanges`               | One exchange per request, participants, lifecycle and handover/return timestamps.                                   |
| Review               | `public.reviews`                 | Participant-only review visibility, rating constraint and one review per reviewer/exchange.                         |
| TrustHistory         | `public.trust_history`           | Event records; clients cannot insert/update trust events.                                                           |
| Notification         | `public.notifications`           | Owner-scoped reads; clients can only update `is_read`.                                                              |

The Express listing routes use a Supabase adapter with the authenticated user's bearer token and anon key, so RLS remains active. The Mongoose resource path is retained only for explicit `DATABASE_MODE=mongo`; mock data is retained for explicit `DATABASE_MODE=mock` and tests. No service-role key is used for listing operations.

## Constraints and indexes

- UUID primary keys with PostgreSQL `gen_random_uuid()` defaults.
- All timestamps use `timestamptz`.
- Access types, item/listing condition, listing availability/status, request status, exchange status, and trust event types are constrained.
- Prices/deposits cannot be negative; BORROW price must be zero; RENT price must be positive; `price_unit` is constrained to `free`, `per-day`, `per-week`, or `one-time`; ratings are 1–5.
- PostGIS 3.3.7 is installed in the `extensions` schema.
- `public.listings.location` is `extensions.geography(Point,4326)` and has a GiST spatial index. GeoJSON order is longitude, latitude.
- Owner, foreign-key, status, and user-notification lookup indexes are installed.

## Row-level security

RLS is enabled on all eight application tables.

- Authenticated profile reads/updates are restricted to the signed-in profile owner; an anon-only policy exposes rows only for owners with an ACTIVE listing. Anon column grants exclude email, phone, bio, and verification timestamps.
- Items are visible to their owner or where an active listing exists. Item changes require ownership.
- Active listings are discoverable. Owners can manage their own listings; listing insert/update checks call `private.owns_item(uuid)` so the policies do not recurse between `listings` and `items`. The private schema is not exposed; anon cannot use it, and authenticated execution still compares the item owner to `auth.uid()`.
- Access requests are visible to requester/owner participants. Direct client INSERT/UPDATE is revoked; authenticated callers use RPCs that derive requester from `auth.uid()` and owner/access type/pricing from the listing.
- Exchanges are visible to recorded owner/borrower participants. Direct client INSERT/UPDATE is revoked; lifecycle mutations are authorized by participant-specific RPCs.
- Reviews are visible to participants; creation requires a completed exchange and participant relationship.
- Trust history is owner-readable and server-managed.
- Notifications are owner-readable and clients can update only the read flag.

The `nearby_listings` RPC is intentionally `SECURITY DEFINER` so callers can calculate distance without `SELECT` access to raw geography. It has a fixed empty search path, validates coordinate/radius/limit/filter inputs, returns only active listing details, area, public owner display name and distance, and never returns coordinates. The lifecycle RPCs are also `SECURITY DEFINER` because table write grants are revoked; each checks `auth.uid()`, participant/owner role, and allowed state, uses an empty search path, and is granted only to `authenticated`. The trigger guard function is not executable by client roles. Supabase's advisor reports these deliberate RPCs as callable security-definer functions; this warning is retained for review rather than hidden. See [anon security-definer warning](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated security-definer warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Location and nearby discovery

`public.nearby_listings(longitude, latitude, radius_km, category, access_type, availability, limit)` uses PostGIS `ST_DWithin` and `ST_Distance`. It validates longitude/latitude ranges, radius up to 100 km and limit up to 100, filters active/available listings, sorts nearest-first and returns `distance_meters`. The RPC returned an empty result successfully because the project currently has no listings.

Exact listing geography is not selectable by `anon` or `authenticated`; public location output is the `location_area` string and computed distance only.

## Request and exchange lifecycle

Existing `access_requests` and `exchanges` tables are reused. A partial unique index prevents duplicate PENDING requests by the same requester for a listing while retaining historical requests. `decide_access_request` locks the request and listing, rechecks ACTIVE/availability and accepted date conflicts, creates an exchange, and changes the request to ACCEPTED atomically. The RPC and a database trigger both reject overlapping BORROW/RENT periods; accepted ranges are half-open, and non-overlapping periods remain valid.

The state guards allow PENDING to ACCEPTED/REJECTED/CANCELLED and ACCEPTED to COMPLETED; exchanges progress through handover/receipt and, for BORROW/RENT only, return. Purchase receipt completes the request/exchange and sets the listing status to SOLD. All lifecycle RPCs derive the caller from `auth.uid()`, use an empty `search_path`, and have EXECUTE revoked from `public`/`anon` with an explicit grant to `authenticated`. They use SECURITY DEFINER because direct writes are intentionally revoked; the functions perform explicit ownership, participant, state, and input checks. The transition trigger function is not callable directly by client roles.

The Express API exposes `/api/requests`, `/api/requests/received`, `/api/requests/:id`, and `/api/exchanges/:id`; the React app uses protected `/requests`, `/requests/received`, `/requests/:id`, `/request-access/:listingId`, and `/exchanges/:id` routes. Recommendations remain advisory and only link to a preselected request form; no request is automatically submitted. Payment, messaging, and notifications are not implemented.

## Storage

Created three private buckets:

- `listing-images`
- `avatars`
- `condition-images`

Storage object RLS limits read/write/update/delete to authenticated users whose UUID is the first folder component of the object path. No bucket is public and no upload UI/provider credentials were added.

## Environment and runtime transition

`.env.example` includes the Vite public Supabase URL/anon key and optional backend URL/service key variable names. The service-role key must never be exposed to the browser. The actual `.env` remains ignored.

When Supabase URL and anon key are configured, the server selects Supabase unless `DATABASE_MODE` explicitly sets `mock` or `mongo`. Protected listing routes verify bearer tokens server-side before database operations. The Supabase service-role key remains server-only and is not used for listing persistence.

## Empty project state / setup notes

The project currently has two profile rows and zero items, listings, access requests, or exchanges. No demo transaction rows were created. Schema, policies, grants, indexes, functions, and advisor output were inspected through MCP; authenticated empty-list reads were exercised in the browser, but transaction mutations were not exercised end-to-end with a signed-in listing/request pair. Supabase Auth leaked-password protection is disabled in project settings and should be enabled in the Supabase dashboard.

## Listing creation troubleshooting

PostgREST logs recorded SQLSTATE `42P17` (`infinite recursion detected in policy for relation "listings"`) during listing creation. The listing INSERT/UPDATE policies queried `items` for ownership while the item SELECT policy queried `listings` for active publication, creating a circular RLS evaluation. The fix keeps both ownership checks: an unexposed `private.owns_item` SECURITY DEFINER helper checks `items.owner_id = auth.uid()` with an empty `search_path`, and authenticated is the only client role granted schema usage/function execution. The service still creates the item first and compensates by deleting that owner-scoped item if listing creation fails. After applying the migration, public `GET /api/listings` returned HTTP 200 with the real empty result rather than an RLS recursion error. No authenticated create was attempted against the production account.
