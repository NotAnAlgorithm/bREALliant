import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

function loadDotEnv(): Record<string, string> {
  const envPath = join(fileURLToPath(new URL('.', import.meta.url)), '..', '.env')
  if (!existsSync(envPath)) {
    return {}
  }
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
const url = env.VITE_SUPABASE_URL
const apiKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY

if (!url || !apiKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env')
  process.exit(1)
}

const client = createClient(url, apiKey)

const { data, error } = await client.auth.getSession()

if (error) {
  console.error('Supabase connection failed:', error.message)
  process.exit(1)
}

console.log('Supabase connected successfully.')
console.log(`  URL: ${url}`)
console.log(`  Auth reachable: yes (session ${data.session ? 'active' : 'none — expected before login'})`)
