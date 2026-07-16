// ─────────────────────────────────────────────
// EDITOR CANVAS RENDER — a preview-only variant of the export render used by the
// interactive live preview (Phase 4). Identical composition to clientRender, plus:
//   - each custom block's outer <tr> is tagged with data-mcb-id="<id>" so the
//     in-iframe interaction script can identify / select / drag it
//   - (Phase 4b) drop-zone rows are inserted between layout items
//
// These attributes never reach an export — exports go through the server render
// path (renderService), which has no knowledge of this module.
// ─────────────────────────────────────────────

import type { LayoutOrder, CustomBlock } from '@/lib/types/blocks'
import type { SavedSectionConfig, FieldValue, Language } from '@/lib/types/template'
import type { BodyAlignment } from '@/lib/paragraphRenderer'
import { renderBlocksById } from '@/lib/services/blockRenderer'
import { buildSectionUnits } from '@/lib/layoutComposer'
import { applySectionConfig, injectTokens } from '@/lib/clientRender'

// Attribute name used to identify a block element inside the preview iframe.
export const MCB_ID_ATTR = 'data-mcb-id'

// Attribute name used to identify a master section's leading <tr> inside the
// preview iframe, so the whole section can be pointer-dragged to reorder (Phase 5).
export const MCB_SECTION_ATTR = 'data-mcb-section'

// Tag the first <tr> of a rendered block with its id (block renderers always
// emit a <tr> as the outermost element — see blockRenderer).
function tagBlock(html: string, id: string): string {
  return html.replace('<tr', `<tr ${MCB_ID_ATTR}="${id}"`)
}

// Tag a section unit's first <tr> with its section name. Sections are groups of
// sibling <tr> rows led by a SECTION:START comment; the leading row carries the
// drag handle. If a unit has no <tr> (unusual) it simply isn't draggable.
function tagSection(unit: string, name: string): string {
  return unit.replace('<tr', `<tr ${MCB_SECTION_ATTR}="${name}"`)
}

// A collapsed drop-zone row. Invisible (0 height) until the iframe script adds
// `body.mcb-dragging`, at which point CSS reveals it. data-mcb-drop carries the
// layoutOrder index to insert at. It's a <tr> so it's a valid <tbody> sibling of
// the section/block rows.
function dropZone(index: number): string {
  return `<tr class="mcb-dz" data-mcb-drop="${index}"><td class="mcb-dz-td"><div class="mcb-dz-line"></div></td></tr>`
}

// Compose the layout like composeLayout, but tag block rows and interleave
// drop-zone rows (before each item + one at the end) for the interactive canvas.
function composeEditorLayout(
  html: string,
  layoutOrder: LayoutOrder,
  renderedBlocks: Record<string, string>
): string {
  const units = buildSectionUnits(html)
  if (!layoutOrder.length || !units) return html

  const { preamble, postamble, unitMap, order } = units
  const used = new Set<string>()
  const parts: string[] = []

  layoutOrder.forEach((item, i) => {
    parts.push(dropZone(i)) // insertion point before item i
    if (item.kind === 'section') {
      const unit = unitMap.get(item.name)
      if (unit !== undefined && !used.has(item.name)) {
        parts.push(tagSection(unit, item.name))
        used.add(item.name)
      }
    } else {
      const rendered = renderedBlocks[item.id]
      if (rendered) parts.push('\n' + tagBlock(rendered, item.id) + '\n')
    }
  })
  parts.push(dropZone(layoutOrder.length)) // append point

  // Safety net: never drop a master section missing from layoutOrder.
  for (const name of order) {
    if (!used.has(name)) parts.push(unitMap.get(name)!)
  }

  return preamble + parts.join('') + postamble
}

// ─────────────────────────────────────────────
// FIELD TAGGING (editor-only) — mark each editable field's rendered element with
// data-mc-field="KEY" so the preview can highlight the field being edited. Runs
// BEFORE token injection (while {{KEY}} markers are still present). Two contexts:
//   - token inside a tag's attribute (img src / a href) → tag that element
//   - token in text position → wrap the value in a span (or div for block
//     paragraph values) that carries the attribute
// Pure string work; never runs on the export path, so tags never leak.
// ─────────────────────────────────────────────

const FIELD_TOKEN_RE = /\{\{([A-Z0-9_]+)\}\}/g

export function tagFieldElements(html: string, fieldValues: Record<string, FieldValue>): string {
  // Pass A — opening tags whose attributes contain a token: add data-mc-field.
  let out = html.replace(/<([a-zA-Z][\w-]*)([^<>]*?)>/g, (tag, name, attrs) => {
    const m = /\{\{([A-Z0-9_]+)\}\}/.exec(attrs)
    if (!m) return tag
    return `<${name} data-mc-field="${m[1]}"${attrs}>`
  })

  // Pass B — remaining tokens in text position: wrap. Skip tokens still inside a
  // tag (attribute tokens handled above) to avoid corrupting markup.
  out = out.replace(FIELD_TOKEN_RE, (match, key, offset: number, str: string) => {
    const insideTag = str.lastIndexOf('<', offset) > str.lastIndexOf('>', offset)
    if (insideTag) return match
    const el = Array.isArray(fieldValues[key]) ? 'div' : 'span'
    return `<${el} data-mc-field="${key}">${match}</${el}>`
  })

  return out
}

// Full instrumented preview render (mirrors clientRender + block tagging).
export function renderEditorCanvas(
  masterPreviewHtml: string,
  fieldValues: Record<string, FieldValue>,
  sectionConfig: SavedSectionConfig[],
  brand: string,
  alignment: BodyAlignment,
  customBlocks: CustomBlock[],
  layoutOrder: LayoutOrder,
  lang: Language
): string {
  const rendered = renderBlocksById(customBlocks, lang, { brand, sanitize: false })
  let html = composeEditorLayout(masterPreviewHtml, layoutOrder, rendered)
  html = applySectionConfig(html, sectionConfig)
  html = tagFieldElements(html, fieldValues) // editor-only: mark fields for highlight
  html = injectTokens(html, fieldValues, brand, alignment)
  return html
}
