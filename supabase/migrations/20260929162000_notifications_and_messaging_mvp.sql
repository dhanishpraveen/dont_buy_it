create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  request_id uuid references public.access_requests(id) on delete cascade,
  exchange_id uuid references public.exchanges(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_target_required check (request_id is not null or exchange_id is not null),
  constraint conversations_single_target check (
    (request_id is not null and exchange_id is null) or
    (exchange_id is not null and request_id is null)
  ),
  unique (request_id),
  unique (exchange_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists conversations_listing_id_idx on public.conversations(listing_id);
create index if not exists conversations_request_id_idx on public.conversations(request_id);
create index if not exists conversations_exchange_id_idx on public.conversations(exchange_id);
create index if not exists messages_conversation_id_created_idx on public.messages(conversation_id, created_at desc);

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

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    reference_type,
    reference_id,
    is_read
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_reference_type,
    p_reference_id,
    false
  );
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
  select listing_id into v_listing_id from public.access_requests where id = p_request_id;
  if v_listing_id is null then
    return null;
  end if;

  select id into v_conversation_id
  from public.conversations
  where request_id = p_request_id
  limit 1;

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
    where request_id = p_request_id
    limit 1;
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
  select listing_id into v_listing_id from public.exchanges where id = p_exchange_id;
  if v_listing_id is null then
    return null;
  end if;

  select id into v_conversation_id
  from public.conversations
  where exchange_id = p_exchange_id
  limit 1;

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
    where exchange_id = p_exchange_id
    limit 1;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.handle_request_lifecycle_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_title text;
begin
  if TG_OP = 'INSERT' and NEW.status = 'PENDING' then
    select coalesce(l.title, i.name)
    into v_listing_title
    from public.listings l
    join public.items i on i.id = l.item_id
    where l.id = NEW.listing_id;

    perform public.create_notification(
      NEW.owner_id,
      'REQUEST_RECEIVED',
      'New request',
      format('%s requested %s.',
        coalesce((select full_name from public.profiles where id = NEW.requester_id), 'Someone'),
        coalesce(v_listing_title, 'this listing')
      ),
      'request',
      NEW.id
    );

    perform public.ensure_conversation_for_request(NEW.id);
  end if;

  if TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status then
    case NEW.status
      when 'ACCEPTED' then
        perform public.create_notification(
          NEW.requester_id,
          'REQUEST_ACCEPTED',
          'Request accepted',
          'Your request was accepted. The exchange is ready to move forward.',
          'request',
          NEW.id
        );
      when 'REJECTED' then
        perform public.create_notification(
          NEW.requester_id,
          'REQUEST_REJECTED',
          'Request rejected',
          'Your request was not accepted for this listing.',
          'request',
          NEW.id
        );
      when 'CANCELLED' then
        perform public.create_notification(
          NEW.owner_id,
          'REQUEST_CANCELLED',
          'Request cancelled',
          'The request for this listing was cancelled.',
          'request',
          NEW.id
        );
    end case;
  end if;

  return NEW;
end;
$$;

create or replace function public.handle_exchange_lifecycle_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_title text;
begin
  if TG_OP = 'INSERT' then
    select coalesce(l.title, i.name)
    into v_listing_title
    from public.listings l
    join public.items i on i.id = l.item_id
    where l.id = NEW.listing_id;

    perform public.create_notification(
      NEW.owner_id,
      'EXCHANGE_CREATED',
      'Exchange started',
      format('A new exchange for %s has started.', coalesce(v_listing_title, 'this listing')),
      'exchange',
      NEW.id
    );

    perform public.create_notification(
      NEW.borrower_id,
      'EXCHANGE_CREATED',
      'Exchange started',
      format('A new exchange for %s has started.', coalesce(v_listing_title, 'this listing')),
      'exchange',
      NEW.id
    );

    perform public.ensure_conversation_for_exchange(NEW.id);
  end if;

  if TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status then
    case NEW.status
      when 'HANDED_OVER' then
        perform public.create_notification(
          NEW.borrower_id,
          'HANDOVER_UPDATED',
          'Handover complete',
          'The item has been handed over. Please confirm receipt.',
          'exchange',
          NEW.id
        );
      when 'RETURN_PENDING' then
        perform public.create_notification(
          NEW.owner_id,
          'RETURN_UPDATED',
          'Return requested',
          'The borrower has requested the item back. Please confirm the return.',
          'exchange',
          NEW.id
        );
      when 'COMPLETED' then
        perform public.create_notification(
          NEW.owner_id,
          'EXCHANGE_COMPLETED',
          'Exchange completed',
          'The exchange has been completed successfully.',
          'exchange',
          NEW.id
        );
        perform public.create_notification(
          NEW.borrower_id,
          'EXCHANGE_COMPLETED',
          'Exchange completed',
          'The exchange has been completed successfully.',
          'exchange',
          NEW.id
        );
        perform public.create_notification(
          NEW.owner_id,
          'REVIEW_AVAILABLE',
          'Leave a review',
          'You can leave a review for the other participant now.',
          'exchange',
          NEW.id
        );
        perform public.create_notification(
          NEW.borrower_id,
          'REVIEW_AVAILABLE',
          'Leave a review',
          'You can leave a review for the other participant now.',
          'exchange',
          NEW.id
        );
    end case;
  end if;

  return NEW;
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

drop trigger if exists access_requests_notifications on public.access_requests;
create trigger access_requests_notifications
after insert or update of status on public.access_requests
for each row
execute function public.handle_request_lifecycle_notifications();

drop trigger if exists exchange_notifications on public.exchanges;
create trigger exchange_notifications
after insert or update of status on public.exchanges
for each row
execute function public.handle_exchange_lifecycle_notifications();

drop trigger if exists message_notifications on public.messages;
create trigger message_notifications
after insert on public.messages
for each row
execute function public.notify_conversation_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

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
