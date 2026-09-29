create unique index if not exists access_requests_pending_requester_listing_idx
  on public.access_requests (requester_id, listing_id)
  where status = 'PENDING';

revoke all on table public.access_requests, public.exchanges from anon, authenticated;
grant select on table public.access_requests, public.exchanges to authenticated;

drop policy if exists access_requests_insert_requester on public.access_requests;
drop policy if exists access_requests_update_participant on public.access_requests;

create or replace function public.create_access_request(
  p_listing_id uuid,
  p_requested_from timestamptz default null,
  p_requested_until timestamptz default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id
  for share;

  if not found or v_listing.status <> 'ACTIVE' or v_listing.availability_status = 'UNAVAILABLE' then
    raise exception 'This listing is no longer available.' using errcode = 'P0001';
  end if;
  if v_listing.owner_id = v_user_id then
    raise exception 'You can''t request your own listing.' using errcode = 'P0001';
  end if;
  if v_listing.access_type not in ('BORROW', 'RENT', 'BUY_USED', 'BUY_NEW') then
    raise exception 'This listing has an unsupported access type.' using errcode = 'P0001';
  end if;
  if p_message is not null and char_length(trim(p_message)) > 2000 then
    raise exception 'Keep your message under 2,000 characters.' using errcode = 'P0001';
  end if;

  if v_listing.access_type in ('BORROW', 'RENT') then
    if p_requested_from is null or p_requested_until is null then
      raise exception 'Choose a start and end date.' using errcode = 'P0001';
    end if;
    if p_requested_from < clock_timestamp() then
      raise exception 'Choose a start date that is not in the past.' using errcode = 'P0001';
    end if;
    if p_requested_until <= p_requested_from then
      raise exception 'The end date must be after the start date.' using errcode = 'P0001';
    end if;
    if v_listing.available_from is not null and p_requested_from < v_listing.available_from then
      raise exception 'This listing is not available for the selected start date.' using errcode = 'P0001';
    end if;
    if v_listing.available_until is not null and p_requested_until > v_listing.available_until then
      raise exception 'This listing is not available for the selected end date.' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.access_requests ar
      where ar.listing_id = v_listing.id
        and ar.status = 'ACCEPTED'
        and tstzrange(ar.requested_from, ar.requested_until, '[)')
            && tstzrange(p_requested_from, p_requested_until, '[)')
    ) then
      raise exception 'This resource is already reserved for the selected period.' using errcode = 'P0001';
    end if;
  else
    p_requested_from := null;
    p_requested_until := null;
  end if;

  insert into public.access_requests (
    listing_id, requester_id, owner_id, access_type, status,
    requested_from, requested_until, message, offered_price, deposit_amount
  ) values (
    v_listing.id, v_user_id, v_listing.owner_id, v_listing.access_type, 'PENDING',
    p_requested_from, p_requested_until, nullif(trim(p_message), ''), v_listing.price, v_listing.deposit
  ) returning id into v_request_id;

  return v_request_id;
exception
  when unique_violation then
    raise exception 'You already have a pending request for this listing.' using errcode = 'P0001';
end;
$$;

create or replace function public.decide_access_request(
  p_request_id uuid,
  p_decision text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.access_requests%rowtype;
  v_listing public.listings%rowtype;
  v_exchange_id uuid;
  v_decision text := upper(trim(p_decision));
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if v_decision not in ('ACCEPT', 'REJECT') then
    raise exception 'Choose accept or reject.' using errcode = 'P0001';
  end if;

  select * into v_request
  from public.access_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'Request not found.' using errcode = 'P0001';
  end if;
  if v_request.owner_id <> v_user_id then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;
  if v_request.status <> 'PENDING' then
    raise exception 'This request has already been processed.' using errcode = 'P0001';
  end if;

  if v_decision = 'REJECT' then
    update public.access_requests set status = 'REJECTED' where id = v_request.id;
    return null;
  end if;

  select * into v_listing
  from public.listings
  where id = v_request.listing_id
  for update;
  if not found or v_listing.owner_id <> v_user_id or v_listing.status <> 'ACTIVE'
     or v_listing.availability_status = 'UNAVAILABLE' then
    raise exception 'This listing is no longer available.' using errcode = 'P0001';
  end if;
  if v_listing.access_type <> v_request.access_type then
    raise exception 'The listing access type has changed.' using errcode = 'P0001';
  end if;

  if v_request.access_type in ('BORROW', 'RENT') then
    if v_request.requested_from is null or v_request.requested_until is null then
      raise exception 'The request is missing required dates.' using errcode = 'P0001';
    end if;
    if v_listing.available_from is not null and v_request.requested_from < v_listing.available_from then
      raise exception 'This listing is not available for the selected start date.' using errcode = 'P0001';
    end if;
    if v_listing.available_until is not null and v_request.requested_until > v_listing.available_until then
      raise exception 'This listing is not available for the selected end date.' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.access_requests ar
      where ar.listing_id = v_listing.id
        and ar.id <> v_request.id
        and ar.status = 'ACCEPTED'
        and tstzrange(ar.requested_from, ar.requested_until, '[)')
            && tstzrange(v_request.requested_from, v_request.requested_until, '[)')
    ) then
      raise exception 'This resource is already reserved for the selected period.' using errcode = 'P0001';
    end if;
  elsif exists (
    select 1 from public.access_requests ar
    where ar.listing_id = v_listing.id
      and ar.id <> v_request.id
      and ar.status = 'ACCEPTED'
  ) then
    raise exception 'A purchase request for this listing has already been accepted.' using errcode = 'P0001';
  end if;

  insert into public.exchanges (
    access_request_id, listing_id, owner_id, borrower_id, status, expected_return_at
  ) values (
    v_request.id, v_listing.id, v_listing.owner_id, v_request.requester_id,
    'PENDING_HANDOVER',
    case when v_request.access_type in ('BORROW', 'RENT') then v_request.requested_until else null end
  ) returning id into v_exchange_id;

  update public.access_requests set status = 'ACCEPTED' where id = v_request.id;
  return v_exchange_id;
end;
$$;

create or replace function public.cancel_access_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.access_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  select * into v_request from public.access_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.' using errcode = 'P0001';
  end if;
  if v_request.requester_id <> v_user_id then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;
  if v_request.status <> 'PENDING' then
    raise exception 'Only pending requests can be cancelled.' using errcode = 'P0001';
  end if;
  update public.access_requests set status = 'CANCELLED' where id = v_request.id;
end;
$$;

create or replace function public.advance_exchange(
  p_exchange_id uuid,
  p_action text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_exchange public.exchanges%rowtype;
  v_request public.access_requests%rowtype;
  v_action text := upper(trim(p_action));
  v_notes text := nullif(trim(p_notes), '');
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_notes is not null and char_length(trim(p_notes)) > 2000 then
    raise exception 'Keep your note under 2,000 characters.' using errcode = 'P0001';
  end if;

  select * into v_exchange from public.exchanges where id = p_exchange_id for update;
  if not found then
    raise exception 'Exchange not found.' using errcode = 'P0001';
  end if;
  if v_user_id <> v_exchange.owner_id and v_user_id <> v_exchange.borrower_id then
    raise exception 'You don''t have permission to perform this action.' using errcode = '42501';
  end if;
  select * into v_request from public.access_requests where id = v_exchange.access_request_id for update;

  if v_action = 'CONFIRM_HANDOVER' then
    if v_user_id <> v_exchange.owner_id then
      raise exception 'Only the listing owner can confirm handover.' using errcode = '42501';
    end if;
    if v_exchange.status <> 'PENDING_HANDOVER' then
      raise exception 'Handover is not available in the current state.' using errcode = 'P0001';
    end if;
    update public.exchanges set status = 'HANDED_OVER', handover_at = clock_timestamp(), handover_notes = v_notes where id = v_exchange.id;
  elsif v_action = 'CONFIRM_RECEIPT' then
    if v_user_id <> v_exchange.borrower_id then
      raise exception 'Only the requester can confirm receipt.' using errcode = '42501';
    end if;
    if v_exchange.status <> 'HANDED_OVER' then
      raise exception 'Receipt is not available in the current state.' using errcode = 'P0001';
    end if;
    if v_request.access_type in ('BUY_USED', 'BUY_NEW') then
      update public.exchanges set status = 'COMPLETED', received_at = clock_timestamp() where id = v_exchange.id;
      update public.access_requests set status = 'COMPLETED' where id = v_request.id;
      update public.listings set status = 'SOLD' where id = v_exchange.listing_id;
    else
      update public.exchanges set status = 'IN_USE', received_at = clock_timestamp() where id = v_exchange.id;
    end if;
  elsif v_action = 'REQUEST_RETURN' then
    if v_user_id <> v_exchange.borrower_id then
      raise exception 'Only the requester can initiate a return.' using errcode = '42501';
    end if;
    if v_request.access_type not in ('BORROW', 'RENT') then
      raise exception 'Purchased items do not use the return flow.' using errcode = 'P0001';
    end if;
    if v_exchange.status <> 'IN_USE' then
      raise exception 'A return is not available in the current state.' using errcode = 'P0001';
    end if;
    update public.exchanges set status = 'RETURN_PENDING', returned_at = clock_timestamp(), return_notes = v_notes where id = v_exchange.id;
  elsif v_action = 'CONFIRM_RETURN' then
    if v_user_id <> v_exchange.owner_id then
      raise exception 'Only the listing owner can confirm a return.' using errcode = '42501';
    end if;
    if v_request.access_type not in ('BORROW', 'RENT') then
      raise exception 'Purchased items do not use the return flow.' using errcode = 'P0001';
    end if;
    if v_exchange.status <> 'RETURN_PENDING' then
      raise exception 'A return has not been requested.' using errcode = 'P0001';
    end if;
    update public.exchanges set status = 'RETURNED', return_confirmed_at = clock_timestamp(), return_notes = coalesce(v_notes, return_notes) where id = v_exchange.id;
    update public.exchanges set status = 'COMPLETED' where id = v_exchange.id;
    update public.access_requests set status = 'COMPLETED' where id = v_request.id;
  else
    raise exception 'Choose a valid exchange action.' using errcode = 'P0001';
  end if;

  return v_exchange.id;
end;
$$;

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
      'image', i.images -> 0,
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
      'image', i.images -> 0,
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

revoke all on function public.create_access_request(uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.decide_access_request(uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_access_request(uuid) from public, anon, authenticated;
revoke all on function public.advance_exchange(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_access_requests(text, uuid) from public, anon, authenticated;
revoke all on function public.get_exchange_details(uuid) from public, anon, authenticated;

grant execute on function public.create_access_request(uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.decide_access_request(uuid, text) to authenticated;
grant execute on function public.cancel_access_request(uuid) to authenticated;
grant execute on function public.advance_exchange(uuid, text, text) to authenticated;
grant execute on function public.get_access_requests(text, uuid) to authenticated;
grant execute on function public.get_exchange_details(uuid) to authenticated;