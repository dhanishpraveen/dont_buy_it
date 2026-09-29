alter table public.listings
  add column price_unit text not null default 'one-time'
  constraint listings_price_unit_check
  check (price_unit in ('free', 'per-day', 'per-week', 'one-time'));

grant select (price_unit) on public.listings to anon, authenticated;
grant insert (price_unit) on public.listings to authenticated;
grant update (price_unit) on public.listings to authenticated;
