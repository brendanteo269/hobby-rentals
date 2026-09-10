-- US-02/US-03: a member's contact number, preferred meetup location and bio.
--
-- Collected during first-run onboarding alongside wants_to_rent/wants_to_own,
-- and editable afterwards from the profile's Account tab. Nullable because
-- members onboarded before this migration have none of the three yet.

alter table public.profiles
  add column contact_number text,
  add column preferred_meetup_location text,
  add column bio text;

comment on column public.profiles.contact_number is
  'Phone number shown to a counterparty once a booking is confirmed.';
comment on column public.profiles.preferred_meetup_location is
  'Where this member prefers to hand off gear, e.g. an MRT station or void deck.';
comment on column public.profiles.bio is
  'Short freeform description shown on the member''s profile.';
