import { useMemo, type ReactNode } from 'react'

import { GlossaryContext, type Glossary } from './glossary'

export function GlossaryProvider({
  glossary,
  children,
}: {
  glossary?: Glossary
  children: ReactNode
}) {
  const value = useMemo(() => glossary ?? {}, [glossary])
  return (
    <GlossaryContext.Provider value={value}>
      {children}
    </GlossaryContext.Provider>
  )
}
