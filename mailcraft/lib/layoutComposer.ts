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

export function composeLayout(
  html: string,
  layoutOrder: LayoutOrder | null | undefined,
  renderedBlocks: Record<string, string> = {}
): string {
  if (!layoutOrder || layoutOrder.length === 0) return html

  const matches = findSections(html)
  if (matches.length === 0) return html

  const first = matches[0].start
  const last = matches[matches.length - 1].end
  const preamble = html.slice(0, first)
  const postamble = html.slice(last)

  const sectionMap = new Map(matches.map((s) => [s.name, s.full]))
  const used = new Set<string>()
  const parts: string[] = []

  for (const item of layoutOrder) {
    if (item.kind === 'section') {
      const block = sectionMap.get(item.name)
      if (block && !used.has(item.name)) {
        parts.push(block)
        used.add(item.name)
      }
    } else {
      const rendered = renderedBlocks[item.id]
      if (rendered) parts.push(rendered)
    }
  }

  // Safety net: never drop a master section that wasn't referenced in layoutOrder.
  for (const s of matches) {
    if (!used.has(s.name)) parts.push(s.full)
  }

  return preamble + '\n' + parts.join('\n') + '\n' + postamble
}
