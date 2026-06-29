import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCourseProgress } from '../../hooks/useCourseProgress'
import {
  aiGenerationEnabled,
  fetchGeneratedConceptItems,
} from '../../lib/ai/generated-bank'
import { GeneratedPracticeBeta } from './GeneratedPracticeBeta'

vi.mock('../../hooks/useCourseProgress')
vi.mock('../../lib/ai/generated-bank', () => ({
  aiGenerationEnabled: vi.fn(),
  fetchGeneratedConceptItems: vi.fn(),
}))

const mockedEnabled = vi.mocked(aiGenerationEnabled)
const mockedFetch = vi.mocked(fetchGeneratedConceptItems)
const mockedProgress = vi.mocked(useCourseProgress)

const sampleItem = {
  id: 'gen-1',
  prompt: 'Is $\\mathbb{R}$ clopen?',
  widget: {
    kind: 'multiple_choice' as const,
    props: {
      choices: [
        { id: 'a', label: 'Yes' },
        { id: 'b', label: 'No' },
      ],
    },
  },
  validator: { type: 'set_match' as const, engine: 'mathjs' as const, accept: ['a'] },
  feedback: { correct: 'yes', incorrect: [{ match: '*', message: 'think boundary' }] },
  tag: 'open-set',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedProgress.mockReturnValue({
    completedIds: new Set(),
    inProgressIds: new Set(),
    masteryByTag: new Map(),
    mastery: [],
    loading: false,
    refresh: vi.fn(),
  })
})

describe('GeneratedPracticeBeta', () => {
  it('renders nothing when generation is disabled', () => {
    mockedEnabled.mockReturnValue(false)
    const { container } = render(<GeneratedPracticeBeta tags={['open-set']} />)
    expect(container).toBeEmptyDOMElement()
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it('renders nothing when there are no tags', () => {
    mockedEnabled.mockReturnValue(true)
    const { container } = render(<GeneratedPracticeBeta tags={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('generates and runs verified items without affecting mastery', async () => {
    const user = userEvent.setup()
    mockedEnabled.mockReturnValue(true)
    mockedFetch.mockResolvedValue([sampleItem])

    render(<GeneratedPracticeBeta tags={['open-set']} />)
    expect(screen.getByText('Beta')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /generate practice/i }))

    expect(mockedFetch).toHaveBeenCalledWith(
      ['open-set'],
      3,
      undefined,
      expect.any(Array),
    )
    expect(await screen.findByText(/Practice 1 of 1/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument()
  })

  it('shows a fail-soft message when generation returns nothing', async () => {
    const user = userEvent.setup()
    mockedEnabled.mockReturnValue(true)
    mockedFetch.mockResolvedValue([])

    render(<GeneratedPracticeBeta tags={['open-set']} />)
    await user.click(screen.getByRole('button', { name: /generate practice/i }))

    expect(await screen.findByText(/Couldn't generate problems/i)).toBeInTheDocument()
  })
})
