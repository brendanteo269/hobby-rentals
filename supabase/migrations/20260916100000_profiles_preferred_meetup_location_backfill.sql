-- Backfill: preferred_meetup_location went missing from the deployed
-- database despite being defined in 20260909000000_profile_contact_details.sql.
-- contact_number and bio from that same migration, plus
-- default_pickup_location from 20260916010000_onboarding.sql, are already
-- present remotely - only this one column never landed, which is why
-- getOwnProfile's select started failing with "column profiles.
-- preferred_meetup_location does not exist".
--
-- "if not exists" rather than assuming a clean slate, since this project's
-- migration history is already known to be out of sync with what is actually
-- deployed.

alter table public.profiles
  add column if not exists preferred_meetup_location text;

comment on column public.profiles.preferred_meetup_location is
  'Where this member prefers to hand off gear, e.g. an MRT station or void deck.';
