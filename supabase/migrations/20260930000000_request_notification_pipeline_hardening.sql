drop trigger if exists access_requests_notifications on public.access_requests;
drop trigger if exists exchange_notifications on public.exchanges;

drop function if exists public.handle_request_lifecycle_notifications();
drop function if exists public.handle_exchange_lifecycle_notifications();

create unique index if not exists notifications_unique_reference_idx
  on public.notifications (user_id, type, reference_id)
  where reference_id is not null;

-- Keep notifications and conversations generated from the authoritative request/exchange
-- lifecycle RPCs and message insert trigger only. The older trigger-based handlers are
-- intentionally removed to avoid duplicate or missing event generation.
