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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
