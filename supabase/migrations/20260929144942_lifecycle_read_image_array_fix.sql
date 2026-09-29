create or replace function public.get_access_requests(
  p_scope text,
  p_request_id uuid default null
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_scope not in ('mine', 'received', 'all') then
    raise exception 'Request scope is invalid.' using errcode = 'P0001';
  end if;
  if p_scope = 'all' and p_request_id is null then
    raise exception 'A request id is required.' using errcode = 'P0001';
  end if;

  return query
  select jsonb_build_object(
    'id', ar.id,
    'listing', jsonb_build_object(
      'id', l.id,
      'title', l.title,
      'itemName', i.name,
      'description', l.description,
      'image', to_jsonb(i.images) -> 0,
      'accessType', ar.access_type,
      'price', l.price,
      'priceUnit', l.price_unit,
      'deposit', l.deposit,
      'currency', l.currency,
      'location', l.location_area
    ),
    'requester', jsonb_build_object('id', requester.id, 'name', coalesce(requester.full_name, 'Community member')),
    'owner', jsonb_build_object('id', owner.id, 'name', coalesce(owner.full_name, 'Community member')),
    'accessType', ar.access_type,
    'status', ar.status,
    'requestedFrom', ar.requested_from,
    'requestedUntil', ar.requested_until,
    'message', ar.message,
    'offeredPrice', ar.offered_price,
    'depositAmount', ar.deposit_amount,
    'createdAt', ar.created_at,
    'exchangeId', e.id,
    'exchangeStatus', e.status
  )
  from public.access_requests ar
  join public.listings l on l.id = ar.listing_id
  join public.items i on i.id = l.item_id
  join public.profiles requester on requester.id = ar.requester_id
  join public.profiles owner on owner.id = ar.owner_id
  left join public.exchanges e on e.access_request_id = ar.id
  where (ar.requester_id = v_user_id or ar.owner_id = v_user_id)
    and (
      (p_request_id is not null and ar.id = p_request_id)
      or (p_request_id is null and p_scope = 'mine' and ar.requester_id = v_user_id)
      or (p_request_id is null and p_scope = 'received' and ar.owner_id = v_user_id)
    )
  order by ar.created_at desc
  limit case when p_request_id is null then 100 else 1 end;
end;
$$;

create or replace function public.get_exchange_details(p_exchange_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', e.id,
    'status', e.status,
    'accessRequestId', e.access_request_id,
    'listing', jsonb_build_object(
      'id', l.id,
      'title', l.title,
      'itemName', i.name,
      'description', l.description,
      'image', to_jsonb(i.images) -> 0,
      'accessType', ar.access_type,
      'price', l.price,
      'priceUnit', l.price_unit,
      'deposit', l.deposit,
      'currency', l.currency,
      'location', l.location_area
    ),
    'owner', jsonb_build_object('id', owner.id, 'name', coalesce(owner.full_name, 'Community member')),
    'requester', jsonb_build_object('id', requester.id, 'name', coalesce(requester.full_name, 'Community member')),
    'expectedReturnAt', e.expected_return_at,
    'handoverAt', e.handover_at,
    'receivedAt', e.received_at,
    'returnedAt', e.returned_at,
    'returnConfirmedAt', e.return_confirmed_at,
    'handoverNotes', e.handover_notes,
    'returnNotes', e.return_notes,
    'createdAt', e.created_at
  ) into v_result
  from public.exchanges e
  join public.access_requests ar on ar.id = e.access_request_id
  join public.listings l on l.id = e.listing_id
  join public.items i on i.id = l.item_id
  join public.profiles owner on owner.id = e.owner_id
  join public.profiles requester on requester.id = e.borrower_id
  where e.id = p_exchange_id
    and (e.owner_id = v_user_id or e.borrower_id = v_user_id);

  if v_result is null then
    raise exception 'Exchange not found.' using errcode = 'P0001';
  end if;
  return v_result;
end;
$$;