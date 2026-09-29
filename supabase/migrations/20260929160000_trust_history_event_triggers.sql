create or replace function public.record_review_trust_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trust_history (
    user_id,
    event_type,
    points_change,
    reference_id,
    description
  )
  values (
    new.reviewee_id,
    case when new.rating >= 4 then 'POSITIVE_REVIEW' else 'NEGATIVE_REVIEW' end,
    case when new.rating >= 4 then 5 else -3 end,
    new.id,
    'Review left after a completed exchange.'
  );

  return new;
end;
$$;

create trigger reviews_insert_trust_history
after insert on public.reviews
for each row
execute function public.record_review_trust_event();

create or replace function public.record_exchange_trust_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'COMPLETED' and old.status is distinct from new.status then
    insert into public.trust_history (
      user_id,
      event_type,
      points_change,
      reference_id,
      description
    )
    values
      (new.owner_id, 'SUCCESSFUL_EXCHANGE', 8, new.id, 'Exchange completed successfully.'),
      (new.borrower_id, 'SUCCESSFUL_EXCHANGE', 8, new.id, 'Exchange completed successfully.');
  end if;

  if new.status = 'CANCELLED' and old.status is distinct from new.status then
    insert into public.trust_history (
      user_id,
      event_type,
      points_change,
      reference_id,
      description
    )
    values
      (new.owner_id, 'CANCELLATION', -2, new.id, 'Exchange was cancelled before completion.'),
      (new.borrower_id, 'CANCELLATION', -2, new.id, 'Exchange was cancelled before completion.');
  end if;

  if new.return_confirmed_at is not null and old.return_confirmed_at is distinct from new.return_confirmed_at then
    insert into public.trust_history (
      user_id,
      event_type,
      points_change,
      reference_id,
      description
    )
    values
      (new.owner_id, 'SUCCESSFUL_RETURN', 4, new.id, 'Return confirmed after access ended.'),
      (new.borrower_id, 'SUCCESSFUL_RETURN', 4, new.id, 'Return confirmed after access ended.');
  end if;

  return new;
end;
$$;

create trigger exchanges_trust_history
after update on public.exchanges
for each row
when (
  old.status is distinct from new.status
  or old.return_confirmed_at is distinct from new.return_confirmed_at
)
execute function public.record_exchange_trust_event();
