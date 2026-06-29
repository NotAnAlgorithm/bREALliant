import { describe, expect, it } from 'vitest'

import { parseRichText } from './parse-rich-text'

describe('parseRichText', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseRichText('')).toEqual([])
  })

  it('parses plain text as a single text node', () => {
    expect(parseRichText('hello world')).toEqual([
      { type: 'text', value: 'hello world' },
    ])
  })

  it('parses inline math as an opaque atom', () => {
    expect(parseRichText('a $x+y$ b')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'math', value: 'x+y', display: false },
      { type: 'text', value: ' b' },
    ])
  })

  it('parses block math as a display atom', () => {
    expect(parseRichText('$$x^2$$')).toEqual([
      { type: 'math', value: 'x^2', display: true },
    ])
  })

  it('lets strong span across inline math', () => {
    expect(parseRichText('**converges to $S$**')).toEqual([
      {
        type: 'strong',
        children: [
          { type: 'text', value: 'converges to ' },
          { type: 'math', value: 'S', display: false },
        ],
      },
    ])
  })

  it('lets em span across inline math', () => {
    expect(parseRichText('*near $x$ here*')).toEqual([
      {
        type: 'em',
        children: [
          { type: 'text', value: 'near ' },
          { type: 'math', value: 'x', display: false },
          { type: 'text', value: ' here' },
        ],
      },
    ])
  })

  it('handles math, strong, math in sequence', () => {
    expect(parseRichText('$a$ **bold** $b$')).toEqual([
      { type: 'math', value: 'a', display: false },
      { type: 'text', value: ' ' },
      { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
      { type: 'text', value: ' ' },
      { type: 'math', value: 'b', display: false },
    ])
  })

  it('lets strong span two math spans and text', () => {
    expect(parseRichText('**bold $x$ and $y$ done**')).toEqual([
      {
        type: 'strong',
        children: [
          { type: 'text', value: 'bold ' },
          { type: 'math', value: 'x', display: false },
          { type: 'text', value: ' and ' },
          { type: 'math', value: 'y', display: false },
          { type: 'text', value: ' done' },
        ],
      },
    ])
  })

  it('treats code as opaque so $ inside is not math', () => {
    expect(parseRichText('a `code with $x$ inside` b')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'code', value: 'code with $x$ inside' },
      { type: 'text', value: ' b' },
    ])
  })

  it('does not treat * or _ inside math as markdown', () => {
    expect(parseRichText('$a*b*c$')).toEqual([
      { type: 'math', value: 'a*b*c', display: false },
    ])
    expect(parseRichText('$a_b$')).toEqual([
      { type: 'math', value: 'a_b', display: false },
    ])
  })

  it('does not let a delimiter inside math close an outer wrapper', () => {
    // The `*` lives inside math, so it must not close the em.
    expect(parseRichText('*pre $a*b$ post*')).toEqual([
      {
        type: 'em',
        children: [
          { type: 'text', value: 'pre ' },
          { type: 'math', value: 'a*b', display: false },
          { type: 'text', value: ' post' },
        ],
      },
    ])
  })

  it('parses definition terms with and without a display label', () => {
    expect(parseRichText('[[field]] and [[fields|field]]')).toEqual([
      { type: 'defterm', label: 'field', key: 'field' },
      { type: 'text', value: ' and ' },
      { type: 'defterm', label: 'fields', key: 'field' },
    ])
  })

  it('renders an unmatched * literally', () => {
    expect(parseRichText('a * b')).toEqual([{ type: 'text', value: 'a * b' }])
  })

  it('renders an unmatched ` literally', () => {
    expect(parseRichText('a ` b')).toEqual([{ type: 'text', value: 'a ` b' }])
  })

  it('renders a lone $ literally', () => {
    expect(parseRichText('cost is $5 today')).toEqual([
      { type: 'text', value: 'cost is $5 today' },
    ])
  })

  it('treats an escaped \\$ as a literal dollar', () => {
    expect(parseRichText('price \\$5 net')).toEqual([
      { type: 'text', value: 'price $5 net' },
    ])
  })

  it('supports nested em inside strong', () => {
    expect(parseRichText('**bold *italic* end**')).toEqual([
      {
        type: 'strong',
        children: [
          { type: 'text', value: 'bold ' },
          { type: 'em', children: [{ type: 'text', value: 'italic' }] },
          { type: 'text', value: ' end' },
        ],
      },
    ])
  })
})
