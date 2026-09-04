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

**1. Apply the migration.** `supabase/migrations/20260904000000_admin_user_management.sql`
in the repository root adds the roles table, the audit log, and the lookup
functions. Apply it with the Supabase CLI, or paste it into the SQL editor.

**2. Fill in `SUPABASE_SECRET_KEY`.** Every account lookup uses it — see below.

There is no admin account to create. Entry is the shared password.

## How access works

> **This is a proof-of-concept gate, not production authentication.**

One password opens the whole portal, defaulting to `password` when
`ADMIN_PORTAL_PASSWORD` is unset. What that trades away, stated plainly:

- **It identifies nobody.** The audit trail records that an action was taken
  through the portal, not who took it. Entries read "Shared admin session".
- **It cannot be revoked for one person**, only changed for everyone.
- **It does not expire**, beyond the eight-hour session cookie.
- **The default lives in this repository**, so an unset variable in a deployed
  environment is an open door rather than a locked one.

The password is never sent to the browser. The session cookie holds a SHA-256
digest of it rather than the password itself, is `httpOnly`, and is compared
in constant time — so it cannot be forged by inventing a cookie, and changing
the password invalidates every session issued under the old one.

Two layers enforce it: `src/proxy.ts` before any page renders, and
`requirePortalSession()` in every page and server action, so a change to the
proxy matcher cannot silently open a route.

### Restoring per-administrator sign-in

The pieces are still in place. `user_roles`, `is_admin()`, and the
`authenticated` grants remain in the migration, and every SQL function accepts
either an administrator session or the secret key. Returning to real accounts
is a change to this app — swap `requirePortalSession()` for a role check and
read through the caller's session — not to the schema.

## The secret key

`SUPABASE_SECRET_KEY` bypasses Row Level Security entirely and is **required**.
With no per-administrator session, there is no identity for the database to
check, so lookups are made with this key and the portal password is what
stands in front of them. It must never be given a `NEXT_PUBLIC_` prefix.

The one exception is resending a member's confirmation email, which goes
through `createAnonClient()` on the publishable key — that is a public
endpoint, and using the secret key would send the member a different email
from the one they got at signup.

## Audit trail

Administrator actions are written to `public.admin_audit_log` through
`record_admin_action()`. The table has no insert, update, or delete policy: an
audit trail the audited party can edit is not an audit trail. `actor_id` is
null while the shared password is in use, and `actor_label` carries what can
honestly be said instead.
