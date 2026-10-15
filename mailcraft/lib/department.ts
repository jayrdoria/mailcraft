// Pure helpers — safe to import from client components.

/**
 * Canonical department key: trimmed, whitespace-collapsed, upper-cased ("crm " → "CRM").
 * Must stay in sync with the backfill in migration 20261015120000_department_shared_data.
 */
export function departmentKey(raw: string | null | undefined): string | null {
  if (!raw) return null
  const key = raw.trim().replace(/\s+/g, ' ').toUpperCase()
  return key || null
}

/** Distinct departments (first spelling wins), sorted — for pickers. */
export function distinctDepartments(values: (string | null | undefined)[]): string[] {
  const byKey = new Map<string, string>()
  for (const v of values) {
    const key = departmentKey(v)
    if (key && !byKey.has(key)) byKey.set(key, v!.trim().replace(/\s+/g, ' '))
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}
