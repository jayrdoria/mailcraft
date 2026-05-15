/**
 * Escapes HTML special characters in user-provided text values
 * before they are injected into template HTML.
 * Prevents XSS via editable text/richtext field injection.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Sanitizes user-provided URL values.
 * Only allows http: and https: protocols — strips javascript:, data:, etc.
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    // Return the parsed href so spaces and unsafe chars are percent-encoded.
    // This prevents CIO's paste handler from mangling URLs like "image name.jpg".
    return parsed.href
  } catch {
    return ''
  }
}
