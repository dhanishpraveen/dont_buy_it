create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.owns_item(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.items i
      where i.id = p_item_id
        and i.owner_id = (select auth.uid())
    );
$$;

revoke all on function private.owns_item(uuid) from public, anon, authenticated;
grant execute on function private.owns_item(uuid) to authenticated;

drop policy if exists listings_insert_owner on public.listings;
create policy listings_insert_owner on public.listings
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (select private.owns_item(item_id))
);

drop policy if exists listings_update_owner on public.listings;
create policy listings_update_owner on public.listings
for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and (select private.owns_item(item_id))
);create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.owns_item(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.items i
      where i.id = p_item_id
        and i.owner_id = (select auth.uid())
    );
$$;

revoke all on function private.owns_item(uuid) from public, anon, authenticated;
grant execute on function private.owns_item(uuid) to authenticated;

drop policy if exists listings_insert_owner on public.listings;
create policy listings_insert_owner on public.listings
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (select private.owns_item(item_id))
);

drop policy if exists listings_update_owner on public.listings;
create policy listings_update_owner on public.listings
for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and (select private.owns_item(item_id))
);