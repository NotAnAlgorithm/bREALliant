export function formatAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('rate limit') || lower.includes('429')) {
    return (
      'Sign-up email rate limit reached. For local development, turn off ' +
      '"Confirm email" in Supabase → Authentication → Providers → Email, ' +
      'or wait a few minutes and try again.'
    )
  }

  if (lower.includes('database error saving new user')) {
    return (
      'Account setup failed in the database. Run migration ' +
      'supabase/migrations/003_drop_profile_trigger.sql in the Supabase SQL ' +
      'editor, then try signing up again.'
    )
  }

  return message
}
