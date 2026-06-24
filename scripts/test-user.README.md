# Cloud test user scripts

Two helper scripts to manage a reusable **test user** on the **live cloud
Supabase project** for bREALliant. A human can log into the deployed website
with a known account, then "refresh" (reset) its learning progress between
manual testing sessions — without deleting the account.

Both scripts target the **real cloud project** defined by `VITE_SUPABASE_URL`
in your `.env`. There is no local/offline mode here.

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/seed-test-user.ts` | Ensure the test user account + profile exist. |
| `scripts/reset-test-user.ts` | Wipe the user's learning progress, keep the account. |

## Environment variables

Loaded from `process.env` first, then from the project root `.env`
(using the same lightweight parser as `scripts/push-migrations.ts`).

**Required** (already present in `.env`):

- `VITE_SUPABASE_URL` — the cloud project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable/anon key
  (falls back to `VITE_SUPABASE_ANON_KEY`).

**Test user credentials** (optional, with defaults):

| Variable | Script default | This project's `.env` |
| --- | --- | --- |
| `TEST_USER_EMAIL` | `tester@example.com` | `tester@example.com` |
| `TEST_USER_USERNAME` | `tester` | `admin` |
| `TEST_USER_PASSWORD` | `BrealTest!2026` | `BrealTest!2026` |

> The project `.env` sets `TEST_USER_USERNAME=admin`. Keep these set so a
> repeated `seed` does not overwrite the profile username back to the script
> default.

If either Supabase env var is missing, the scripts print a clear error and
exit non-zero.

## Usage

Run **seed once** to create the account:

```bash
npm run test-user:seed      # or: npx tsx scripts/seed-test-user.ts
```

It signs up the user (email confirmation is OFF, so a session is returned
immediately). If the user already exists, it signs in instead, then upserts the
`profiles` row. On success it prints the email, username, password, and user id
so you know how to log into the live site.

Then **reset** any time you want a clean slate:

```bash
npm run test-user:reset     # or: npx tsx scripts/reset-test-user.ts
```

It signs in as the test user and deletes that user's own rows from
`lesson_progress`, `lesson_completions`, and `streaks`, reporting how many rows
were cleared per table.

> **Run seed before reset.** If the account does not exist yet, `reset` fails
> sign-in and tells you to run `seed-test-user.ts` first.

## What reset does and does NOT remove

- **Removes:** the user's rows in `lesson_progress`, `lesson_completions`, and
  `streaks`.
- **Keeps:** the `profiles` row and the Supabase auth account, so the same
  email/password keep working for login.

## Caveats

- Deletes rely on **Row Level Security**: the scripts authenticate as the test
  user and RLS scopes every write/delete to that user's own rows. They use the
  publishable/anon key only — no service-role key is required or used.
- These scripts act on the **live cloud project**. Use a dedicated throwaway
  test account (the defaults above), not a real user's account.
