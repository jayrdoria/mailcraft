import { parse as parseHtml } from 'node-html-parser'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import type { Language, TemplateFieldConfig } from '@/lib/types/template'
import type { DomNode, FieldMapping, AnalyzeResult } from '@/lib/types/import'

export type { DomNode, FieldMapping, AnalyzeResult }

// ─────────────────────────────────────────────
// Analyze — entry point called by /api/import/analyze
// ─────────────────────────────────────────────

export function analyzeHtml(html: string): AnalyzeResult {
  return instrumentHtml(html)
}

// ─────────────────────────────────────────────
// Instrument HTML — assigns data-mc-id to eligible elements
// Used for the visual mapper iframe in Phase 4
// ─────────────────────────────────────────────

const TEXT_TAGS = ['p', 'td', 'th', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'li']

function instrumentHtml(html: string): { instrumentedHtml: string; domNodes: DomNode[] } {
  const root = parseHtml(html, { comment: true })
  const domNodes: DomNode[] = []
  let counter = 0

  // Images — src must be a real URL
  for (const el of root.querySelectorAll('img')) {
    const src = el.getAttribute('src') ?? ''
    if (!src || src.startsWith('data:') || src.startsWith('cid:')) continue
    const id = String(++counter)
    el.setAttribute('data-mc-id', id)
    domNodes.push({ mcId: id, type: 'image', preview: src, tag: 'img' })
  }

  // Links — skip anchors and mailto
  for (const el of root.querySelectorAll('a')) {
    const href = el.getAttribute('href') ?? ''
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue
    const id = String(++counter)
    el.setAttribute('data-mc-id', id)
    domNodes.push({ mcId: id, type: 'link', preview: href, tag: 'a' })
  }

  // Text blocks — skip empty nodes only.
  // We intentionally tag parent elements even when they contain tagged children
  // (e.g. a <p> that wraps a <a>) so the user can map the text content separately.
  // stopPropagation in the iframe script ensures clicks don't bubble to outer elements.
  for (const tag of TEXT_TAGS) {
    for (const el of root.querySelectorAll(tag)) {
      const text = el.text.trim()
      if (text.length < 3) continue
      const id = String(++counter)
      el.setAttribute('data-mc-id', id)
      domNodes.push({ mcId: id, type: 'text', preview: text.slice(0, 80), tag: tag })
    }
  }

  return { instrumentedHtml: root.toString(), domNodes }
}

// ─────────────────────────────────────────────
// Inject placeholders — replaces mapped elements with {{KEY}} tokens
// Receives the instrumented HTML from the client (contains data-mc-id attrs)
// ─────────────────────────────────────────────

export function injectPlaceholders(
  instrumentedHtml: string,
  mappings: FieldMapping[]
): { placeholderHtml: string; initialValues: Record<string, string> } {
  const root = parseHtml(instrumentedHtml, { comment: true })
  const initialValues: Record<string, string> = {}
  const usedKeys = new Set<string>()

  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i]
    const el = root.querySelector(`[data-mc-id="${mapping.mcId}"]`)
    if (!el) continue

    const key = deriveKey(mapping.label, i, usedKeys)
    usedKeys.add(key)
    initialValues[key] = ''

    if (mapping.type === 'url') {
      initialValues[key] = el.getAttribute('src') ?? ''
      el.setAttribute('src', `{{${key}}}`)
    } else if (mapping.type === 'link') {
      initialValues[key] = el.getAttribute('href') ?? ''
      el.setAttribute('href', `{{${key}}}`)
    } else if (mapping.type === 'richtext') {
      initialValues[key] = el.innerHTML.trim()
      el.set_content(`{{${key}}}`)
    } else {
      initialValues[key] = el.text.trim()
      el.set_content(`{{${key}}}`)
    }
  }

  // Strip all data-mc-id attributes from final HTML
  for (const el of root.querySelectorAll('[data-mc-id]')) {
    el.removeAttribute('data-mc-id')
  }

  return { placeholderHtml: root.toString(), initialValues }
}

// Derive a stable, unique, uppercase key from a human label
function deriveKey(label: string, index: number, usedKeys: Set<string>): string {
  let key = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || `FIELD_${index + 1}`

  if (usedKeys.has(key)) key = `${key}_${index + 1}`
  return key
}

// ─────────────────────────────────────────────
// Build TemplateFieldConfig[] from field mappings
// ─────────────────────────────────────────────

export function buildEditableFields(mappings: FieldMapping[]): TemplateFieldConfig[] {
  const usedKeys = new Set<string>()

  return mappings.map((m, i) => {
    const key = deriveKey(m.label, i, usedKeys)
    usedKeys.add(key)

    return {
      key,
      label: m.label,
      type: m.type === 'url' ? 'url' : m.type === 'link' ? 'link' : m.type,
      defaultRequired: false,
      defaultValue: '',
      group: 'Content',
    }
  })
}

// ─────────────────────────────────────────────
// Save HTML files to disk for each active language
// All languages share the same template structure
// ─────────────────────────────────────────────

export async function saveHtmlFiles(
  html: string,
  baseFilePath: string,
  languages: Language[]
): Promise<void> {
  await mkdir(baseFilePath, { recursive: true })
  await Promise.all(
    languages.map((lang) =>
      writeFile(path.join(baseFilePath, `${lang}.html`), html, 'utf-8')
    )
  )
}

// ─────────────────────────────────────────────
// Generate a unique slug for an imported master template
// ─────────────────────────────────────────────

export function buildImportSlug(userId: string, name: string): string {
  const namePart = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const userPart = userId.slice(-6)
  const ts = Date.now().toString(36)
  return `imp-${userPart}-${ts}-${namePart}`
}

// ─────────────────────────────────────────────
// Build base file path for an imported template
// ─────────────────────────────────────────────

export function buildImportBasePath(slug: string): string {
  const baseDir = process.env.TEMPLATE_BASE_DIR ?? './data/templates'
  return path.join(baseDir, 'imported', slug)
}
