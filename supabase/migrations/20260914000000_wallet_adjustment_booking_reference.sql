-- Lets a manual wallet adjustment optionally record which booking it relates
-- to, using the same metadata.booking_id key admin_get_wallet_transactions
-- already reads (see 20260905000000_admin_wallet_management.sql) — so an
-- adjustment made to resolve a dispute shows up with a booking reference the
-- same way an escrow transaction does, with no new column or read path.
--
-- Optional, not required: plenty of adjustments (a goodwill credit, a
-- platform-error correction) do not relate to any booking, and there is no
-- bookings table yet to validate a real one against — it is accepted as
-- free text, same as the existing metadata convention.
--
-- Postgres treats a changed parameter list as a different function, not an
-- in-place edit, so the old signature is dropped first rather than left
-- behind as a second, unreachable overload.

drop function if exists public.admin_apply_wallet_adjustment(uuid, text, bigint, text);

create function public.admin_apply_wallet_adjustment(
  target_wallet_id uuid,
  direction text,
  amount_cents bigint,
  reason text,
  booking_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.wallets%rowtype;
  signed_amount bigint;
  new_transaction_id uuid;
  previous_balance bigint;
  updated_balance bigint;
  clean_booking_id text := nullif(trim(coalesce(booking_id, '')), '');
  tx_metadata jsonb := case
    when clean_booking_id is null then '{}'::jsonb
    else jsonb_build_object('booking_id', clean_booking_id)
  end;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  if direction not in ('CREDIT', 'DEBIT') then
    raise exception 'Direction must be CREDIT or DEBIT';
  end if;

  if amount_cents is null or amount_cents <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if trim(coalesce(reason, '')) = '' then
    raise exception 'A justification is required';
  end if;

  select * into w from public.wallets where id = target_wallet_id for update;
  if not found then
    raise exception 'Wallet not found';
  end if;

  if direction = 'DEBIT' and amount_cents > w.available_balance_cents then
    raise exception 'Amount exceeds available balance';
  end if;

  signed_amount := case direction when 'CREDIT' then amount_cents else -amount_cents end;
  previous_balance := w.available_balance_cents;
  updated_balance := previous_balance + signed_amount;

  insert into public.wallet_transactions (wallet_id, user_id, type, amount_cents, description, status, currency, metadata)
  values (
    w.id,
    w.user_id,
    case direction when 'CREDIT' then 'ADMIN_CREDIT' else 'ADMIN_DEBIT' end,
    signed_amount,
    reason,
    'COMPLETED',
    'sgd',
    tx_metadata
  )
  returning id into new_transaction_id;

  update public.wallets
  set available_balance_cents = updated_balance, updated_at = now()
  where id = w.id;

  perform public.record_admin_action(
    case direction when 'CREDIT' then 'wallet_credit_applied' else 'wallet_debit_applied' end,
    w.user_id,
    jsonb_build_object(
      'wallet_id', w.id,
      'transaction_id', new_transaction_id,
      'direction', direction,
      'amount_cents', amount_cents,
      'reason', reason,
      'booking_id', clean_booking_id,
      'previous_balance_cents', previous_balance,
      'updated_balance_cents', updated_balance
    )
  );

  return new_transaction_id;
end;
$$;

revoke execute on function public.admin_apply_wallet_adjustment(uuid, text, bigint, text, text) from public, anon;
grant execute on function public.admin_apply_wallet_adjustment(uuid, text, bigint, text, text) to authenticated, service_role;
