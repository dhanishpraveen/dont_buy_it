create policy profiles_select_public_listing_owner
on public.profiles
for select to anon
using (
  exists (
    select 1
    from public.listings l
    where l.owner_id = profiles.id
      and l.status = 'ACTIVE'
  )
);
