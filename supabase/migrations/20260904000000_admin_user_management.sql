-- Admin user management: elevated roles, user lookup, and an audit trail.
--
-- Two problems shape this file.
--
-- First, the data an administrator needs — email, and whether that email was
-- ever confirmed — lives in auth.users, which belongs to Supabase Auth and is
-- not exposed to clients at all. Row Level Security cannot help here because
-- there is no policy to write: the table is simply unreachable. So reads go
-- through SECURITY DEFINER functions that check the caller is an admin and
-- then join auth.users to our own profiles table.
--
-- Second, those functions are the only thing standing between an ordinary
-- signed-in member and every account on the platform. Each one therefore
-- re-checks authorisation itself rather than trusting the caller to have done
-- it. The application checks too, but the database does not depend on that.
--
-- As elsewhere in this schema, nothing here copies data that auth.users
-- already owns. Verification state is read live, never mirrored.

-- Roles -------------------------------------------------------------------
-- An enum rather than free text so a typo ('admn') is a migration error
-- instead of a silently powerless — or worse, silently powerful — row.

create type public.app_role as enum ('admin');

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  -- Null when the grant came from a migration or the SQL editor rather than
  -- from another administrator.
  granted_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role)
);

comment on table public.user_roles is
  'Elevated platform roles. Marketplace participation (renting, owning) is not a role — see profiles.';

alter table public.user_roles enable row level security;

-- Deliberately no insert, update or delete policy. Granting admin is a
-- privileged act performed out of band (SQL editor or a migration), never by
-- application code — otherwise a single flaw in the admin portal escalates
-- into permanent, self-granted access.

create policy "Users can read their own roles"
  on public.user_roles for select
  to authenticated
  using ((select auth.uid()) = user_id);

/**
 * Whether a user holds the admin role. Defaults to the calling user.
 *
 * SECURITY DEFINER because the policies below and the functions further down
 * need to answer this about *other* users, which the select policy above
 * deliberately does not allow. Declaring it STABLE lets the planner call it
 * once per statement rather than once per row.
 */
create function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = uid
      and role = 'admin'
  );
$$;

comment on function public.is_admin is
  'True when the given user (default: the caller) holds the admin role.';

-- Administrators can read every profile. Without this, the audit trail below
-- cannot show who performed an action: the profiles policy from the first
-- migration confines each member to their own row.
create policy "Admins can read every profile"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Audit trail -------------------------------------------------------------

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  -- Kept when the actor's account is later removed, so the record of what was
  -- done does not disappear along with the person who did it.
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Append-only record of administrator actions. Written only by record_admin_action().';

create index admin_audit_log_target_idx
  on public.admin_audit_log (target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "Admins can read the audit log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

-- No insert policy: entries are written only through the function below, so
-- the actor cannot be forged. No update or delete policy at all — an audit
-- trail that the audited party can edit is not an audit trail.

/**
 * Records an administrator action.
 *
 * The actor is taken from the session, never from an argument, so a caller
 * cannot attribute their own action to somebody else.
 */
create function public.record_admin_action(
  action text,
  target_user_id uuid,
  detail jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  entry_id bigint;
begin
  if not public.is_admin(actor) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_user_id, detail)
  values (actor, action, target_user_id, coalesce(detail, '{}'::jsonb))
  returning id into entry_id;

  return entry_id;
end;
$$;

-- User lookup -------------------------------------------------------------
-- Both functions below return the same shape. auth.users is the source of
-- truth for identity and verification; profiles supplies what the application
-- knows about the member.

/**
 * Searches accounts by display name, email address, or account id.
 *
 * Matching uses strpos rather than LIKE so that '%' and '_' typed into the
 * search box are matched literally instead of behaving as wildcards, which
 * would otherwise let a stray character list every account on the platform.
 *
 * total_count is the size of the full result set, carried on every row so the
 * caller can paginate without a second round trip.
 */
create function public.admin_search_users(
  search text default '',
  result_limit int default 25,
  result_offset int default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  banned_until timestamptz,
  wants_to_rent boolean,
  wants_to_own boolean,
  onboarded_at timestamptz,
  roles public.app_role[],
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  needle text := lower(trim(coalesce(search, '')));
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  return query
    select
      u.id,
      u.email::text,
      p.display_name,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at,
      u.banned_until,
      coalesce(p.wants_to_rent, false),
      coalesce(p.wants_to_own, false),
      p.onboarded_at,
      coalesce(
        (select array_agg(r.role order by r.role) from public.user_roles r where r.user_id = u.id),
        '{}'::public.app_role[]
      ),
      count(*) over () as total_count
    from auth.users u
    left join public.profiles p on p.id = u.id
    where
      needle = ''
      or strpos(lower(coalesce(u.email::text, '')), needle) > 0
      or strpos(lower(coalesce(p.display_name, '')), needle) > 0
      or strpos(lower(u.id::text), needle) > 0
    order by u.created_at desc
    limit least(greatest(result_limit, 1), 100)
    offset greatest(result_offset, 0);
end;
$$;

/** One account by id. Same shape as the search, so callers share a type. */
create function public.admin_get_user(target_id uuid)
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  banned_until timestamptz,
  wants_to_rent boolean,
  wants_to_own boolean,
  onboarded_at timestamptz,
  roles public.app_role[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  return query
    select
      u.id,
      u.email::text,
      p.display_name,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at,
      u.banned_until,
      coalesce(p.wants_to_rent, false),
      coalesce(p.wants_to_own, false),
      p.onboarded_at,
      coalesce(
        (select array_agg(r.role order by r.role) from public.user_roles r where r.user_id = u.id),
        '{}'::public.app_role[]
      )
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = target_id;
end;
$$;

-- Execution rights ---------------------------------------------------------
-- A SECURITY DEFINER function is executable by PUBLIC unless told otherwise.
-- Each one guards itself, but revoking anonymous access as well means an
-- unauthenticated caller cannot even reach the guard.

revoke execute on function public.admin_search_users(text, int, int) from public, anon;
revoke execute on function public.admin_get_user(uuid) from public, anon;
revoke execute on function public.record_admin_action(text, uuid, jsonb) from public, anon;

grant execute on function public.admin_search_users(text, int, int) to authenticated;
grant execute on function public.admin_get_user(uuid) to authenticated;
grant execute on function public.record_admin_action(text, uuid, jsonb) to authenticated;
