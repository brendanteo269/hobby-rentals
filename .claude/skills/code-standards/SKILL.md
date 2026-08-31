---
name: code-standards
description: The HobbyRentals engineering standard for documentation, reuse, abstraction and component design. Use this whenever writing, reviewing, refactoring or extending code in the hobby-rentals or hobby-rentals-server repos — including "add a page", "build this component", "wire up this endpoint", "clean this up", "review my code", "is this well structured", or any request that produces more than a trivial edit. Also use it before opening a PR, and when a change starts repeating markup, class strings, literals or data shapes that already exist elsewhere. Apply it by default rather than waiting to be asked; the point is that code written today matches code written last week.
---

# HobbyRentals code standards

The goal is a codebase where a new file looks like it was written by whoever wrote
the last one. Consistency compounds: it makes review fast, makes bugs obvious, and
makes it safe to change shared code because you can see every caller.

Two failure modes are equally bad. **Duplication** means a decision lives in five
places and four of them go stale. **Premature abstraction** means a wrapper that
serves one caller, hides what is happening, and has to be unwound before anything
can change. Most of this document is about telling those apart.

## 1. Documentation

Write comments that explain **why**, and let the code say **what**. A comment that
restates the line below it goes stale silently and teaches the reader to skip
comments — which is how the important ones get missed.

Document these:

- **Every exported symbol** gets a one-or-two-line doc comment covering its purpose
  and any constraint a caller could not guess. Non-exported helpers usually need
  nothing; their name and their single call site are the documentation.
- **Non-obvious constraints and ordering.** If code must run in a particular order,
  or a value must not be logged, or a workaround exists for a specific upstream
  bug, say so and say what breaks otherwise. This is the highest-value comment
  type in any codebase.
- **Deliberate omissions.** An empty catch block, a swallowed error, a missing
  await — if it is intentional, the comment is what separates it from a bug.
- **Files whose purpose is not obvious from the path.**

Delete on sight: comments that restate code, commented-out code (git remembers),
and `TODO` without a name or an issue reference.

Prefer making the code self-documenting first. A well-named function needs no
comment; a comment is what you write when naming alone cannot carry the meaning.

## 2. Reuse

The threshold is the **rule of three** — write it twice, extract on the third —
with one important exception.

Extract on the **second** occurrence when the duplicated thing encodes a *decision*
rather than a *shape*: a colour, a route path, a price, a validation rule, a
copy string, an env var name. Divergence in a decision is a bug, not an
inconsistency. Divergence in a shape is usually fine and often desirable.

Concretely, in this codebase:

- **Repeated Tailwind class strings are duplication.** Four inputs sharing a long
  `className` means the input styling is a decision living in four places. Extract
  a component. Do not extract a one-off `className` used once.
- **Route paths belong in one place.** A string like `/check-email` written in a
  server action and again in a page is two chances to typo and no compiler help.
- **Env var access belongs in one place** that fails loudly when a value is
  missing, rather than `process.env.X!` scattered around, which turns a missing
  variable into a confusing runtime error far from the cause.
- **Data that will come from the database later** belongs in a module now, not
  inline in a page — so swapping the source touches one file.

## 3. Abstraction

Abstract at the altitude the domain talks at. `<ListingCard listing={x} />` is the
right level; `<GenericCard slots={...} />` is not, because it makes the caller
reassemble the meaning every time.

Signals you have abstracted too early or too hard:

- The abstraction has exactly one caller and no concrete second use in sight.
- It takes more than about four props, or several booleans that select between
  layouts. Booleans that flip structure usually mean two components wearing a
  trenchcoat — prefer composition (`children`, slots) over configuration.
- A reader has to open the abstraction to understand the call site.
- It exists to deduplicate code that is only *incidentally* similar — two things
  that look alike today but answer to different requirements. Coupling them means
  the next change to one has to be fought past the other.

When in doubt, **colocate until a second consumer appears**, then lift. Moving code
up is easy and mechanical; untangling a wrong abstraction is neither.

## 4. Components (Next.js App Router)

- **Server Components by default.** Reach for `"use client"` only where you need
  state, effects or event handlers, and push it to the leaf that actually needs
  it, so interactivity does not drag a whole subtree onto the client.
- **Presentational primitives** (buttons, inputs, layout) live in
  `src/components/ui.tsx` or `src/components/ui/`. They know nothing about the
  domain and take no data-fetching responsibility.
- **Feature components** own domain meaning and may fetch. Keep them out of `ui`.
- **Sections of a long page** belong in their own components once the page stops
  fitting on a screen or two. A page file should read as an outline of the page.
- **Type props precisely.** Derive from existing types rather than restating them,
  and never reach for `any` to make an error disappear.
- **Forms** use Server Actions with `useActionState` and render errors from the
  returned state — so validation lives in one place and works without JS.

## 5. Backend (FastAPI)

Applies once `hobby-rentals-server` has code.

- **Routers by resource**, thin. A route handler validates input, calls a service
  function, and shapes the response — business logic lives in the service so it
  can be tested and reused without HTTP.
- **Pydantic models are the contract.** Separate request and response models;
  never return an ORM or database row straight to the client, so internal fields
  cannot leak by accident.
- **Dependencies for cross-cutting concerns** (auth, database session) via
  `Depends`, defined once and shared.
- **Type hints on every function**, because they are the documentation that cannot
  go stale.

## 6. Security and configuration

- The Supabase **publishable** key is public and belongs in `NEXT_PUBLIC_*`. The
  **secret** key bypasses Row Level Security and must never appear in client
  code, in a `NEXT_PUBLIC_*` variable, or in the repository.
- Every table reachable with the publishable key has RLS enabled and a policy.
  RLS off is the default failure mode of a Supabase project — assume it is off
  until verified.
- Never log tokens, passwords or full user records.

## 7. Reviewing against this standard

When asked to review, or before finishing a substantial change, work through the
codebase and report findings in this shape:

```
| # | Severity | Location | Finding | Fix |
```

Severity is `high` (a correctness, security or divergence risk), `medium` (real
duplication or a missing abstraction that will bite), or `low` (polish).

Rules that keep a review useful:

- **Report only what you verified by reading the code**, with a real
  `file.ts:line`. A plausible-sounding finding that turns out not to exist costs
  more trust than a missed one.
- **Say what breaks.** "Extract this" is an opinion; "this colour is defined in
  three files, so a rebrand will miss one" is a reason.
- **Do not invent work.** If a file is fine, say it is fine. Churn that only
  moves code between files is a cost with no benefit, and it makes real findings
  harder to see.
- **Order by severity**, and keep the list short enough to act on.

After reporting, apply the fixes you were asked to apply, then verify: typecheck,
lint, and build must all pass, and behaviour must be unchanged unless changing it
was the point.
