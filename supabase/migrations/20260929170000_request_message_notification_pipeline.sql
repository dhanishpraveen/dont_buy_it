create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  request_id uuid unique references public.access_requests(id) on delete cascade,
  exchange_id uuid unique references public.exchanges(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_target_required check (
    request_id is not null or exchange_id is not null
  ),
  constraint conversations_single_target check (
    (request_id is not null and exchange_id is null) or
    (exchange_id is not null and request_id is null)
  )
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists conversations_listing_id_idx on public.conversations(listing_id);
create index if not exists conversations_request_id_idx on public.conversations(request_id);
create index if not exists conversations_exchange_id_idx on public.conversations(exchange_id);
create index if not exists messages_conversation_id_created_idx on public.messages(conversation_id, created_at desc);
create unique index if not exists notifications_unique_reference_idx
  on public.notifications (user_id, type, reference_id)
  where reference_id is not null;

create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_reference_type text,
  p_reference_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, type, title, message, reference_type, reference_id, is_read)
  values (p_user_id, p_type, p_title, p_message, p_reference_type, p_reference_id, false)
  on conflict (user_id, type, reference_id) where reference_id is not null do nothing;
end;
$$;

create or replace function public.ensure_conversation_for_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_conversation_id uuid;
begin
  if p_request_id is null then
    return null;
  end if;

  select listing_id into v_listing_id from public.access_requests where id = p_request_id;
  if v_listing_id is null then
    return null;
  end if;

  select id into v_conversation_id
  from public.conversations
  where request_id = p_request_id;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (listing_id, request_id)
  values (v_listing_id, p_request_id)
  on conflict (request_id) do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select id into v_conversation_id
    from public.conversations
    where request_id = p_request_id;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.ensure_conversation_for_exchange(p_exchange_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_conversation_id uuid;
begin
  if p_exchange_id is null then
    return null;
  end if;

  select listing_id into v_listing_id from public.exchanges where id = p_exchange_id;
  if v_listing_id is null then
    return null;
  end if;

  select id into v_conversation_id
  from public.conversations
  where exchange_id = p_exchange_id;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (listing_id, exchange_id)
  values (v_listing_id, p_exchange_id)
  on conflict (exchange_id) do nothing
  returning id into v_conversation_id;

  if v_conversation_id is null then
    select id into v_conversation_id
    from public.conversations
    where exchange_id = p_exchange_id;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.notify_conversation_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient_id uuid;
  v_sender_name text;
begin
  select
    case
      when c.request_id is not null then
        case when ar.requester_id = NEW.sender_id then ar.owner_id else ar.requester_id end
      when c.exchange_id is not null then
        case when e.owner_id = NEW.sender_id then e.borrower_id else e.owner_id end
      else null
    end,
    coalesce((select full_name from public.profiles where id = NEW.sender_id), 'A participant')
  into v_recipient_id, v_sender_name
  from public.conversations c
  left join public.access_requests ar on ar.id = c.request_id
  left join public.exchanges e on e.id = c.exchange_id
  where c.id = NEW.conversation_id;

  if v_recipient_id is not null and v_recipient_id <> NEW.sender_id then
    perform public.create_notification(
      v_recipient_id,
      'NEW_MESSAGE',
      'New message',
      format('%s sent you a message.', v_sender_name),
      'conversation',
      NEW.conversation_id
    );
  end if;

  return NEW;
end;
$$;

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

  perform public.create_notification(
    v_listing.owner_id,
    'NEW_REQUEST',
    'New access request',
    format('%s requested %s.', coalesce((select full_name from public.profiles where id = v_user_id), 'Someone'), coalesce(v_listing.title, 'this listing')),
    'request',
    v_request_id
  );

  perform public.create_notification(
    v_user_id,
    'REQUEST_SENT',
    'Request sent',
    format('Your request for %s was sent to %s.', coalesce(v_listing.title, 'this item'), coalesce((select full_name from public.profiles where id = v_listing.owner_id), 'the owner')),
    'request',
    v_request_id
  );

  perform public.ensure_conversation_for_request(v_request_id);

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
    perform public.create_notification(
      v_request.requester_id,
      'REQUEST_REJECTED',
      'Request rejected',
      format('Your request for %s was rejected.', coalesce((select title from public.listings where id = v_request.listing_id), 'this listing')),
      'request',
      v_request.id
    );
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

  perform public.create_notification(
    v_request.requester_id,
    'REQUEST_ACCEPTED',
    'Request accepted',
    format('Your request for %s was accepted.', coalesce(v_listing.title, 'this listing')),
    'request',
    v_request.id
  );

  perform public.ensure_conversation_for_exchange(v_exchange_id);

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
  perform public.create_notification(
    v_request.owner_id,
    'REQUEST_CANCELLED',
    'Request cancelled',
    format('%s cancelled their request for %s.', coalesce((select full_name from public.profiles where id = v_request.requester_id), 'Someone'), coalesce((select title from public.listings where id = v_request.listing_id), 'this listing')),
    'request',
    v_request.id
  );
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
    perform public.create_notification(
      v_exchange.borrower_id,
      'ITEM_HANDOVER_CONFIRMED',
      'Item handed over',
      format('Your item is ready for pickup or has been handed over for %s.', coalesce((select title from public.listings where id = v_exchange.listing_id), 'this listing')),
      'exchange',
      v_exchange.id
    );
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
      perform public.create_notification(
        v_exchange.owner_id,
        'EXCHANGE_COMPLETED',
        'Exchange completed',
        'The exchange has been completed successfully.',
        'exchange',
        v_exchange.id
      );
    else
      update public.exchanges set status = 'IN_USE', received_at = clock_timestamp() where id = v_exchange.id;
      perform public.create_notification(
        v_exchange.owner_id,
        'ITEM_RECEIVED',
        'Item received',
        'The borrower has confirmed receipt of the item.',
        'exchange',
        v_exchange.id
      );
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
    perform public.create_notification(
      v_exchange.owner_id,
      'RETURN_REQUESTED',
      'Return requested',
      format('A return was requested for %s.', coalesce((select title from public.listings where id = v_exchange.listing_id), 'this listing')),
      'exchange',
      v_exchange.id
    );
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
    perform public.create_notification(
      v_exchange.borrower_id,
      'RETURN_CONFIRMED',
      'Return confirmed',
      'The return has been confirmed and the exchange is complete.',
      'exchange',
      v_exchange.id
    );
  else
    raise exception 'Choose a valid exchange action.' using errcode = 'P0001';
  end if;

  return v_exchange.id;
end;
$$;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

create policy conversations_select_participant on public.conversations
for select to authenticated
using (
  (
    request_id is not null and exists (
      select 1 from public.access_requests ar
      where ar.id = conversations.request_id
        and (ar.requester_id = auth.uid() or ar.owner_id = auth.uid())
    )
  )
  or
  (
    exchange_id is not null and exists (
      select 1 from public.exchanges e
      where e.id = conversations.exchange_id
        and (e.owner_id = auth.uid() or e.borrower_id = auth.uid())
    )
  )
);

create policy conversations_insert_participant on public.conversations
for insert to authenticated
with check (
  (
    request_id is not null and exists (
      select 1 from public.access_requests ar
      where ar.id = conversations.request_id
        and (ar.requester_id = auth.uid() or ar.owner_id = auth.uid())
    )
  )
  or
  (
    exchange_id is not null and exists (
      select 1 from public.exchanges e
      where e.id = conversations.exchange_id
        and (e.owner_id = auth.uid() or e.borrower_id = auth.uid())
    )
  )
);

create policy messages_select_participant on public.messages
for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (
        (
          c.request_id is not null and exists (
            select 1 from public.access_requests ar
            where ar.id = c.request_id
              and (ar.requester_id = auth.uid() or ar.owner_id = auth.uid())
          )
        )
        or
        (
          c.exchange_id is not null and exists (
            select 1 from public.exchanges e
            where e.id = c.exchange_id
              and (e.owner_id = auth.uid() or e.borrower_id = auth.uid())
          )
        )
      )
  )
);

create policy messages_insert_self on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (
        (
          c.request_id is not null and exists (
            select 1 from public.access_requests ar
            where ar.id = c.request_id
              and (ar.requester_id = auth.uid() or ar.owner_id = auth.uid())
          )
        )
        or
        (
          c.exchange_id is not null and exists (
            select 1 from public.exchanges e
            where e.id = c.exchange_id
              and (e.owner_id = auth.uid() or e.borrower_id = auth.uid())
          )
        )
      )
  )
);

drop trigger if exists message_notifications on public.messages;
create trigger message_notifications
after insert on public.messages
for each row execute function public.notify_conversation_message();
