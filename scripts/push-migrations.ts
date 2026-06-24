#!/usr/bin/env tsx
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const envPath = join(root, '.env')

function loadDotEnv(): Record<string, string> {
  if (!existsSync(envPath)) return {}
  const vars: Record<string, string> = {}
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return vars
}

const env = { ...loadDotEnv(), ...process.env }
const projectRef =
  env.SUPABASE_PROJECT_REF ??
  env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('Pushing Supabase migrations from supabase/migrations/')

if (env.SUPABASE_DB_URL) {
  console.log('Using SUPABASE_DB_URL')
  run('npx', [
    '--yes',
    'supabase',
    'db',
    'push',
    '--db-url',
    env.SUPABASE_DB_URL,
    '--yes',
  ])
  process.exit(0)
}

if (!env.SUPABASE_ACCESS_TOKEN) {
  console.error(`
Missing Supabase credentials.

Option A — Supabase MCP (recommended):
  1. Ensure .mcp.json exists in the project root
  2. In Cursor, authenticate the Supabase MCP server (OAuth in browser)
  3. Ask the agent to apply migrations via MCP

Option B — Supabase CLI:
  1. Run: npx supabase login
  2. Add to .env:
       SUPABASE_ACCESS_TOKEN=<from login>
       SUPABASE_DB_PASSWORD=<database password from dashboard>
  3. Run: npm run db:push

Option C — Direct database URL:
  Add to .env:
    SUPABASE_DB_URL=<Transaction pooler URI from Supabase Connect tab>
  Then run: npm run db:push
`)
  process.exit(1)
}

if (!projectRef) {
  console.error('Could not determine project ref from VITE_SUPABASE_URL.')
  process.exit(1)
}

const linkArgs = [
  '--yes',
  'supabase',
  'link',
  '--project-ref',
  projectRef,
  '--yes',
]

if (env.SUPABASE_DB_PASSWORD) {
  linkArgs.push('--password', env.SUPABASE_DB_PASSWORD)
}

console.log(`Linking project ${projectRef}`)
run('npx', linkArgs)

run('npx', ['--yes', 'supabase', 'db', 'push', '--linked', '--yes'])
console.log('Migrations pushed successfully.')
