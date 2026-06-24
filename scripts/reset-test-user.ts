#!/usr/bin/env tsx
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import type { Database } from '../src/lib/database.types'

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

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY

const TEST_USER_EMAIL = env.TEST_USER_EMAIL ?? 'tester@example.com'
const TEST_USER_PASSWORD = env.TEST_USER_PASSWORD ?? 'BrealTest!2026'

/** Tables cleared on reset. RLS scopes every delete to the signed-in user. */
const TABLES_TO_CLEAR = [
  'lesson_progress',
  'lesson_completions',
  'streaks',
] as const

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  fail(
    'Missing Supabase credentials. Ensure VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) are set in ' +
      '.env or the environment.',
  )
}

async function main(): Promise<void> {
  const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_KEY!)

  console.log(`Resetting test user against ${SUPABASE_URL}`)

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    })

  if (signInError || !signInData.user) {
    fail(
      `Sign-in failed: ${signInError?.message ?? 'no user returned'}. ` +
        'Run `npx tsx scripts/seed-test-user.ts` first to create the account.',
    )
  }

  const userId = signInData.user.id
  const cleared: Record<string, number> = {}

  for (const table of TABLES_TO_CLEAR) {
    const { count, error } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('user_id', userId)

    if (error) {
      fail(`Failed to clear ${table}: ${error.message}`)
    }

    cleared[table] = count ?? 0
  }

  console.log(`
========================================
 Test user reset ✔
========================================
 Email:   ${TEST_USER_EMAIL}
 User id: ${userId}
----------------------------------------
 Rows cleared:`)
  for (const table of TABLES_TO_CLEAR) {
    console.log(`   ${table.padEnd(20)} ${cleared[table]}`)
  }
  console.log(`========================================
 Profile and auth account were preserved — login still works.
`)

  process.exit(0)
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
