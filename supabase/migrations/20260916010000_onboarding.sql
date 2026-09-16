-- S1-02: the onboarding record.
--
-- Two things the story asks for that the schema could not express: an owner's
-- own handover point, separate from where they collect as a renter, and the
-- guarantee that finishing onboarding leaves the member with a wallet.

-- Owner pickup location --------------------------------------------------
-- A member may hold both roles, and the two answers are genuinely different:
-- someone who lends a kayak from their block and collects camera gear near
-- their office needs to say so. Sharing one column forces them to pick.

alter table public.profiles
  add column default_pickup_location text;

comment on column public.profiles.default_pickup_location is
  'Where this member hands their own gear over as an owner. Distinct from '
  'preferred_meetup_location, which is where they collect as a renter.';

-- Wallet on completed onboarding -----------------------------------------
-- S1-02 AC2/AC3: completing onboarding creates a linked wallet with zero
-- balances. Before this the row appeared lazily, the first time the member
-- opened the Wallet tab or started a top-up (see get_wallet in the API's
-- wallet_service). That is fine for the wallet's own screens and wrong for
-- anything that joins on wallets expecting a row to be there.
--
-- A trigger rather than a call from the onboarding action, so the invariant
-- holds however the row was written — the admin portal, a backfill, a future
-- second client — and so onboarding does not start depending on the FastAPI
-- service being reachable.
--
-- Note public.wallets is owned by the API repo's migrations and merely created
-- idempotently here (see 20260905000000_admin_wallet_management.sql). This
-- trigger is therefore a cross-repo dependency: a change to that table's
-- columns has to account for this function.

create function public.create_wallet_on_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Zero balances come from the wallets table's own column defaults rather
  -- than being restated here, so there is one definition of "a new wallet".
  insert into public.wallets (user_id)
  values (new.id)
  -- A member who somehow already has a wallet — lazily created before this
  -- migration, most likely — keeps it, balances untouched.
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.create_wallet_on_onboarding is
  'Gives a member a zero-balance wallet the moment they finish onboarding.';

create trigger profiles_create_wallet_on_onboarding
  after update on public.profiles
  for each row
  -- Only the null -> set transition. Without this guard every later profile
  -- edit would re-run the insert, and a member who un-onboarded and returned
  -- would be handled by the conflict clause rather than by accident.
  when (old.onboarded_at is null and new.onboarded_at is not null)
  execute function public.create_wallet_on_onboarding();
