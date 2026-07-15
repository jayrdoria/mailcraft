// ─────────────────────────────────────────────
// LAYOUT COMPOSER — pure string logic shared by the server render path
// (renderService) and the client preview (clientRender). No node-only deps,
// so it is safe to import in the browser.
//
// Given master HTML that still contains <!-- SECTION:START/END:NAME --> markers,
// composeLayout rebuilds the section region in the order described by layoutOrder,
// injecting pre-rendered custom-block HTML at the requested positions. Section
// markers are preserved so downstream delete/clean steps keep working.
// ─────────────────────────────────────────────

import type { LayoutOrder } from '@/lib/types/blocks'

// Active section block: <!-- SECTION:START:NAME --> … <!-- SECTION:END:NAME -->
const SECTION_BLOCK_RE = /<!-- SECTION:START:(\w+) -->[\s\S]*?<!-- SECTION:END:\1 -->/g

interface SectionMatch {
  name: string
  full: string
  start: number
  end: number
}

function findSections(html: string): SectionMatch[] {
  const re = new RegExp(SECTION_BLOCK_RE.source, 'g')
  const matches: SectionMatch[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    matches.push({ name: m[1], full: m[0], start: m.index, end: m.index + m[0].length })
  }
  return matches
}

// ─────────────────────────────────────────────
// Default layout: master sections in source order, no custom blocks.
// Used when a saved template has no stored layoutOrder (legacy templates).
// ─────────────────────────────────────────────

export function deriveDefaultLayout(html: string): LayoutOrder {
  const seen = new Set<string>()
  const items: LayoutOrder = []
  for (const s of findSections(html)) {
    if (!seen.has(s.name)) {
      items.push({ kind: 'section', name: s.name })
      seen.add(s.name)
    }
  }
  return items
}

// ─────────────────────────────────────────────
// Compose the email body from layoutOrder.
// renderedBlocks: block id → email-safe HTML (see blockRenderer.renderBlocksById)
//
// Backward compatible:
//   - empty/absent layoutOrder            → html returned unchanged
//   - HTML with no section markers        → html returned unchanged (can't place)
//   - master sections missing from order  → appended in source order (never dropped)
//   - layout referencing an unknown block → skipped
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Section units — from each section's START up to (but not including) the next
// section's START, so inter-section content (dividers, spacers that live BETWEEN
// markers) travels with the preceding section and is never dropped. The last
// section's unit ends at its own END; whatever follows is postamble. In source
// order these reconstruct the original byte-for-byte.
//
// Shared by composeLayout (server + client export) and the editor canvas
// (editorCanvas.ts) so the placement logic never drifts between the two.
// ─────────────────────────────────────────────

export interface SectionUnits {
  preamble: string
  postamble: string
  unitMap: Map<string, string>
  order: string[] // section names in source order
}

export function buildSectionUnits(html: string): SectionUnits | null {
  const matches = findSections(html)
  if (matches.length === 0) return null

  const preamble = html.slice(0, matches[0].start)
  const postamble = html.slice(matches[matches.length - 1].end)

  const unitMap = new Map<string, string>()
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start
    const unitEnd = i < matches.length - 1 ? matches[i + 1].start : matches[i].end
    unitMap.set(matches[i].name, html.slice(start, unitEnd))
  }

  return { preamble, postamble, unitMap, order: matches.map((m) => m.name) }
}

export function composeLayout(
  html: string,
  layoutOrder: LayoutOrder | null | undefined,
  renderedBlocks: Record<string, string> = {}
): string {
  if (!layoutOrder || layoutOrder.length === 0) return html

  const units = buildSectionUnits(html)
  if (!units) return html

  const { preamble, postamble, unitMap, order } = units
  const used = new Set<string>()
  const parts: string[] = []

  for (const item of layoutOrder) {
    if (item.kind === 'section') {
      const unit = unitMap.get(item.name)
      if (unit !== undefined && !used.has(item.name)) {
        parts.push(unit)
        used.add(item.name)
      }
    } else {
      const rendered = renderedBlocks[item.id]
      if (rendered) parts.push('\n' + rendered + '\n')
    }
  }

  // Safety net: never drop a master section that wasn't referenced in layoutOrder.
  for (const name of order) {
    if (!used.has(name)) parts.push(unitMap.get(name)!)
  }

  return preamble + parts.join('') + postamble
}
