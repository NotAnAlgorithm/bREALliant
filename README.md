# bREALliant

A learn-by-doing web app for **real analysis** — interactive lessons, instant feedback, and a prerequisite-based course path. Content aligns with early chapters of Baby Rudin's *Principles of Mathematical Analysis*.

**Subject:** Real analysis (ℚ, ℝ, ℂ construction, LUB property, compactness, basic topology)

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (auth, progress, storage)
- KaTeX, math.js, Zod

See [`prd.md`](prd.md) for full MVP requirements.

## Setup

```bash
npm install
cp .env.example .env
```

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env`
3. Apply migrations (pick one):
   - **Cursor + Supabase MCP:** authenticate the Supabase MCP server (see `.mcp.json`), then ask the agent to push migrations
   - **CLI:** `npx supabase login`, add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` to `.env`, then `npm run db:push`
   - **Manual:** run each file in [`supabase/migrations/`](supabase/migrations/) in the Supabase SQL editor
4. Enable Email auth in Authentication → Providers

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest unit tests |
| `npm run validate-content` | Validate all lesson JSON against schema |
| `npm run lint` | ESLint |
| `npm run verify-supabase` | Check Supabase env connectivity |
| `npm run db:push` | Push `supabase/migrations/` to remote Supabase |

## Project layout

```
content/           # Lesson JSON (author-owned)
  fixtures/
  schemas/
src/
  components/      # UI, blocks, layout
  widgets/         # Interactive lesson widgets
  lib/             # Supabase, validators, unlock logic
  pages/           # Route pages
  services/        # Progress, streaks
supabase/
  migrations/      # Postgres schema + RLS
```

## Architecture

```
Content JSON → SchemaLoader → LessonRenderer → WidgetRegistry → FeedbackEngine
                                      ↓
                              ProgressService → Supabase
```

## License

Private / course project.
