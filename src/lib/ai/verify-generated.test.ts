import { describe, expect, it } from 'vitest'

import type { QuizItem } from '@content/schemas'
import type { Validator } from '@content/schemas/validators'
import type { WidgetKind } from '@content/schemas/widgets'

import { verifyAll, verifyCandidate, type GeneratedCandidate } from './verify-generated'

function item(accept: string[]): QuizItem {
  return {
    id: 'g1',
    prompt: 'p',
    widget: { kind: 'fill_blank', props: {} },
    validator: { type: 'expression', engine: 'mathjs', accept },
    feedback: { correct: 'ok', incorrect: [{ match: '*', message: 'no' }] },
  }
}

function customItem(opts: {
  prompt?: string
  widget?: WidgetKind
  validator?: Validator
}): QuizItem {
  return {
    id: 'g1',
    prompt: opts.prompt ?? 'p',
    widget: { kind: opts.widget ?? 'fill_blank', props: {} },
    validator:
      opts.validator ?? { type: 'expression', engine: 'mathjs', accept: ['7'] },
    feedback: { correct: 'ok', incorrect: [{ match: '*', message: 'no' }] },
  }
}

const good: GeneratedCandidate = {
  tag: 'supremum',
  item: item(['7']),
  selfTestAnswer: '7',
}

describe('verifyCandidate', () => {
  it('passes an item whose validator accepts its known answer', () => {
    const verified = verifyCandidate(good)
    expect(verified).not.toBeNull()
    expect(verified?.tag).toBe('supremum')
  })

  it('rejects when the validator does NOT accept the self-test answer', () => {
    expect(verifyCandidate({ ...good, selfTestAnswer: '8' })).toBeNull()
  })

  it('rejects items without a validator', () => {
    const broken = { ...good.item, validator: undefined } as QuizItem
    expect(verifyCandidate({ ...good, item: broken })).toBeNull()
  })

  it('rejects an empty self-test answer', () => {
    expect(verifyCandidate({ ...good, selfTestAnswer: '   ' })).toBeNull()
  })

  it('rejects when a provided claimed answer does not validate', () => {
    expect(
      verifyCandidate({ ...good, claimedAnswer: '99' }),
    ).toBeNull()
  })

  it('verifyAll drops every unverifiable candidate', () => {
    const result = verifyAll([
      good,
      { ...good, selfTestAnswer: '8' },
      { ...good, item: item(['7']), selfTestAnswer: '7' },
    ])
    expect(result).toHaveLength(2)
  })
})

describe('widget ↔ validator compatibility', () => {
  it('accepts a numeric expression validator on a fill_blank', () => {
    const candidate: GeneratedCandidate = {
      tag: 'supremum',
      selfTestAnswer: '7',
      item: customItem({ prompt: 'What is $\\sup A$?', widget: 'fill_blank' }),
    }
    expect(verifyCandidate(candidate)).not.toBeNull()
  })

  it('accepts a numeric expression validator on a rational_input', () => {
    const candidate: GeneratedCandidate = {
      tag: 'density',
      selfTestAnswer: '7',
      item: customItem({ prompt: 'Compute the value.', widget: 'rational_input' }),
    }
    expect(verifyCandidate(candidate)).not.toBeNull()
  })

  it('accepts an interval validator on a fill_blank', () => {
    const candidate: GeneratedCandidate = {
      tag: 'density',
      selfTestAnswer: '1',
      item: customItem({
        prompt: 'Give a rational strictly between $0$ and $2$.',
        widget: 'fill_blank',
        validator: { type: 'interval', engine: 'mathjs', accept: ['0', '2'] },
      }),
    }
    expect(verifyCandidate(candidate)).not.toBeNull()
  })

  it('rejects an expression validator on a multiple_choice widget', () => {
    const candidate: GeneratedCandidate = {
      tag: 'supremum',
      selfTestAnswer: '7',
      item: customItem({
        prompt: 'Pick the supremum.',
        widget: 'multiple_choice',
      }),
    }
    expect(verifyCandidate(candidate)).toBeNull()
  })

  it.each<WidgetKind>([
    'multiple_choice',
    'spot_the_flaw',
    'justify_step',
    'drag_order',
    'slider',
    'number_line',
    'fraction_line',
  ])('rejects a numeric validator on the %s widget', (widget) => {
    const candidate: GeneratedCandidate = {
      tag: 'supremum',
      selfTestAnswer: '7',
      item: customItem({ prompt: 'Compute the value.', widget }),
    }
    expect(verifyCandidate(candidate)).toBeNull()
  })

  it('accepts a set_match validator on a fill_blank', () => {
    const candidate: GeneratedCandidate = {
      tag: 'definition',
      selfTestAnswer: 'closed',
      item: customItem({
        prompt: 'Name the property.',
        widget: 'fill_blank',
        validator: { type: 'set_match', engine: 'mathjs', accept: ['closed'] },
      }),
    }
    expect(verifyCandidate(candidate)).not.toBeNull()
  })

  it('accepts a set_match validator on a multiple_choice widget', () => {
    const candidate: GeneratedCandidate = {
      tag: 'definition',
      selfTestAnswer: 'B',
      item: customItem({
        prompt: 'Choose the correct statement.',
        widget: 'multiple_choice',
        validator: { type: 'set_match', engine: 'mathjs', accept: ['B'] },
      }),
    }
    expect(verifyCandidate(candidate)).not.toBeNull()
  })
})

describe('yes/no-in-a-numeric-box heuristic', () => {
  const yesNoPrompts = [
    'Is $A$ bounded above?',
    'Are the rationals dense in $\\mathbb{R}$?',
    'Does the sequence converge?',
    'Do these sets intersect?',
    'Can a finite set be unbounded?',
    'Is it true that $A$ is closed?',
    'True or false: every Cauchy sequence converges.',
    'The set is open. T/F?',
    'Is the set compact? (yes/no)',
  ]

  it.each(yesNoPrompts)('rejects yes/no prompt on a numeric box: %s', (prompt) => {
    const candidate: GeneratedCandidate = {
      tag: 'supremum',
      selfTestAnswer: '7',
      item: customItem({ prompt, widget: 'fill_blank' }),
    }
    expect(verifyCandidate(candidate)).toBeNull()
  })

  const numericPrompts = [
    'What is $\\sup A$?',
    'How many limit points does $A$ have?',
    'Compute the Euclidean norm of $v$.',
    'Evaluate the limit of the sequence.',
    'Give a rational strictly between $0$ and $2$.',
  ]

  it.each(numericPrompts)('accepts a genuinely numeric prompt: %s', (prompt) => {
    const candidate: GeneratedCandidate = {
      tag: 'supremum',
      selfTestAnswer: '7',
      item: customItem({ prompt, widget: 'fill_blank' }),
    }
    expect(verifyCandidate(candidate)).not.toBeNull()
  })

  it('does not apply the heuristic to set_match items', () => {
    const candidate: GeneratedCandidate = {
      tag: 'definition',
      selfTestAnswer: 'yes',
      item: customItem({
        prompt: 'Is $A$ closed?',
        widget: 'multiple_choice',
        validator: { type: 'set_match', engine: 'mathjs', accept: ['yes'] },
      }),
    }
    expect(verifyCandidate(candidate)).not.toBeNull()
  })
})
