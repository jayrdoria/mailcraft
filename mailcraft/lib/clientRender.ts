import type { SavedSectionConfig, FieldValue } from '@/lib/types/template'

// ─────────────────────────────────────────────
// Token injection
// ─────────────────────────────────────────────

export function injectTokens(html: string, tokens: Record<string, FieldValue>): string {
  let result = html
  for (const [key, value] of Object.entries(tokens)) {
    if (Array.isArray(value)) continue // BodyParagraph[] — rendered in Phase 3
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), value)
  }
  return result
}

// ─────────────────────────────────────────────
// Section transforms (mirrors sectionService.ts)
// ─────────────────────────────────────────────

function disableSection(html: string, name: string): string {
  const re = new RegExp(
    `<!-- SECTION:START:${name} -->([\\s\\S]*?)<!-- SECTION:END:${name} -->`,
    'g'
  )
  return html.replace(
    re,
    (_, content: string) =>
      `<!-- SECTION:DISABLED:START:${name}\n${content}\nSECTION:DISABLED:END:${name} -->`
  )
}

function deleteSection(html: string, name: string): string {
  let result = html.replace(
    new RegExp(
      `<!-- SECTION:START:${name} -->[\\s\\S]*?<!-- SECTION:END:${name} -->`,
      'g'
    ),
    ''
  )
  result = result.replace(
    new RegExp(
      `<!-- SECTION:DISABLED:START:${name}\\n[\\s\\S]*?\\nSECTION:DISABLED:END:${name} -->`,
      'g'
    ),
    ''
  )
  return result
}

// ─────────────────────────────────────────────
// Apply section config to HTML
// ─────────────────────────────────────────────

export function applySectionConfig(
  html: string,
  sectionConfig: SavedSectionConfig[]
): string {
  let result = html
  for (const section of sectionConfig) {
    if (section.isDeleted) {
      result = deleteSection(result, section.name)
    } else if (!section.isActive) {
      result = disableSection(result, section.name)
    }
  }
  return result
}

// ─────────────────────────────────────────────
// Build section config from activeSections list
// ─────────────────────────────────────────────

export function buildSectionConfig(
  allSections: { name: string; label: string }[],
  activeSections: string[],
  deletedSections: string[] = []
): SavedSectionConfig[] {
  return allSections.map((s) => ({
    name: s.name,
    label: s.label,
    isActive: activeSections.includes(s.name),
    isDeleted: deletedSections.includes(s.name),
  }))
}

// ─────────────────────────────────────────────
// Parse section names from master HTML
// ─────────────────────────────────────────────

export function parseSectionNames(html: string): { name: string; label: string }[] {
  const sections: { name: string; label: string }[] = []
  const re = /<!-- SECTION:START:(\w+) -->/g
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const name = match[1]
    const label = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    if (!sections.find((s) => s.name === name)) {
      sections.push({ name, label })
    }
  }
  return sections
}

// ─────────────────────────────────────────────
// Full client-side render
// masterPreviewHtml: locked fields already injected
// fieldValues: current editable field values
// sectionConfig: current section state
// ─────────────────────────────────────────────

export function clientRender(
  masterPreviewHtml: string,
  fieldValues: Record<string, FieldValue>,
  sectionConfig: SavedSectionConfig[]
): string {
  let html = applySectionConfig(masterPreviewHtml, sectionConfig)
  html = injectTokens(html, fieldValues)
  return html
}
