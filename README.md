This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Auth and local Supabase

This repo has no migrations of its own. **Every migration for the shared
Supabase project, including this app's (profiles, onboarding, login attempts,
admin), lives in `hobby-rentals-server/supabase/migrations`**, and so does the
`config.toml` that sets the auth behaviour below. Two directories pushing to one
database is how versions collided and how migrations got applied without the
CLI ever recording them. Add new migrations there with `supabase migration new`,
and run the local stack from that repo:

```bash
cd ../hobby-rentals-server
supabase start          # applies every migration and the auth config
```

Registration requires email confirmation (`[auth.email] enable_confirmations =
true` in that `config.toml`); with it off, `signUp()` returns a live session
immediately, no mail is sent, and the signup flow cannot be exercised at all.
**A deployed project is configured from the Supabase dashboard, not from that
file — the settings there have to be mirrored, or production behaves
differently from local.**

Confirmation mail is captured locally by Mailpit at <http://127.0.0.1:54324>;
nothing is delivered. A deployed project needs real SMTP configured, or no one
can complete registration.

Login is rate limited per account — five failed attempts inside fifteen
minutes locks the address for fifteen minutes. The policy lives in the
`login_attempts` migration (in the server repo) so the numbers cannot drift
from the counter that enforces them; `src/lib/login-attempts.ts` only
translates it for the form. This sits on top of Supabase's own per-IP limit,
which does not stop credential stuffing spread across many addresses.

## Checks

```bash
npm run lint
npm test          # unit tests for the validation rules and route policy
npm run typecheck
```

`npm run typecheck` currently reports pre-existing `typedRoutes` errors for
`/browse` and `/listings/new`; the generated route types predate those routes
and are refreshed by `next build`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
