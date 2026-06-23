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
cp .env.example .env   # optional until Phase 5 — app runs without it
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
