/// <reference types="vite/client" />

declare module 'react-katex' {
  import type { FC } from 'react'

  export type KatexProps = {
    math: string
    errorColor?: string
    renderError?: (error: Error) => React.ReactNode
  }

  export const BlockMath: FC<KatexProps>
  export const InlineMath: FC<KatexProps>
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** 'true' enables the grounded AI hint feature (F6). Off by default. */
  readonly VITE_AI_HINTS_ENABLED?: string
  /** 'true' enables verifier-gated AI problem generation (F8). Off by default. */
  readonly VITE_AI_GENERATION_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
