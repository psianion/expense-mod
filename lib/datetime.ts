import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

// Enable dayjs UTC plugin for timezone handling
dayjs.extend(utc)

/**
 * Converts a local time ISO string (YYYY-MM-DDTHH:mm:ss) to UTC ISO string for database storage
 * @param localISO - Local time string in format "YYYY-MM-DDTHH:mm:ss"
 * @returns UTC ISO string in format "YYYY-MM-DDTHH:mm:ss.sssZ"
 */
export function toUTC(localISO: string): string {
  if (!localISO) return new Date().toISOString()
  
  // Parse as local time (dayjs parses in local timezone by default)
  // Then convert to UTC for storage
  const localDate = dayjs(localISO)
  if (!localDate.isValid()) {
    return new Date().toISOString()
  }
  
  // Convert local time to UTC
  return localDate.utc().toISOString()
}

/**
 * Converts a UTC ISO string from database to local time ISO string for UI display
 * @param utcISO - UTC ISO string (can be with or without Z suffix)
 * @returns Local time string in format "YYYY-MM-DDTHH:mm:ss"
 */
export function fromUTC(utcISO: string): string {
  if (!utcISO) return getLocalISO()
  
  // Parse as UTC first, then convert to local time
  let utcDate = dayjs.utc(utcISO)
  
  // If parsing as UTC fails, try parsing normally (might already be local)
  if (!utcDate.isValid()) {
    utcDate = dayjs(utcISO)
    if (!utcDate.isValid()) {
      return getLocalISO()
    }
    // If it's already in local format, return as-is
    return utcDate.format('YYYY-MM-DDTHH:mm:ss')
  }
  
  // Convert UTC to local time
  return utcDate.local().format('YYYY-MM-DDTHH:mm:ss')
}

/**
 * Gets current local time as ISO string (YYYY-MM-DDTHH:mm:ss format)
 * @returns Current local time string
 */
export function getLocalISO(): string {
  return dayjs().format('YYYY-MM-DDTHH:mm:ss')
}

/**
 * Parses AI-returned datetime string and converts to local time ISO format
 * Handles both UTC ISO strings and local time strings
 * @param aiDate - Date string from AI (can be UTC or local)
 * @param fallback - Fallback date if parsing fails
 * @returns Local time ISO string or null
 */
export function parseAIDateTime(aiDate: string | null, fallback?: Date): string | null {
  if (!aiDate) return null
  
  try {
    // Try parsing as UTC first (if it has Z or +00:00)
    if (aiDate.includes('Z') || aiDate.includes('+') || aiDate.endsWith('UTC')) {
      return fromUTC(aiDate)
    }
    
    // Otherwise, treat as local time and validate
    const parsed = dayjs(aiDate)
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DDTHH:mm:ss')
    }
    
    // If parsing fails, use fallback
    if (fallback) {
      return dayjs(fallback).format('YYYY-MM-DDTHH:mm:ss')
    }
    
    return null
  } catch (error) {
    console.error('Error parsing AI datetime:', error)
    if (fallback) {
      return dayjs(fallback).format('YYYY-MM-DDTHH:mm:ss')
    }
    return null
  }
}

/**
 * Gets current date/time context for AI prompts
 * Returns formatted string with current local date and time
 */
export function getCurrentDateTimeContext(): string {
  const now = dayjs()
  return `Current date and time (local timezone): ${now.format('YYYY-MM-DD HH:mm:ss')} (${now.format('dddd, MMMM D, YYYY')})`
}

/**
 * Converts a Date object to local time ISO string
 */
export function dateToLocalISO(date: Date): string {
  return dayjs(date).format('YYYY-MM-DDTHH:mm:ss')
}

/**
 * Converts a local time ISO string to Date object
 */
export function localISOToDate(localISO: string): Date {
  return dayjs(localISO).toDate()
}

