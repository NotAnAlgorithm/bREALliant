// F8.4 — Generated-item bank: optional, verifier-gated augmentation.
//
// Public contract: every item this module hands out has passed the F8.2 verifier
// (its validator provably accepts a known-correct answer). The deterministic
// template baseline is always available; LLM-proposed items are added only when
// generation is enabled and Supabase is configured, and they pass the same gate.
// With AI off, only the deterministic baseline is served — preserving the
// works-with-AI-off invariant.

import { isSupabaseConfigured, supabase } from '../supabase'
import {
  buildConceptGenerationPrompt,
  parseConceptCandidates,
} from './concept-generation'
import {
  buildGenerationPrompt,
  generateLocalCandidates,
  parseLlmCandidates,
} from './problem-templates'
import { verifyAll, type VerifiedItem } from './verify-generated'

export function aiGenerationEnabled(): boolean {
  return (
    import.meta.env.VITE_AI_GENERATION_ENABLED === 'true' &&
    isSupabaseConfigured
  )
}

/** Always-available, deterministic, verified items for a concept. */
export function localGeneratedItems(
  tag: string,
  count = 3,
  seed = 1,
): VerifiedItem[] {
  return verifyAll(generateLocalCandidates(tag, count, seed))
}

/**
 * LLM-proposed, math.js-verified items. Fail-soft: returns [] when generation is
 * disabled/unavailable or the call fails. Never throws.
 */
export async function fetchGeneratedItems(
  tag: string,
  count = 3,
): Promise<VerifiedItem[]> {
  if (!aiGenerationEnabled() || !supabase) return []

  try {
    const messages = buildGenerationPrompt({ tag, count })
    const { data, error } = await supabase.functions.invoke<{ raw?: unknown }>(
      'generate-problems',
      { body: { messages } },
    )
    if (error || !data?.raw) return []
    return verifyAll(parseLlmCandidates(data.raw, tag))
  } catch (err) {
    console.error('generate-problems failed', err)
    return []
  }
}

/**
 * Stage 6 (beta) — LLM-proposed CONCEPTUAL items for one or more concept tags,
 * aligned with the curated bank (choice-style widgets graded by `set_match`,
 * 1-3 difficulty, Socratic feedback). Same verifier-first guarantees as the
 * numeric path: untrusted output is structurally gated, canonically encoded, and
 * must pass `verifyCandidate` before it is returned. Fail-soft: returns [] when
 * generation is disabled/unavailable or the call fails, and never throws.
 *
 * These items are a sandboxed beta surface and DO NOT feed the mastery signal —
 * callers must render them through a runner that never records reviews.
 */
export async function fetchGeneratedConceptItems(
  tags: string[],
  count = 3,
  masteryHint?: string,
  avoidPrompts: string[] = [],
): Promise<VerifiedItem[]> {
  if (!aiGenerationEnabled() || !supabase || tags.length === 0) return []

  try {
    const messages = buildConceptGenerationPrompt({ tags, count, masteryHint, avoidPrompts })
    const { data, error } = await supabase.functions.invoke<{ raw?: unknown }>(
      'generate-problems',
      { body: { messages } },
    )
    if (error || !data?.raw) return []
    // Filter out anything that merely restates an existing bank problem.
    return verifyAll(parseConceptCandidates(data.raw, tags, avoidPrompts))
  } catch (err) {
    console.error('generate-problems (concept) failed', err)
    return []
  }
}

/**
 * Unified entry point for future review/interleaving surfaces (F2/F3): the
 * verified deterministic baseline, augmented with verified LLM items when
 * enabled.
 */
export async function getGeneratedItems(
  tag: string,
  count = 3,
  seed = 1,
): Promise<VerifiedItem[]> {
  const baseline = localGeneratedItems(tag, count, seed)
  const augmented = await fetchGeneratedItems(tag, count)
  return [...baseline, ...augmented]
}
