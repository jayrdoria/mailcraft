import { parse as parseHtml, HTMLElement } from 'node-html-parser'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import type { Language, TemplateFieldConfig } from '@/lib/types/template'
import type { DomNode, FieldMapping, AnalyzeResult, ImportSection, MappedSection } from '@/lib/types/import'

export type { DomNode, FieldMapping, AnalyzeResult, ImportSection, MappedSection }

// Attribute marking a detected section's container row inside the instrumented
// HTML. Consumed by the mapper UI (Phase 7) and converted to SECTION markers on
// save (Phase 8); stripped from the final placeholder HTML until then.
const SECTION_ATTR = 'data-mc-section'

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

// ─────────────────────────────────────────────
// SECTION DETECTION (Phase 6)
// Email templates stack vertically as rows of a content table. We pick the table
// whose direct rows best represent the email's top-level structure (header / body
// / footer …) and treat each of those rows as a section. This mirrors how master
// templates group sibling <tr>s under SECTION markers, so imports gain the same
// toggle/delete/reorder boundaries. Over-segmentation is fine — Phase 7 lets the
// user rename/add/merge. Detection is a best-effort first pass; empty is valid.
// ─────────────────────────────────────────────

// A row counts as "content" if it carries visible text or an image (skips pure
// spacer / structural rows that would make noisy sections).
function rowHasContent(row: HTMLElement): boolean {
  return row.text.trim().length >= 3 || row.querySelector('img') !== null
}

// Direct <tr> children of a table, looking through a single tbody/thead/tfoot
// layer (node-html-parser does not auto-insert tbody, so both forms occur).
function directRows(table: HTMLElement): HTMLElement[] {
  const rows: HTMLElement[] = []
  for (const child of table.childNodes) {
    if (!(child instanceof HTMLElement)) continue
    const tag = child.tagName?.toLowerCase()
    if (tag === 'tr') {
      rows.push(child)
    } else if (tag === 'tbody' || tag === 'thead' || tag === 'tfoot') {
      for (const gc of child.childNodes) {
        if (gc instanceof HTMLElement && gc.tagName?.toLowerCase() === 'tr') rows.push(gc)
      }
    }
  }
  return rows
}

// Human label for a section row: prefer a heading, then a footer/first-line cue,
// then leading text, then a positional fallback. All user-editable in Phase 7.
function labelForRow(row: HTMLElement, order: number, isLast: boolean): string {
  for (const h of ['h1', 'h2', 'h3', 'h4']) {
    const el = row.querySelector(h)
    const t = el?.text.trim()
    if (t) return t.length > 30 ? t.slice(0, 30).trim() + '…' : t
  }
  const text = row.text.replace(/\s+/g, ' ').trim()
  const lower = text.toLowerCase()
  if (lower.includes('unsubscribe') || lower.includes('all rights') || text.includes('©')) return 'Footer'
  if (!text && row.querySelector('img')) return order === 0 ? 'Header' : `Section ${order + 1}`
  if (text) {
    if (order === 0 && text.length < 24) return text
    const label = text.length > 30 ? text.slice(0, 30).trim() + '…' : text
    return label
  }
  return isLast ? 'Footer' : `Section ${order + 1}`
}

// Detect sections and tag their container rows with data-mc-section in place.
// Returns the ordered section list (empty when no clear structure is found).
function detectSections(root: HTMLElement): ImportSection[] {
  let best: HTMLElement[] = []
  let bestText = -1
  for (const table of root.querySelectorAll('table')) {
    const rows = directRows(table).filter(rowHasContent)
    if (rows.length < 2) continue // need ≥2 rows to call it a structure
    const textLen = table.text.trim().length
    // Prefer more rows; break ties toward the richer (usually inner content) table.
    if (rows.length > best.length || (rows.length === best.length && textLen > bestText)) {
      best = rows
      bestText = textLen
    }
  }

  const sections: ImportSection[] = []
  best.forEach((row, i) => {
    const sectionId = `sec_${i + 1}`
    row.setAttribute(SECTION_ATTR, sectionId)
    sections.push({ sectionId, label: labelForRow(row, i, i === best.length - 1), order: i })
  })
  return sections
}

function instrumentHtml(html: string): AnalyzeResult {
  const root = parseHtml(html, { comment: true })
  const domNodes: DomNode[] = []
  let counter = 0

  // Detect + tag sections first so each mapped node can resolve its container.
  const sections = detectSections(root)
  const sectionOf = (el: HTMLElement): string | undefined =>
    el.closest(`[${SECTION_ATTR}]`)?.getAttribute(SECTION_ATTR) ?? undefined

  // Images — src must be a real URL
  for (const el of root.querySelectorAll('img')) {
    const src = el.getAttribute('src') ?? ''
    if (!src || src.startsWith('data:') || src.startsWith('cid:')) continue
    const id = String(++counter)
    el.setAttribute('data-mc-id', id)
    domNodes.push({ mcId: id, type: 'image', preview: src, tag: 'img', sectionId: sectionOf(el) })
  }

  // Links — skip anchors and mailto
  for (const el of root.querySelectorAll('a')) {
    const href = el.getAttribute('href') ?? ''
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue
    const id = String(++counter)
    el.setAttribute('data-mc-id', id)
    domNodes.push({ mcId: id, type: 'link', preview: href, tag: 'a', sectionId: sectionOf(el) })
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
      domNodes.push({ mcId: id, type: 'text', preview: text.slice(0, 80), tag: tag, sectionId: sectionOf(el) })
    }
  }

  const suggestedMappings = buildSuggestedMappings(root)
  return { instrumentedHtml: root.toString(), domNodes, sections, suggestedMappings }
}

// ─────────────────────────────────────────────
// AUTO-DETECTION (opt-out mapping)
// Pre-map every meaningful content leaf so the mapper opens pre-filled: the user
// reviews/prunes instead of clicking each element. The instrumenter tags parent
// containers too (for manual click-mapping), so here we must select only the
// leaves and keep images/links granular — otherwise a wrapper <td> would be mapped
// as one giant field on top of its own children.
// ─────────────────────────────────────────────

// Block-level text tags (span excluded — inline formatting shouldn't fragment a
// paragraph into pieces). A text element with a block descendant is a container.
const BLOCK_TEXT_SEL = ['p', 'td', 'th', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'li']
  .map((t) => `${t}[data-mc-id]`)
  .join(',')

function hasBlockTextDescendant(el: HTMLElement): boolean {
  return el.querySelectorAll(BLOCK_TEXT_SEL).some((d) => d.text.trim().length >= 3)
}

function prettyLabel(raw: string, max = 40): string {
  const t = raw.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const words = t.split(' ').slice(0, 6).join(' ')
  return words.length > max ? words.slice(0, max).trim() : words
}

function imageLabel(src: string): string {
  const clean = src.split('?')[0].split('#')[0]
  const base = clean.substring(clean.lastIndexOf('/') + 1).replace(/\.[a-z0-9]+$/i, '')
  return prettyLabel(base.replace(/[-_]+/g, ' '))
}

// Hidden preheader / MSO-hidden content can't be shown in the preview, so a field
// for it is un-locatable (the user "doesn't know where it is"). Skip in auto-detect.
function isHidden(el: HTMLElement): boolean {
  let cur: HTMLElement | null = el
  while (cur) {
    const s = (cur.getAttribute?.('style') ?? '').replace(/\s+/g, '').toLowerCase()
    if (s.includes('display:none') || s.includes('mso-hide:all')) return true
    cur = cur.parentNode as HTMLElement | null
  }
  return false
}

function buildSuggestedMappings(root: HTMLElement): FieldMapping[] {
  const out: FieldMapping[] = []
  let imgN = 0, linkN = 0, textN = 0

  // Images: atomic, attribute-replaced (never destructive) — take all.
  for (const el of root.querySelectorAll('img[data-mc-id]')) {
    if (isHidden(el)) continue
    out.push({ mcId: el.getAttribute('data-mc-id')!, label: imageLabel(el.getAttribute('src') ?? '') || `Image ${++imgN}`, type: 'url' })
  }
  // Links: map both the visible TEXT (so buttons/links are editable, e.g. "Confirm
  // Email Address") and the href URL. Image-only links (logo/banner) have no text,
  // so they get the URL field only.
  for (const el of root.querySelectorAll('a[data-mc-id]')) {
    if (isHidden(el)) continue
    const mcId = el.getAttribute('data-mc-id')!
    linkN++
    const text = prettyLabel(el.text)
    const base = text || `Link ${linkN}`
    if (el.text.trim().length >= 2) out.push({ mcId, label: base, type: 'text' })
    out.push({ mcId, label: `${base} URL`, type: 'link' })
  }

  // Text: choose content leaves in document order. Skip containers (they have a
  // block text descendant → the descendant is the leaf) and, once a region is
  // chosen, skip everything inside it. Regions holding a mapped link/image are
  // consumed but not text-mapped, so the granular url/link wins (no overlap).
  const consumed = new Set<HTMLElement>()
  const insideConsumed = (el: HTMLElement): boolean => {
    let p = el.parentNode as HTMLElement | null
    while (p) { if (consumed.has(p)) return true; p = p.parentNode as HTMLElement | null }
    return false
  }
  for (const el of root.querySelectorAll(BLOCK_TEXT_SEL + ',span[data-mc-id]')) {
    if (el.text.trim().length < 3 || insideConsumed(el) || hasBlockTextDescendant(el) || isHidden(el)) continue
    consumed.add(el)
    if (el.querySelector('img[data-mc-id], a[data-mc-id]')) continue // prefer granular url/link
    const isRich = /<[a-z][\s\S]*>/i.test(el.innerHTML.trim())
    out.push({ mcId: el.getAttribute('data-mc-id')!, label: prettyLabel(el.text) || `Text ${++textN}`, type: isRich ? 'richtext' : 'text' })
  }

  // Sort into document (top-to-bottom) order so the editor's Content tab reads
  // like the email instead of grouping all images, then links, then text.
  const docOrder = new Map<string, number>()
  root.querySelectorAll('[data-mc-id]').forEach((el, i) => docOrder.set(el.getAttribute('data-mc-id')!, i))
  out.sort((a, b) => (docOrder.get(a.mcId) ?? 0) - (docOrder.get(b.mcId) ?? 0))

  return out
}

// ─────────────────────────────────────────────
// SECTION MARKER INJECTION (Phase 8)
// Turn the mapper's edited sections into real <!-- SECTION:START/END:NAME -->
// markers wrapping the detected rows, so an imported template behaves exactly
// like a master (toggle / delete / reorder + accepts custom blocks). Each mapped
// field also inherits its section as its field group, matching how the editor
// groups + toggles fields per section (normalizeGroup ≡ this normalization).
// ─────────────────────────────────────────────

function sectionNameFromLabel(label: string): string {
  return label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'SECTION'
}

// Assign a unique, marker-safe (\w+) NAME to each section (in document order) and
// map every member rowId → its section name (for field-group inheritance).
function resolveSectionNames(sections: MappedSection[]): { names: string[]; byRowId: Map<string, string> } {
  const used = new Set<string>()
  const names: string[] = []
  const byRowId = new Map<string, string>()
  for (const sec of sections) {
    const base = sectionNameFromLabel(sec.label)
    let name = base
    let n = 2
    while (used.has(name)) name = `${base}_${n++}`
    used.add(name)
    names.push(name)
    for (const rid of sec.rowIds) byRowId.set(rid, name)
  }
  return { names, byRowId }
}

// Wrap each section's contiguous run of detected rows with SECTION markers.
function injectSectionMarkers(root: HTMLElement, sections: MappedSection[], names: string[]): void {
  sections.forEach((sec, idx) => {
    if (sec.rowIds.length === 0) return
    const firstRow = root.querySelector(`[${SECTION_ATTR}="${sec.rowIds[0]}"]`)
    const lastRow = root.querySelector(`[${SECTION_ATTR}="${sec.rowIds[sec.rowIds.length - 1]}"]`)
    if (!firstRow || !lastRow) return
    firstRow.insertAdjacentHTML('beforebegin', `<!-- SECTION:START:${names[idx]} -->`)
    lastRow.insertAdjacentHTML('afterend', `<!-- SECTION:END:${names[idx]} -->`)
  })
}

// ─────────────────────────────────────────────
// Inject placeholders — replaces mapped elements with {{KEY}} tokens, wraps the
// mapped sections in SECTION markers, and reports each field's section group.
// Receives the instrumented HTML from the client (data-mc-id + data-mc-section).
// ─────────────────────────────────────────────

export function injectPlaceholders(
  instrumentedHtml: string,
  mappings: FieldMapping[],
  sections: MappedSection[] = []
): { placeholderHtml: string; initialValues: Record<string, string>; fieldGroups: Record<string, string> } {
  const root = parseHtml(instrumentedHtml, { comment: true })
  const initialValues: Record<string, string> = {}
  const usedKeys = new Set<string>()

  // Resolve section names + each mapped field's group from the row it lives in,
  // BEFORE any attributes are stripped or content is replaced.
  const { names, byRowId } = resolveSectionNames(sections)
  const fieldGroups: Record<string, string> = {}
  for (const m of mappings) {
    const el = root.querySelector(`[data-mc-id="${m.mcId}"]`)
    const rid = el?.closest(`[${SECTION_ATTR}]`)?.getAttribute(SECTION_ATTR)
    if (rid && byRowId.has(rid)) fieldGroups[m.mcId] = byRowId.get(rid)!
  }

  // Wrap section rows in markers while data-mc-section is still present.
  injectSectionMarkers(root, sections, names)

  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i]
    // Derive the key for EVERY mapping (before the element check) so this key
    // sequence stays identical to buildEditableFields, which processes all
    // mappings — otherwise a missing element could desync field keys ↔ tokens.
    const key = deriveKey(mapping.label, i, usedKeys)
    usedKeys.add(key)

    const el = root.querySelector(`[data-mc-id="${mapping.mcId}"]`)
    if (!el) continue

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

  // Strip all instrumentation attributes; the SECTION comment markers remain.
  for (const el of root.querySelectorAll('[data-mc-id]')) {
    el.removeAttribute('data-mc-id')
  }
  for (const el of root.querySelectorAll(`[${SECTION_ATTR}]`)) {
    el.removeAttribute(SECTION_ATTR)
  }

  return { placeholderHtml: root.toString(), initialValues, fieldGroups }
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

// fieldGroups (mcId → section marker name, from injectPlaceholders) makes each
// field group under its section in the editor, matching the injected markers.
// Fields with no section fall back to the generic 'Content' group.
export function buildEditableFields(
  mappings: FieldMapping[],
  fieldGroups: Record<string, string> = {}
): TemplateFieldConfig[] {
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
      group: fieldGroups[m.mcId] ?? 'Content',
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
