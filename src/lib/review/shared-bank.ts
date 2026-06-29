// Lazily-built, process-wide retrieval bank derived from static content
// (lessons + curated practice bank). Useful where several surfaces need the same
// bank without each rebuilding it.

import { loadAllLessons, loadPracticeBank } from '../content/schema-loader'
import { buildRetrievalBank, type RetrievalBank } from './retrieval-bank'

let cached: RetrievalBank | null = null

export function getRetrievalBank(): RetrievalBank {
  if (!cached) {
    cached = buildRetrievalBank(loadAllLessons(), loadPracticeBank().items)
  }
  return cached
}

/**
 * The distinct prompt texts of every existing item indexed under any of `tags`.
 * Used to steer AI generation away from reproducing problems we already have.
 */
export function existingPromptsForTags(tags: string[]): string[] {
  const bank = getRetrievalBank()
  const prompts = new Set<string>()
  for (const tag of tags) {
    for (const item of bank.get(tag) ?? []) prompts.add(item.prompt)
  }
  return [...prompts]
}
