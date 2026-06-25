import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GlossaryProvider } from '../../contexts/GlossaryProvider'
import { DefinitionTerm } from './DefinitionTerm'

const glossary = {
  field: {
    term: 'Field',
    definition: 'A set with well-behaved addition and multiplication.',
  },
}

describe('DefinitionTerm', () => {
  it('opens a popover with the definition when clicked', async () => {
    const user = userEvent.setup()

    render(
      <GlossaryProvider glossary={glossary}>
        <DefinitionTerm termKey="field" label="field" />
      </GlossaryProvider>,
    )

    const trigger = screen.getByRole('button', { name: 'field' })
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Field')
    expect(dialog).toHaveTextContent(/well-behaved addition/)
  })

  it('closes the popover on Escape', async () => {
    const user = userEvent.setup()

    render(
      <GlossaryProvider glossary={glossary}>
        <DefinitionTerm termKey="field" label="field" />
      </GlossaryProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'field' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders plain text with no button when the key is unknown', () => {
    render(
      <GlossaryProvider glossary={glossary}>
        <DefinitionTerm termKey="missing" label="missing" />
      </GlossaryProvider>,
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('missing')).toBeInTheDocument()
  })
})
