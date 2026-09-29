create extension if not exists postgis with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  bio text,
  location_area text,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  category text not null check (char_length(trim(category)) between 1 and 100),
  brand text,
  model text,
  condition text not null check (condition in ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR', 'WELL_LOVED')),
  images text[] not null default '{}',
  specifications jsonb not null default '[]'::jsonb check (jsonb_typeof(specifications) in ('array', 'object')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  access_type text not null check (access_type in ('BORROW', 'RENT', 'BUY_USED', 'BUY_NEW')),
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text not null default '' check (char_length(description) <= 4000),
  price numeric(12,2) not null default 0 check (price >= 0),
  deposit numeric(12,2) not null default 0 check (deposit >= 0),
  currency char(3) not null default 'INR',
  condition text not null check (condition in ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR', 'WELL_LOVED')),
  availability_status text not null default 'AVAILABLE' check (availability_status in ('AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE')),
  available_from timestamptz,
  available_until timestamptz,
  location extensions.geography(point, 4326),
  location_area text not null check (char_length(trim(location_area)) between 1 and 160),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'UNAVAILABLE', 'SOLD', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_date_range_check check (available_from is null or available_until is null or available_until > available_from),
  constraint listings_borrow_no_price_check check (access_type <> 'BORROW' or price = 0),
  constraint listings_rent_price_check check (access_type <> 'RENT' or price > 0)
);

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  access_type text not null check (access_type in ('BORROW', 'RENT', 'BUY_USED', 'BUY_NEW')),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED')),
  requested_from timestamptz,
  requested_until timestamptz,
  message text check (message is null or char_length(message) <= 2000),
  offered_price numeric(12,2) check (offered_price is null or offered_price >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_requests_date_range_check check (requested_from is null or requested_until is null or requested_until > requested_from),
  constraint access_requests_not_self_check check (requester_id <> owner_id)
);

create table public.exchanges (
  id uuid primary key default gen_random_uuid(),
  access_request_id uuid not null unique references public.access_requests(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  borrower_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'PENDING_HANDOVER' check (status in ('PENDING_HANDOVER', 'HANDED_OVER', 'IN_USE', 'RETURN_PENDING', 'RETURNED', 'COMPLETED', 'CANCELLED')),
  handover_at timestamptz,
  received_at timestamptz,
  expected_return_at timestamptz,
  returned_at timestamptz,
  return_confirmed_at timestamptz,
  handover_notes text check (handover_notes is null or char_length(handover_notes) <= 2000),
  return_notes text check (return_notes is null or char_length(return_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exchanges_participants_check check (owner_id <> borrower_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewee_id uuid not null references public.profiles(id) on delete restrict,
  exchange_id uuid not null references public.exchanges(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  constraint reviews_not_self_check check (reviewer_id <> reviewee_id),
  constraint reviews_one_per_exchange unique (reviewer_id, exchange_id)
);

create table public.trust_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('SUCCESSFUL_RETURN', 'CANCELLATION', 'POSITIVE_REVIEW', 'NEGATIVE_REVIEW', 'VERIFIED_EMAIL', 'VERIFIED_PHONE', 'SUCCESSFUL_EXCHANGE', 'LATE_RETURN')),
  points_change integer not null default 0,
  reference_id uuid,
  description text check (description is null or char_length(description) <= 1000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (char_length(trim(type)) between 1 and 80),
  title text not null check (char_length(trim(title)) between 1 and 180),
  message text not null check (char_length(message) <= 2000),
  reference_type text,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index items_owner_id_idx on public.items(owner_id);
create index items_category_idx on public.items(category);
create index listings_item_id_idx on public.listings(item_id);
create index listings_owner_id_idx on public.listings(owner_id);
create index listings_access_type_idx on public.listings(access_type);
create index listings_status_idx on public.listings(status);
create index listings_created_at_idx on public.listings(created_at desc);
create index listings_active_access_idx on public.listings(access_type, availability_status, created_at desc) where status = 'ACTIVE';
create index listings_location_gist_idx on public.listings using gist(location);
create index access_requests_listing_id_idx on public.access_requests(listing_id);
create index access_requests_requester_id_idx on public.access_requests(requester_id);
create index access_requests_owner_id_idx on public.access_requests(owner_id);
create index access_requests_status_idx on public.access_requests(status);
create index exchanges_owner_id_idx on public.exchanges(owner_id);
create index exchanges_borrower_id_idx on public.exchanges(borrower_id);
create index exchanges_status_idx on public.exchanges(status);
create index reviews_reviewee_id_idx on public.reviews(reviewee_id);
create index trust_history_user_created_idx on public.trust_history(user_id, created_at desc);
create index notifications_user_read_created_idx on public.notifications(user_id, is_read, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger items_set_updated_at before update on public.items for each row execute function public.set_updated_at();
create trigger listings_set_updated_at before update on public.listings for each row execute function public.set_updated_at();
create trigger access_requests_set_updated_at before update on public.access_requests for each row execute function public.set_updated_at();
create trigger exchanges_set_updated_at before update on public.exchanges for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone, email_verified_at, phone_verified_at)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(new.raw_user_meta_data ->> 'name'), '')),
    coalesce(new.email, ''),
    coalesce(new.phone, nullif(trim(new.raw_user_meta_data ->> 'phone'), '')),
    new.email_confirmed_at,
    new.phone_confirmed_at
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    email_verified_at = excluded.email_verified_at,
    phone_verified_at = excluded.phone_verified_at,
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created_or_verified
after insert or update of email, phone, email_confirmed_at, phone_confirmed_at on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.nearby_listings(
  p_longitude double precision,
  p_latitude double precision,
  p_radius_km double precision default 5,
  p_category text default null,
  p_access_type text default null,
  p_availability text default null,
  p_limit integer default 50
)
returns table (
  listing_id uuid,
  item_id uuid,
  owner_id uuid,
  item_name text,
  item_description text,
  category text,
  images text[],
  item_condition text,
  access_type text,
  listing_title text,
  listing_description text,
  price numeric,
  deposit numeric,
  currency character(3),
  availability_status text,
  available_from timestamptz,
  available_until timestamptz,
  listing_status text,
  location_area text,
  owner_display_name text,
  distance_meters double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_origin extensions.geography(point, 4326);
begin
  if p_longitude is null or p_longitude < -180 or p_longitude > 180 or p_latitude is null or p_latitude < -90 or p_latitude > 90 then
    raise exception using errcode = '22023', message = 'Longitude or latitude is outside the valid range.';
  end if;
  if p_radius_km is null or p_radius_km <= 0 or p_radius_km > 100 then
    raise exception using errcode = '22023', message = 'Radius must be greater than zero and no more than 100 km.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'Limit must be between 1 and 100.';
  end if;
  if p_access_type is not null and p_access_type not in ('BORROW', 'RENT', 'BUY_USED', 'BUY_NEW') then
    raise exception using errcode = '22023', message = 'Access type is invalid.';
  end if;
  if p_availability is not null and p_availability not in ('AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE') then
    raise exception using errcode = '22023', message = 'Availability status is invalid.';
  end if;

  v_origin := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
  return query
  select l.id, l.item_id, l.owner_id, i.name, i.description, i.category, i.images, i.condition,
         l.access_type, l.title, l.description, l.price, l.deposit, l.currency,
         l.availability_status, l.available_from, l.available_until, l.status, l.location_area,
         p.full_name, extensions.st_distance(l.location, v_origin)
  from public.listings l
  join public.items i on i.id = l.item_id
  join public.profiles p on p.id = l.owner_id
  where l.status = 'ACTIVE'
    and l.availability_status <> 'UNAVAILABLE'
    and l.location is not null
    and extensions.st_dwithin(l.location, v_origin, p_radius_km * 1000)
    and (p_category is null or lower(i.category) = lower(p_category))
    and (p_access_type is null or l.access_type = p_access_type)
    and (p_availability is null or l.availability_status = p_availability)
  order by extensions.st_distance(l.location, v_origin)
  limit p_limit;
end;
$$;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.listings enable row level security;
alter table public.access_requests enable row level security;
alter table public.exchanges enable row level security;
alter table public.reviews enable row level security;
alter table public.trust_history enable row level security;
alter table public.notifications enable row level security;

revoke all on public.profiles, public.items, public.listings, public.access_requests, public.exchanges, public.reviews, public.trust_history, public.notifications from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, bio, location_area) on public.profiles to authenticated;
grant select (id, full_name, avatar_url, location_area, created_at) on public.profiles to anon;

grant select on public.items to anon, authenticated;
grant insert (owner_id, name, description, category, brand, model, condition, images, specifications) on public.items to authenticated;
grant update (name, description, category, brand, model, condition, images, specifications) on public.items to authenticated;
grant delete on public.items to authenticated;

grant select (id, item_id, owner_id, access_type, title, description, price, deposit, currency, condition, availability_status, available_from, available_until, location_area, status, created_at, updated_at) on public.listings to anon, authenticated;
grant insert (item_id, owner_id, access_type, title, description, price, deposit, currency, condition, availability_status, available_from, available_until, location, location_area, status) on public.listings to authenticated;
grant update (item_id, access_type, title, description, price, deposit, currency, condition, availability_status, available_from, available_until, location, location_area, status) on public.listings to authenticated;

grant select on public.access_requests to authenticated;
grant insert (listing_id, requester_id, owner_id, access_type, status, requested_from, requested_until, message, offered_price, deposit_amount) on public.access_requests to authenticated;
grant update (status, requested_from, requested_until, message, offered_price, deposit_amount) on public.access_requests to authenticated;

grant select on public.exchanges to authenticated;
grant select on public.reviews to authenticated;
grant insert (reviewer_id, reviewee_id, exchange_id, rating, comment) on public.reviews to authenticated;
grant select on public.trust_history to authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

create policy profiles_select_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy items_select_public_or_owner on public.items for select to anon, authenticated using (
  owner_id = (select auth.uid()) or exists (select 1 from public.listings l where l.item_id = items.id and l.status = 'ACTIVE')
);
create policy items_insert_owner on public.items for insert to authenticated with check (owner_id = (select auth.uid()));
create policy items_update_owner on public.items for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy items_delete_owner on public.items for delete to authenticated using (owner_id = (select auth.uid()));

create policy listings_select_active_or_owner on public.listings for select to anon, authenticated using (status = 'ACTIVE' or owner_id = (select auth.uid()));
create policy listings_insert_owner on public.listings for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.items i where i.id = item_id and i.owner_id = (select auth.uid()))
);
create policy listings_update_owner on public.listings for update to authenticated using (owner_id = (select auth.uid())) with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.items i where i.id = item_id and i.owner_id = (select auth.uid()))
);

create policy access_requests_select_participant on public.access_requests for select to authenticated using (requester_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy access_requests_insert_requester on public.access_requests for insert to authenticated with check (
  requester_id = (select auth.uid()) and exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = owner_id and l.status = 'ACTIVE')
);
create policy access_requests_update_participant on public.access_requests for update to authenticated using (requester_id = (select auth.uid()) or owner_id = (select auth.uid())) with check (requester_id = (select auth.uid()) or owner_id = (select auth.uid()));

create policy exchanges_select_participant on public.exchanges for select to authenticated using (owner_id = (select auth.uid()) or borrower_id = (select auth.uid()));

create policy reviews_select_participant on public.reviews for select to authenticated using (
  reviewer_id = (select auth.uid()) or reviewee_id = (select auth.uid())
);
create policy reviews_insert_completed_exchange_participant on public.reviews for insert to authenticated with check (
  reviewer_id = (select auth.uid()) and exists (
    select 1 from public.exchanges e where e.id = exchange_id and e.status = 'COMPLETED'
      and ((e.owner_id = reviewer_id and e.borrower_id = reviewee_id) or (e.borrower_id = reviewer_id and e.owner_id = reviewee_id))
  )
);

create policy trust_history_select_self on public.trust_history for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_select_self on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_self on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.nearby_listings(double precision, double precision, double precision, text, text, text, integer) from public;
grant execute on function public.nearby_listings(double precision, double precision, double precision, text, text, text, integer) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', false), ('avatars', 'avatars', false), ('condition-images', 'condition-images', false)
on conflict (id) do nothing;

create policy app_private_storage_select_own on storage.objects for select to authenticated using (
  bucket_id in ('listing-images', 'avatars', 'condition-images') and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy app_private_storage_insert_own on storage.objects for insert to authenticated with check (
  bucket_id in ('listing-images', 'avatars', 'condition-images') and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy app_private_storage_update_own on storage.objects for update to authenticated using (
  bucket_id in ('listing-images', 'avatars', 'condition-images') and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id in ('listing-images', 'avatars', 'condition-images') and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy app_private_storage_delete_own on storage.objects for delete to authenticated using (
  bucket_id in ('listing-images', 'avatars', 'condition-images') and (storage.foldername(name))[1] = (select auth.uid())::text
);
