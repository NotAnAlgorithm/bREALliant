# End-to-end tests (Playwright)

These specs drive the real bREALliant UI in a browser against a **local Supabase
Docker stack**, so sign up / progress / streaks behave exactly like production.

## Prerequisites

1. **Docker** running.
2. A **local Supabase stack** started from the repo root:

   ```bash
   supabase start
   ```

3. The **database schema applied** (the migration in `supabase/migrations/`).
   `supabase start` applies migrations automatically; if you reset the DB, run:

   ```bash
   supabase db reset
   ```

4. Playwright's Chromium browser installed once:

   ```bash
   npx playwright install chromium
   ```

The stack is healthy when this returns `200`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:54321/auth/v1/health
```

## How to run

```bash
npm run e2e          # headless run, all specs
npm run e2e:ui       # interactive Playwright UI mode
npm run e2e:report   # open the HTML report from the last run
```

Playwright starts the app itself via `npm run dev:e2e`
(`vite --mode test --port 5174`) and waits for `http://localhost:5174`. Locally
it reuses an already-running server on that port; in CI it always starts a fresh
one.

## Environment (`.env.test`)

`npm run dev:e2e` runs Vite in `test` mode, which loads **`.env.test`** at the
repo root. That file points the app at the local stack:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local anon key>
```

`.env.test` is committed on purpose — it only contains the **public** local anon
key, never any production secret. Mode-specific env files take precedence over
`.env`, so this safely overrides the real project URL/key during tests.

### Getting the real local anon key

`.env.test` ships with the standard supabase-cli "demo" anon key, which matches a
default `supabase start`. If your machine uses a different one, grab it from:

```bash
supabase status        # copy the value labelled "anon key"
```

and replace `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.test`.

## What the specs cover

- **`smoke.spec.ts`** — the home/course-path page renders for a logged-out
  visitor (`Learn by doing` heading + `Sign in` link).
- **`auth-and-progress.spec.ts`** — full journey: sign up a unique user → open
  *Bounds and Suprema* → answer the problem step → finish the lesson → confirm it
  shows as *Completed* and that *The Least Upper Bound Property* becomes *Ready*.
- **`resume.spec.ts`** — progress persistence: advance a step, reload, and
  confirm the lesson rehydrates onto the same step.

Each run creates a **fresh, uniquely-named user** because the local DB persists
between runs.

> Note on content: lesson prerequisites are defined in `content/`. If
> *Bounds and Suprema* is gated behind prerequisites, opening it surfaces a
> "Skip the prerequisites?" dialog; the test helpers click **Continue anyway**,
> so the journey works whether the lesson is Ready or Locked.
