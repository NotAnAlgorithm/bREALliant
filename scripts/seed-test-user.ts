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
const TEST_USER_USERNAME = env.TEST_USER_USERNAME ?? 'tester'
const TEST_USER_PASSWORD = env.TEST_USER_PASSWORD ?? 'BrealTest!2026'

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

/** True for the "user already registered" family of signUp errors. */
function isAlreadyRegistered(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user already')
  )
}

/** True for a Postgres duplicate-key conflict. */
function isDuplicate(code: string | null, message: string): boolean {
  return code === '23505' || message.toLowerCase().includes('duplicate')
}

async function main(): Promise<void> {
  const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_KEY!)

  console.log(`Seeding test user against ${SUPABASE_URL}`)

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    options: { data: { username: TEST_USER_USERNAME } },
  })

  let userId = signUpData.user?.id ?? null

  if (signUpError) {
    if (!isAlreadyRegistered(signUpError.message)) {
      fail(`Sign-up failed: ${signUpError.message}`)
    }

    console.log('User already exists — signing in to fetch the session.')
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      })

    if (signInError) {
      fail(
        `User exists but sign-in failed: ${signInError.message}. ` +
          'The stored password may differ from TEST_USER_PASSWORD.',
      )
    }

    userId = signInData.user?.id ?? null
  }

  if (!userId) {
    fail('Could not obtain a user id from sign-up or sign-in.')
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId!,
      username: TEST_USER_USERNAME,
      email: TEST_USER_EMAIL,
    },
    { onConflict: 'id' },
  )

  if (profileError && !isDuplicate(profileError.code, profileError.message)) {
    fail(`Failed to create profile row: ${profileError.message}`)
  }

  console.log(`
========================================
 Test user ready ✔
========================================
 Email:    ${TEST_USER_EMAIL}
 Username: ${TEST_USER_USERNAME}
 Password: ${TEST_USER_PASSWORD}
 User id:  ${userId}
========================================
 Log in to the live site with the email/password above.
`)

  process.exit(0)
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
