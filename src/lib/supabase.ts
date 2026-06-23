import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL

/** Supports new publishable keys (`sb_publishable_…`) and legacy anon keys. */
const apiKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && apiKey)

/** Null when env vars are missing — app runs in local-only mode. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, apiKey!)
  : null
