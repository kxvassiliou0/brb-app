const AFTERNOON_STARTS_AT_HOUR = 12

const EVENING_STARTS_AT_HOUR = 18

function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < AFTERNOON_STARTS_AT_HOUR) return 'Good morning'
  if (hour < EVENING_STARTS_AT_HOUR) return 'Good afternoon'
  return 'Good evening'
}

export function greetByName(
  name: string | undefined,
  date: Date = new Date()
): string {
  const greeting = greetingFor(date)
  const trimmed = name?.trim()
  return trimmed ? `${greeting}, ${trimmed}` : greeting
}
