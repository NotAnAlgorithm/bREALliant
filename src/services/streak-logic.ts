/** UTC date string YYYY-MM-DD */
export function toUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function previousUtcDateString(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return toUtcDateString(date)
}

export function computeNextStreak(
  currentStreak: number,
  lastActivityDate: string | null,
  today: string = toUtcDateString(),
): { current_streak: number; last_activity_date: string } {
  if (lastActivityDate === today) {
    return { current_streak: currentStreak, last_activity_date: today }
  }

  if (lastActivityDate === previousUtcDateString(today)) {
    return { current_streak: currentStreak + 1, last_activity_date: today }
  }

  return { current_streak: 1, last_activity_date: today }
}
