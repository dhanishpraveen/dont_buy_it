alter function public.decide_access_request(uuid, text) strict;

create or replace function public.enforce_lifecycle_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.listings%rowtype;
begin
  if tg_table_name = 'access_requests' then
    if tg_op = 'INSERT' then
      if new.status <> 'PENDING' then
        raise exception 'New requests must start as pending.' using errcode = 'P0001';
      end if;
      return new;
    end if;

    if old.status is distinct from new.status then
      if not (
        (old.status = 'PENDING' and new.status in ('ACCEPTED', 'REJECTED', 'CANCELLED'))
        or (old.status = 'ACCEPTED' and new.status = 'COMPLETED')
      ) then
        raise exception 'This request status transition is not allowed.' using errcode = 'P0001';
      end if;
    end if;

    if new.status = 'ACCEPTED' and old.status is distinct from new.status then
      select * into v_listing
      from public.listings
      where id = new.listing_id
      for update;
      if not found or v_listing.owner_id <> new.owner_id
         or v_listing.status <> 'ACTIVE'
         or v_listing.availability_status = 'UNAVAILABLE'
         or v_listing.access_type <> new.access_type then
        raise exception 'This listing is no longer available.' using errcode = 'P0001';
      end if;

      if new.access_type in ('BORROW', 'RENT') then
        if new.requested_from is null or new.requested_until is null then
          raise exception 'A start and end date are required.' using errcode = 'P0001';
        end if;
        if new.requested_from < clock_timestamp() then
          raise exception 'This request period has already started.' using errcode = 'P0001';
        end if;
        if new.requested_until <= new.requested_from then
          raise exception 'The end date must be after the start date.' using errcode = 'P0001';
        end if;
        if v_listing.available_from is not null and new.requested_from < v_listing.available_from then
          raise exception 'This listing is not available for the selected period.' using errcode = 'P0001';
        end if;
        if v_listing.available_until is not null and new.requested_until > v_listing.available_until then
          raise exception 'This listing is not available for the selected period.' using errcode = 'P0001';
        end if;
        if exists (
          select 1 from public.access_requests ar
          where ar.listing_id = new.listing_id
            and ar.id <> new.id
            and ar.status = 'ACCEPTED'
            and tstzrange(ar.requested_from, ar.requested_until, '[)')
                && tstzrange(new.requested_from, new.requested_until, '[)')
        ) then
          raise exception 'This resource is already reserved for the selected period.' using errcode = 'P0001';
        end if;
      elsif exists (
        select 1 from public.access_requests ar
        where ar.listing_id = new.listing_id
          and ar.id <> new.id
          and ar.status = 'ACCEPTED'
      ) then
        raise exception 'A purchase request for this listing has already been accepted.' using errcode = 'P0001';
      end if;
    end if;

    return new;
  end if;

  if tg_table_name = 'exchanges' then
    if tg_op = 'INSERT' then
      if new.status <> 'PENDING_HANDOVER' then
        raise exception 'New exchanges must start pending handover.' using errcode = 'P0001';
      end if;
      return new;
    end if;

    if old.status is distinct from new.status and not (
      (old.status = 'PENDING_HANDOVER' and new.status = 'HANDED_OVER')
      or (old.status = 'HANDED_OVER' and new.status in ('IN_USE', 'COMPLETED'))
      or (old.status = 'IN_USE' and new.status = 'RETURN_PENDING')
      or (old.status = 'RETURN_PENDING' and new.status = 'RETURNED')
      or (old.status = 'RETURNED' and new.status = 'COMPLETED')
    ) then
      raise exception 'This exchange status transition is not allowed.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  raise exception 'Lifecycle transition guard used on an unsupported table.' using errcode = 'P0001';
end;
$$;

revoke all on function public.enforce_lifecycle_transition() from public, anon, authenticated;

create trigger access_requests_lifecycle_guard
before insert or update on public.access_requests
for each row execute function public.enforce_lifecycle_transition();

create trigger exchanges_lifecycle_guard
before insert or update on public.exchanges
for each row execute function public.enforce_lifecycle_transition();