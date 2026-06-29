import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCourseProgress } from '../../hooks/useCourseProgress'
import { useRecommendation } from '../../hooks/useRecommendation'
import { buildCourseGraph } from '../../lib/course-graph/build-graph'
import type { MasteryStateValue } from '../../lib/database.types'
import type { Recommendation } from '../../lib/recommend/next-up'
import { CourseMap } from './CourseMap'
import { wrapLabel } from './CourseMapNode'

vi.mock('../../hooks/useCourseProgress')
vi.mock('../../hooks/useRecommendation')

const mockedUseCourseProgress = vi.mocked(useCourseProgress)
const mockedUseRecommendation = vi.mocked(useRecommendation)

function setProgress(
  completed: string[] = [],
  inProgress: string[] = [],
  masteryByTag: Map<string, MasteryStateValue> = new Map(),
) {
  mockedUseCourseProgress.mockReturnValue({
    completedIds: new Set(completed),
    inProgressIds: new Set(inProgress),
    masteryByTag,
    mastery: [],
    loading: false,
    refresh: vi.fn(),
  })
}

function setRecommendation(lessonId: string | null) {
  const recommendation: Recommendation | null = lessonId
    ? {
        kind: 'continue',
        title: 'Next up',
        reason: 'Keep going',
        cta: 'Start',
        href: `/lesson/${lessonId}`,
        lessonId,
      }
    : null
  mockedUseRecommendation.mockReturnValue({
    recommendation,
    loading: false,
    refresh: vi.fn(),
  })
}

function renderMap() {
  render(
    <MemoryRouter>
      <CourseMap />
    </MemoryRouter>,
  )
}

describe('CourseMap', () => {
  beforeEach(() => {
    mockedUseCourseProgress.mockReset()
    mockedUseRecommendation.mockReset()
  })

  it('renders a node for every lesson in the graph', () => {
    setProgress()
    setRecommendation(null)
    renderMap()

    const expectedCount = buildCourseGraph().nodes.length
    expect(expectedCount).toBeGreaterThan(0)
    expect(screen.getAllByTestId('course-map-node')).toHaveLength(expectedCount)
  })

  it('marks the first lesson ready and a dependent lesson locked', () => {
    setProgress()
    setRecommendation(null)
    renderMap()

    expect(
      screen
        .getByLabelText(/The Rational Number System/)
        .getAttribute('data-status'),
    ).toBe('unlocked')
    expect(
      screen.getByLabelText(/Bounds and Suprema/).getAttribute('data-status'),
    ).toBe('locked')
  })

  it('highlights the recommended lesson', () => {
    setProgress()
    setRecommendation('lesson-rationals-01')
    renderMap()

    const recommended = screen
      .getAllByTestId('course-map-node')
      .filter((node) => node.getAttribute('data-recommended') === 'true')
    expect(recommended).toHaveLength(1)
    expect(recommended[0].getAttribute('data-lesson-id')).toBe(
      'lesson-rationals-01',
    )
  })

  it('opens the detail popover when a node is activated', async () => {
    const user = userEvent.setup()
    setProgress()
    setRecommendation(null)
    renderMap()

    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByLabelText(/The Rational Number System/))

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', {
        name: /The Rational Number System/,
      }),
    ).toBeInTheDocument()
  })

  it('offers a soft-gate "Continue anyway" for a locked lesson', async () => {
    const user = userEvent.setup()
    setProgress()
    setRecommendation(null)
    renderMap()

    await user.click(screen.getByLabelText(/Bounds and Suprema/))

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('button', { name: 'Continue anyway' }),
    ).toBeInTheDocument()
  })

  it('keeps the FULL untruncated title in aria-label while wrapping the visible label', () => {
    setProgress()
    setRecommendation(null)
    renderMap()

    // A deliberately long title that must wrap + ellipsize visually.
    const node = screen.getByLabelText(
      /^Compactness ⇒ The Extreme Value Theorem —/,
    )
    expect(node.getAttribute('data-lesson-id')).toBe('lesson-evt-01')

    // Visible label is split into ≤ 2 deterministic lines (tspans)…
    const tspans = node.querySelectorAll('text.course-map-node-label tspan')
    expect(tspans.length).toBeGreaterThanOrEqual(1)
    expect(tspans.length).toBeLessThanOrEqual(2)

    // …and is truncated (the full title is longer than what fits in 2 lines).
    const visible = node.querySelector(
      'text.course-map-node-label',
    )?.textContent
    expect(visible).toMatch(/…$/)
    expect(visible).not.toBe('Compactness ⇒ The Extreme Value Theorem')

    // The visible <text> is hidden from a11y; the <g> carries the real label.
    expect(
      node.querySelector('text.course-map-node-label')?.getAttribute(
        'aria-hidden',
      ),
    ).toBe('true')
  })
})

describe('wrapLabel', () => {
  const MAX = 16

  it('wraps a short multi-word title across two lines without ellipsis', () => {
    const lines = wrapLabel('The Rational Number System', MAX, 2)
    expect(lines).toEqual(['The Rational', 'Number System'])
    expect(lines.join('')).not.toMatch(/…/)
  })

  it('keeps a single short title on one line', () => {
    expect(wrapLabel('Continuity', MAX, 2)).toEqual(['Continuity'])
  })

  it('never exceeds the line budget or the line count', () => {
    const titles = [
      'Connectedness ⇒ The Intermediate Value Theorem',
      'Limit Points, Closure, Interior, Boundary',
      'The Fundamental Theorem of Calculus',
      'Compactness & the Heine–Borel Theorem',
      '√2 Is Real: Completeness Fills the Gaps',
    ]
    for (const title of titles) {
      const lines = wrapLabel(title, MAX, 2)
      expect(lines.length).toBeLessThanOrEqual(2)
      for (const line of lines) expect(line.length).toBeLessThanOrEqual(MAX)
    }
  })

  it('ellipsizes the last line when the title does not fit', () => {
    const lines = wrapLabel(
      'Connectedness ⇒ The Intermediate Value Theorem',
      MAX,
      2,
    )
    expect(lines).toHaveLength(2)
    expect(lines[lines.length - 1]).toMatch(/…$/)
  })

  it('is deterministic (no DOM measurement)', () => {
    const a = wrapLabel('The Least Upper Bound Property', MAX, 2)
    const b = wrapLabel('The Least Upper Bound Property', MAX, 2)
    expect(a).toEqual(b)
  })

  it('hard-breaks a single word longer than the budget', () => {
    const lines = wrapLabel('Supercalifragilistic', MAX, 2)
    expect(lines.length).toBeLessThanOrEqual(2)
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(MAX)
  })
})
