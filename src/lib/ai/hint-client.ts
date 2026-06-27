// F6.3 — Client hint request layer.
//
// Feature-flagged and fail-soft: if AI is disabled, Supabase is unconfigured, or
// the edge function errors, this returns null and the caller falls back to the
// authored `feedback.incorrect[]` message. This preserves the works-with-AI-off
// invariant for the whole app.

import { isSupabaseConfigured, supabase } from '../supabase'
import { buildHintMessages } from './prompt-builder'
import type { HintContext } from './types'

/** Hints are off unless explicitly enabled AND Supabase is configured. */
export function aiHintsEnabled(): boolean {
  return (
    import.meta.env.VITE_AI_HINTS_ENABLED === 'true' && isSupabaseConfigured
  )
}

/**
 * Requests a grounded hint for the given context. Returns the hint string, or
 * null if hints are disabled/unavailable or the call fails (caller decides the
 * fallback). Never throws.
 */
export async function requestHint(
  context: HintContext,
): Promise<string | null> {
  if (!aiHintsEnabled() || !supabase) return null

  try {
    const messages = buildHintMessages(context)
    const { data, error } = await supabase.functions.invoke<{ hint?: string }>(
      'hint',
      { body: { messages } },
    )
    if (error) {
      console.error('hint request failed', error)
      return null
    }
    const hint = data?.hint?.trim()
    return hint && hint.length > 0 ? hint : null
  } catch (error) {
    console.error('hint request threw', error)
    return null
  }
}
