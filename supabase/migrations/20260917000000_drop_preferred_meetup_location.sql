-- Drops the renter's preferred meetup location.
--
-- The column asked a renter, once at signup, where they would collect gear —
-- before they had a booking, an owner, or an item in mind. Collection is
-- agreed per booking between the two parties, so the answer was never read by
-- anything that arranges a handover, and a stale one is worse than none.
-- default_pickup_location stays: an owner's handover point is a genuine
-- standing default, because it is a property of where their gear lives.
--
-- Data loss is intended and accepted. The values were only ever displayed back
-- to the member who typed them, so nothing downstream loses a reference.

alter table public.profiles
  drop column preferred_meetup_location;

-- The surviving column's comment defined itself against the one just dropped.
comment on column public.profiles.default_pickup_location is
  'Where this member hands their own gear over as an owner. Null for a '
  'member who does not own. Renters are not asked for a location: where a '
  'booking is collected is agreed per booking.';
