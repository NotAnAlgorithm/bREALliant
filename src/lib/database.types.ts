export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Profile = {
  id: string
  username: string
  email: string
  created_at: string
}

export type LessonProgressRow = {
  user_id: string
  lesson_id: string
  step_id: string
  step_index: number
  step_state: Json
  step_states: Json
  step_attempts: Json
  completed: boolean
  updated_at: string
}

export type LessonCompletionRow = {
  user_id: string
  lesson_id: string
  completed_at: string
  tags: string[]
}

export type StreakRow = {
  user_id: string
  current_streak: number
  last_activity_date: string | null
}

export type LessonProgressSnapshot = {
  stepIndex: number
  stepId: string
  stepState: Record<string, unknown>
  stepStates: Record<string, Record<string, unknown>>
  stepAttempts: Record<string, { correct: boolean; message: string }>
  completed: boolean
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          username: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: LessonProgressRow
        Insert: {
          user_id: string
          lesson_id: string
          step_id: string
          step_index?: number
          step_state?: Json
          step_states?: Json
          step_attempts?: Json
          completed?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          lesson_id?: string
          step_id?: string
          step_index?: number
          step_state?: Json
          step_states?: Json
          step_attempts?: Json
          completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      lesson_completions: {
        Row: LessonCompletionRow
        Insert: {
          user_id: string
          lesson_id: string
          completed_at?: string
          tags?: string[]
        }
        Update: {
          user_id?: string
          lesson_id?: string
          completed_at?: string
          tags?: string[]
        }
        Relationships: []
      }
      streaks: {
        Row: StreakRow
        Insert: {
          user_id: string
          current_streak?: number
          last_activity_date?: string | null
        }
        Update: {
          user_id?: string
          current_streak?: number
          last_activity_date?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      resolve_sign_in_email: {
        Args: {
          login_identifier: string
        }
        Returns: string | null
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
