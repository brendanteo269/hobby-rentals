-- What a member came here to do: rent gear, list their own, or both.
--
-- Two booleans rather than one enum, because "both" is the common case and an
-- enum would need a third value that means "the other two at once" — which
-- then has to be unpacked at every read site.

alter table public.profiles
  add column wants_to_rent boolean not null default false,
  add column wants_to_own boolean not null default false,
  -- Null until the member has answered. Distinguishes "has not chosen yet"
  -- from "chose nothing", which the booleans alone cannot express.
  add column onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'When the member completed first-run setup. Null means not yet asked.';
