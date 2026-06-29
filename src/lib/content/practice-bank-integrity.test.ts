import { describe, expect, it } from 'vitest'

import type { QuizItem } from '@content/schemas'
import type { WidgetKind } from '@content/schemas/widgets'

import { runValidator } from '../validators/run-validator'
import { isWidgetImplemented } from '../../widgets/widget-registry'
import { loadPracticeBank } from './schema-loader'

// The curated practice bank holds only graded, conceptual items (no discovery
// widgets), so every entry must be fully gradeable.
const GRADEABLE_KINDS: ReadonlySet<WidgetKind> = new Set<WidgetKind>([
  'fill_blank',
  'rational_input',
  'multiple_choice',
  'multiple_select',
  'drag_order',
  'spot_the_flaw',
  'justify_step',
])

/** Pull the `id` field out of an array-of-objects widget prop. */
function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) =>
    entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string'
      ? [(entry as { id: string }).id]
      : [],
  )
}

/**
 * Re-encode a justify_step solution the way the feedback engine reads it:
 * stepIds sorted lexicographically, each rendered "stepId:justId", comma-joined.
 */
function reencodeJustifyStep(map: Record<string, string>): string {
  return Object.keys(map)
    .sort()
    .map((stepId) => `${stepId}:${map[stepId]}`)
    .join(',')
}

const bank = loadPracticeBank()

describe('curated practice bank integrity', () => {
  it('loads at least one curated item', () => {
    expect(bank.items.length).toBeGreaterThan(0)
  })

  it('every item id is unique', () => {
    const ids = bank.items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const item of bank.items) {
    describe(item.id, () => {
      // A curated item has no lesson to fall back to, so it MUST declare its own
      // concept tags — that is what feeds it into the right retrieval pools.
      it('declares at least one concept tag', () => {
        expect(item.tags && item.tags.length > 0, 'curated item missing tags').toBe(true)
      })

      it('uses a graded, implemented widget', () => {
        expect(
          GRADEABLE_KINDS.has(item.widget.kind),
          `non-gradeable widget kind: ${item.widget.kind}`,
        ).toBe(true)
        expect(
          isWidgetImplemented(item.widget.kind),
          `unimplemented widget kind: ${item.widget.kind}`,
        ).toBe(true)
      })

      it('has a validator and feedback', () => {
        expect(item.validator, 'missing validator').toBeDefined()
        expect(item.feedback, 'missing feedback').toBeDefined()
      })

      it('declares difficulty on the 1–3 scale when present', () => {
        if (item.difficulty !== undefined) {
          expect(item.difficulty).toBeGreaterThanOrEqual(1)
          expect(item.difficulty).toBeLessThanOrEqual(3)
        }
      })

      it('keeps the catch-all (*) as the last feedback entry', () => {
        const incorrect = item.feedback?.incorrect ?? []
        const starIndex = incorrect.findIndex((f) => f.match === '*')
        expect(starIndex, 'no catch-all "*" feedback').toBeGreaterThanOrEqual(0)
        expect(starIndex).toBe(incorrect.length - 1)
      })

      it('canonical answer satisfies its own validator', () => {
        const validator = item.validator
        if (!validator) return
        for (const accepted of validator.accept) {
          expect(
            runValidator(validator, accepted),
            `accepted answer "${accepted}" does not validate`,
          ).toBe(true)
        }
      })

      it('accept values are consistent with the widget', () => {
        assertAcceptConsistency(item)
      })
    })
  }
})

function assertAcceptConsistency(item: QuizItem): void {
  const { widget, validator } = item
  if (!validator) return
  switch (widget.kind) {
    case 'multiple_choice': {
      const ids = new Set(idList(widget.props.choices))
      expect(ids.size).toBeGreaterThan(1)
      for (const accepted of validator.accept) {
        expect(ids.has(accepted), `choice "${accepted}" not offered`).toBe(true)
      }
      break
    }
    case 'multiple_select': {
      // accept is the sorted, comma-joined SUBSET of selected choice ids. Each
      // accepted id must be an offered choice, and the string must already be in
      // the canonical (sorted) encoding the feedback engine produces.
      const choiceIds = new Set(idList(widget.props.choices))
      expect(choiceIds.size).toBeGreaterThan(1)
      for (const accepted of validator.accept) {
        const selected = accepted.split(',')
        expect(selected.length).toBeGreaterThan(0)
        for (const id of selected) {
          expect(choiceIds.has(id), `choice "${id}" not offered`).toBe(true)
        }
        expect(new Set(selected).size, `duplicate id in "${accepted}"`).toBe(
          selected.length,
        )
        expect([...selected].sort().join(','), 'accept is not canonical (sorted)').toBe(
          accepted,
        )
      }
      break
    }
    case 'spot_the_flaw': {
      const ids = new Set(idList(widget.props.steps))
      expect(ids.size).toBeGreaterThan(1)
      for (const accepted of validator.accept) {
        expect(ids.has(accepted), `step "${accepted}" not present`).toBe(true)
      }
      break
    }
    case 'drag_order': {
      const itemIds = idList(widget.props.items)
      expect(itemIds.length).toBeGreaterThan(1)
      for (const accepted of validator.accept) {
        const order = accepted.split(',')
        expect([...order].sort()).toEqual([...itemIds].sort())
        expect(order.length).toBe(itemIds.length)
      }
      break
    }
    case 'justify_step': {
      const stepIds = idList(widget.props.steps)
      const justIds = new Set(idList(widget.props.justifications))
      for (const accepted of validator.accept) {
        const map: Record<string, string> = {}
        for (const pair of accepted.split(',')) {
          const [stepId, justId] = pair.split(':')
          expect(stepId && justId, `malformed pair "${pair}"`).toBeTruthy()
          expect(justIds.has(justId), `justification "${justId}" not offered`).toBe(true)
          map[stepId] = justId
        }
        expect([...Object.keys(map)].sort()).toEqual([...stepIds].sort())
        expect(reencodeJustifyStep(map)).toBe(accepted)
      }
      break
    }
    default:
      break
  }
}
