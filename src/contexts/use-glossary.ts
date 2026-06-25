import { useContext } from 'react'

import { GlossaryContext, type Glossary } from './glossary'

export function useGlossary(): Glossary {
  return useContext(GlossaryContext)
}
