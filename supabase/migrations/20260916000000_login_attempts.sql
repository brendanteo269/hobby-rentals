-- S1-01: per-account login rate limiting.
--
-- Supabase already limits sign-ins to 30 per 5 minutes per IP address. That
-- stops one machine hammering the login form, but not credential stuffing: a
-- botnet gives every guess a fresh IP, so thousands of attempts can land on one
-- account without any single address approaching the limit. Counting per
-- account is what closes that, and it is what the story's Notes ask for.
--
-- Keyed by the address as typed rather than by user id, because a login attempt
-- for an address that has no account must be counted too — otherwise the table
-- itself answers "does this account exist?".

create table public.login_attempts (
  -- Lower-cased by the functions below so "Alice@" and "alice@" share a row and
  -- cannot be used to buy twice the guesses.
  email text primary key,
  failed_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

comment on table public.login_attempts is
  'Failed sign-in counter, one row per email address. Written only by the '
  'security definer functions in this migration; see login_lockout_remaining.';

-- RLS with no policies at all: this table holds a signal about which addresses
-- are under attack, and nothing outside the functions below has any business
-- reading or writing it. The functions are SECURITY DEFINER and so bypass this.
alter table public.login_attempts enable row level security;

-- Policy ------------------------------------------------------------------
-- Five wrong passwords inside fifteen minutes locks the account for fifteen
-- minutes. Low enough to make sustained guessing pointless, high enough that a
-- member working through their own password manager is unlikely to trip it.

create function public.login_attempt_limit() returns integer
  language sql immutable set search_path = '' as $$ select 5 $$;

create function public.login_attempt_window() returns interval
  language sql immutable set search_path = '' as $$ select interval '15 minutes' $$;

-- Reads -------------------------------------------------------------------

/**
 * Seconds remaining on an address's lockout, or 0 when it may attempt a login.
 *
 * Returns 0 for an address with no row, which is the same answer an address in
 * good standing gets — so a caller learns nothing about whether an account
 * exists, only whether this address is currently being throttled.
 */
create function public.login_lockout_seconds(p_email text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_locked_until timestamptz;
begin
  select a.locked_until into v_locked_until
  from public.login_attempts a
  where a.email = lower(trim(p_email));

  -- No row, never locked, or the lock has lapsed — all answer "go ahead".
  if v_locked_until is null or v_locked_until <= now() then
    return 0;
  end if;

  return ceil(extract(epoch from (v_locked_until - now())))::integer;
end;
$$;

-- Writes ------------------------------------------------------------------

/**
 * Counts one failed sign-in, locking the address once the limit is reached
 * inside the window.
 *
 * A failure arriving after the window has lapsed starts a fresh window rather
 * than adding to a stale count, so occasional typos weeks apart never
 * accumulate into a lockout.
 */
create function public.record_failed_login(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  insert into public.login_attempts (email, failed_count, window_started_at)
  values (v_email, 1, now())
  on conflict (email) do update
    set
      -- Restart the count when the previous window has closed, otherwise add
      -- to it.
      failed_count = case
        when public.login_attempts.window_started_at < now() - public.login_attempt_window()
          then 1
        else public.login_attempts.failed_count + 1
      end,
      window_started_at = case
        when public.login_attempts.window_started_at < now() - public.login_attempt_window()
          then now()
        else public.login_attempts.window_started_at
      end,
      locked_until = case
        when public.login_attempts.window_started_at >= now() - public.login_attempt_window()
             and public.login_attempts.failed_count + 1 >= public.login_attempt_limit()
          then now() + public.login_attempt_window()
        else public.login_attempts.locked_until
      end;

  -- Opportunistic cleanup, so the table does not accumulate a row for every
  -- address anyone has ever mistyped. Bounded work on an already-writing path,
  -- which is cheaper than owning a scheduled job for one small table.
  delete from public.login_attempts
  where window_started_at < now() - interval '1 day'
    and (locked_until is null or locked_until < now());
end;
$$;

/**
 * Clears the counter after a successful sign-in.
 *
 * Takes no argument on purpose. The address comes from the caller's own token,
 * so this can only ever clear the lockout of whoever is holding the session
 * that just succeeded. An `(p_email text)` version would let any caller lift
 * the lock on any account by naming it, which would leave the limit above
 * enforcing nothing.
 */
create function public.clear_login_attempts()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.login_attempts
  where email = lower(trim((select auth.jwt() ->> 'email')));
$$;

-- Grants ------------------------------------------------------------------
-- Every other SECURITY DEFINER function in this schema revokes `anon`, because
-- every other one serves a signed-in member. The two read/count functions are
-- the exception by necessity: they run around the login attempt itself, before
-- any session exists. Neither returns anything that distinguishes a registered
-- address from an unregistered one.
--
-- Known trade-off: `record_failed_login` being reachable anonymously means an
-- attacker can lock an account they do not own by calling it five times. That
-- is inherent to account lockout — the same is achievable by submitting the
-- login form five times — so exposing the function grants no capability that
-- the form does not already. It is a denial-of-service risk accepted in
-- exchange for stopping credential stuffing. If that trade stops being
-- acceptable, the answer is a captcha in front of login
-- ([auth.captcha] in supabase/config.toml), not a narrower grant here.
--
-- `clear_login_attempts` is authenticated-only and reads the address from the
-- caller's token, so a lock can only be lifted by a successful sign-in.

revoke execute on function public.login_lockout_seconds(text) from public;
revoke execute on function public.record_failed_login(text) from public;
revoke execute on function public.clear_login_attempts() from public, anon;

grant execute on function public.login_lockout_seconds(text) to anon, authenticated;
grant execute on function public.record_failed_login(text) to anon, authenticated;
grant execute on function public.clear_login_attempts() to authenticated;
