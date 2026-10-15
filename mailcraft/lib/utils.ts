import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Short account label ("marketing@novas.ws" → "marketing") — department accounts can share a display name */
export function emailHandle(email: string): string {
  return email.split('@')[0] || email
}
