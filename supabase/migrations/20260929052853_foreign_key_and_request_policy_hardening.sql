create index exchanges_listing_id_idx on public.exchanges(listing_id);
create index reviews_exchange_id_idx on public.reviews(exchange_id);

drop policy access_requests_insert_requester on public.access_requests;
create policy access_requests_insert_requester on public.access_requests
for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'PENDING'
  and exists (
    select 1
    from public.listings l
    where l.id = access_requests.listing_id
      and l.owner_id = access_requests.owner_id
      and l.access_type = access_requests.access_type
      and l.status = 'ACTIVE'
  )
);
