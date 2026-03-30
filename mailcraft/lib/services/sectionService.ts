import type { TemplateSection } from '@/lib/types/template'

// ─────────────────────────────────────────────
// Regex patterns
// ─────────────────────────────────────────────

// Active section: <!-- SECTION:START:NAME --> ... <!-- SECTION:END:NAME -->
const ACTIVE_SECTION_RE =
  /<!-- SECTION:START:(\w+) -->([\s\S]*?)<!-- SECTION:END:\1 -->/g

// Disabled section: <!-- SECTION:DISABLED:START:NAME\n...\nSECTION:DISABLED:END:NAME -->
const DISABLED_SECTION_RE =
  /<!-- SECTION:DISABLED:START:(\w+)\n([\s\S]*?)\nSECTION:DISABLED:END:\1 -->/g

function toLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// ─────────────────────────────────────────────
// Parse all sections from HTML
// ─────────────────────────────────────────────

export function parseSections(html: string): TemplateSection[] {
  const sections: TemplateSection[] = []

  let match: RegExpExecArray | null

  const activeRe = new RegExp(ACTIVE_SECTION_RE.source, 'g')
  while ((match = activeRe.exec(html)) !== null) {
    sections.push({
      name: match[1],
      label: toLabel(match[1]),
      isActive: true,
      html: match[2],
    })
  }

  const disabledRe = new RegExp(DISABLED_SECTION_RE.source, 'g')
  while ((match = disabledRe.exec(html)) !== null) {
    sections.push({
      name: match[1],
      label: toLabel(match[1]),
      isActive: false,
      html: match[2],
    })
  }

  return sections
}

// ─────────────────────────────────────────────
// Toggle section off (wrap in disabled comment block)
// ─────────────────────────────────────────────

export function disableSection(html: string, sectionName: string): string {
  const re = new RegExp(
    `<!-- SECTION:START:${sectionName} -->([\\s\\S]*?)<!-- SECTION:END:${sectionName} -->`,
    'g'
  )
  return html.replace(
    re,
    (_, content: string) =>
      `<!-- SECTION:DISABLED:START:${sectionName}\n${content}\nSECTION:DISABLED:END:${sectionName} -->`
  )
}

// ─────────────────────────────────────────────
// Toggle section on (restore from disabled)
// ─────────────────────────────────────────────

export function enableSection(html: string, sectionName: string): string {
  const re = new RegExp(
    `<!-- SECTION:DISABLED:START:${sectionName}\\n([\\s\\S]*?)\\nSECTION:DISABLED:END:${sectionName} -->`,
    'g'
  )
  return html.replace(
    re,
    (_, content: string) =>
      `<!-- SECTION:START:${sectionName} -->${content}<!-- SECTION:END:${sectionName} -->`
  )
}

// ─────────────────────────────────────────────
// Permanently delete a section (active or disabled)
// ─────────────────────────────────────────────

export function deleteSection(html: string, sectionName: string): string {
  // Remove active section
  let result = html.replace(
    new RegExp(
      `<!-- SECTION:START:${sectionName} -->[\\s\\S]*?<!-- SECTION:END:${sectionName} -->`,
      'g'
    ),
    ''
  )
  // Remove disabled section
  result = result.replace(
    new RegExp(
      `<!-- SECTION:DISABLED:START:${sectionName}\\n[\\s\\S]*?\\nSECTION:DISABLED:END:${sectionName} -->`,
      'g'
    ),
    ''
  )
  return result
}

// ─────────────────────────────────────────────
// Clean HTML for production export
// Strips disabled sections entirely.
// Removes section marker comments but keeps content.
// Result: lean HTML ready for Customer.io paste.
// ─────────────────────────────────────────────

export function cleanHtml(html: string): string {
  // Remove disabled sections (entire block gone)
  let result = html.replace(
    /<!-- SECTION:DISABLED:START:\w+\n[\s\S]*?\nSECTION:DISABLED:END:\w+ -->/g,
    ''
  )
  // Remove section START markers (keep content)
  result = result.replace(/<!-- SECTION:START:\w+ -->/g, '')
  // Remove section END markers
  result = result.replace(/<!-- SECTION:END:\w+ -->/g, '')
  return result
}
