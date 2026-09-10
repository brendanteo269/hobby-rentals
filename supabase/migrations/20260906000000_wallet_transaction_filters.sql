-- Search and type filtering for a wallet's transaction history.
--
-- Replaces admin_get_wallet_transactions with a version that adds two more
-- parameters. Postgres treats a changed parameter list as a different
-- function, not an in-place edit, so the old signature is dropped first
-- rather than left behind as a second, unreachable overload.

drop function if exists public.admin_get_wallet_transactions(uuid, int, int);

/**
 * One wallet's transaction history, newest first, optionally narrowed by a
 * description search and/or an exact transaction type.
 *
 * search matches via strpos against description, for the same reason as
 * admin_search_wallets: '%' and '_' typed by an administrator should match
 * literally, not behave as LIKE wildcards. type_filter is an exact match
 * against the type column rather than a search, since the set of types is
 * fixed and known to the caller (it drives a select, not a free-text box).
 */
create function public.admin_get_wallet_transactions(
  target_wallet_id uuid,
  search text default '',
  type_filter text default '',
  result_limit int default 25,
  result_offset int default 0
)
returns table (
  id uuid,
  type text,
  amount_cents bigint,
  description text,
  status text,
  currency text,
  metadata jsonb,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  needle text := lower(trim(coalesce(search, '')));
  wanted_type text := trim(coalesce(type_filter, ''));
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  return query
    select
      t.id,
      t.type,
      t.amount_cents,
      t.description,
      t.status,
      t.currency,
      t.metadata,
      t.created_at,
      count(*) over () as total_count
    from public.wallet_transactions t
    where t.wallet_id = target_wallet_id
      and (needle = '' or strpos(lower(t.description), needle) > 0)
      and (wanted_type = '' or t.type = wanted_type)
    order by t.created_at desc
    limit least(greatest(result_limit, 1), 100)
    offset greatest(result_offset, 0);
end;
$$;

revoke execute on function public.admin_get_wallet_transactions(uuid, text, text, int, int) from public, anon;
grant execute on function public.admin_get_wallet_transactions(uuid, text, text, int, int) to authenticated, service_role;
