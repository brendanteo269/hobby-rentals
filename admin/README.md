# HobbyRentals Admin

Internal admin portal. A second Next.js app in this repository, running on its
own port (3001) against the same Supabase project as the public site.

## Why it is a separate app

The public site and this portal have opposite defaults. The public site is
open and confines each member to their own row; the portal is closed and reads
across every account. Keeping them apart means no admin route, query, or
component can be reached from the member bundle by a routing mistake, and the
secret key this app needs never sits in the same process as the member site.

## Running it

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev                        # http://localhost:3001
```

Both apps at once, from the `is4108` folder above this repository:

```bash
npm run dev:all
```

## Setup

The portal needs one migration and one admin account.

**1. Apply the migration.** `supabase/migrations/20260904000000_admin_user_management.sql`
in the repository root adds the roles table, the audit log, and the lookup
functions. Apply it with the Supabase CLI, or paste it into the SQL editor.

**2. Grant yourself the role.** There is deliberately no way to do this from
the portal — a UI that can grant admin is a UI that can escalate. Run it
against the database directly:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com';
```

Without both steps the portal is reachable but empty: `is_admin()` does not
exist or returns false, and every route refuses. That is the intended failure
mode — it fails closed.

## How access is enforced

Three independent layers, because the data here is not protected by Row Level
Security. Email and verification state live in `auth.users`, which has no
policies to apply, so a single missed check would expose every account.

| Layer | Where | What it stops |
| ----- | ----- | ------------- |
| Proxy | `src/proxy.ts` | A non-admin before any page renders |
| `requireAdmin()` | Every page and action | One that reaches a route anyway |
| SQL functions | `admin_search_users`, `admin_get_user`, `record_admin_action` | One that reaches the database anyway |

The database layer is the one that matters. The two above it are convenience
and good manners; the functions themselves refuse a caller who is not an
administrator, so a bug in this app cannot turn into a data leak.

## The secret key

`SUPABASE_SECRET_KEY` bypasses Row Level Security entirely. It is read lazily
by `supabaseSecretKey()`, used by exactly one action — resetting a member's
verification, which is an Auth admin write with no user session to perform it
under — and must never be given a `NEXT_PUBLIC_` prefix. Everything else in
the portal reads through the caller's own session, so the ordinary path is
guarded by the database rather than trusted to this app.

## Audit trail

Administrator actions are written to `public.admin_audit_log` through
`record_admin_action()`, which stamps the actor from the session rather than
from an argument. The table has no insert, update, or delete policy: an audit
trail the audited party can edit is not an audit trail.
