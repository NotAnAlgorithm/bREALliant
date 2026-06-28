import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { getInitialWidgetState } from '../types'
import { getAnswerFromWidgetState } from '../../lib/feedback/feedback-engine'
import { SliderWidget } from './SliderWidget'
import { evalReadout, parseSliderProps } from './utils'

const widget = {
  kind: 'slider' as const,
  props: {
    min: 1,
    max: 50,
    step: 1,
    initialValue: 1,
    label: 'n',
    readouts: [{ label: '1/n', expression: '1/n' }],
    markers: [{ value: 50, label: 'max' }],
  },
}

describe('SliderWidget', () => {
  it('renders the label, value, and a derived readout', () => {
    render(
      <SliderWidget widget={widget} state={{ value: 4 }} onStateChange={vi.fn()} />,
    )

    expect(screen.getByText('n = 4')).toBeInTheDocument()
    expect(screen.getByText('1/n')).toBeInTheDocument()
    // 1/4 = 0.25
    expect(screen.getByText('0.25')).toBeInTheDocument()
  })

  it('reports the new value when the slider moves', () => {
    const onStateChange = vi.fn()
    render(
      <SliderWidget widget={widget} state={{ value: 1 }} onStateChange={onStateChange} />,
    )

    fireEvent.change(screen.getByRole('slider'), { target: { value: '10' } })
    expect(onStateChange).toHaveBeenCalledWith({ value: 10 })
  })

  it('clamps out-of-range values to the slider bounds', () => {
    const onStateChange = vi.fn()
    render(
      <SliderWidget widget={widget} state={{ value: 1 }} onStateChange={onStateChange} />,
    )

    fireEvent.change(screen.getByRole('slider'), { target: { value: '999' } })
    expect(onStateChange).toHaveBeenCalledWith({ value: 50 })
  })

  it('exposes the value to the feedback engine for optional grading', () => {
    expect(getAnswerFromWidgetState('slider', { value: 7 })).toBe('7')
  })

  it('initializes from props and clamps the initial value', () => {
    expect(getInitialWidgetState(widget)).toEqual({ value: 1 })
    expect(
      getInitialWidgetState({
        kind: 'slider',
        props: { min: 2, max: 8, initialValue: 100 },
      }),
    ).toEqual({ value: 8 })
  })

  it('parses props defensively and evaluates readouts safely', () => {
    const parsed = parseSliderProps({ min: 10, max: 0, step: -2 })
    expect(parsed.min).toBe(0)
    expect(parsed.max).toBe(10)
    expect(parsed.step).toBe(2)
    expect(evalReadout('1/n', 4)).toBe('0.25')
    expect(evalReadout('nonsense(', 4)).toBe('—')
  })
})
