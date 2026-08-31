-- Profiles: application-owned data about a user.
--
-- Kept separate from auth.users because that table belongs to Supabase Auth
-- and is not safe to extend or expose. This one is ours, and is the table
-- future features (listings, bookings, payouts) will reference.
--
-- Deliberately does NOT store email. Auth already holds it, and a second copy
-- would silently go stale the first time somebody changes their address. Read
-- the email from the session instead.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application data for a user. One row per auth.users row, created by trigger.';

-- Row Level Security ------------------------------------------------------
-- The publishable key reaches this table from the browser, so RLS is what
-- stands between a user and everyone else's rows. Without these policies the
-- table is world-readable to anyone who can read the key from the page source.

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert policy: rows are created by the trigger below, never by clients.
-- No delete policy: deletion cascades from auth.users.

-- Profile creation --------------------------------------------------------
-- Runs as the function owner so it can write to a table the new user cannot
-- yet see. search_path is pinned to empty because a SECURITY DEFINER function
-- with a mutable search_path can be hijacked into running attacker-supplied
-- code, so every reference below is schema-qualified.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest ---------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
