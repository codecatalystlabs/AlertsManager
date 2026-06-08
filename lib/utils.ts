import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** YYYY-MM-DD in local timezone (for HTML date input max/min). */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** HH:MM in local timezone (for HTML time inputs). */
export function getLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

/** ISO string from separate local date and time input values. */
export function getLocalDateTimeIsoString(
  dateString: string,
  timeString: string,
  fallback: Date = new Date()
): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeString)

  if (!dateMatch || !timeMatch) return fallback.toISOString()

  const [, year, month, day] = dateMatch
  const [, hours, minutes] = timeMatch
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0
  )

  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString()
}
