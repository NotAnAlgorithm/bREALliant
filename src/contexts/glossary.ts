import { createContext } from 'react'

export type Glossary = Record<string, { term?: string; definition: string }>

export const GlossaryContext = createContext<Glossary>({})
