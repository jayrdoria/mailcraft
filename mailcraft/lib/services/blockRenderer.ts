// ─────────────────────────────────────────────
// BLOCK RENDERER — turns a CustomBlock into email-safe HTML.
//
// Sections in master templates are groups of <tr> rows inside a shared <tbody>
// (max-width ~560px). Blocks are injected BETWEEN sections, so every block must
// render as one <tr>…</tr> row to remain a valid sibling. Do not emit a bare
// <table> or <div> at the top level of a block.
//
// Sanitization mirrors renderService.injectEditableTokens:
//   - text (richtext html)  → injected as-is (trusted rich-text editor output)
//   - image src / links     → sanitizeUrl (http/https only)
//   - alt / button label    → escapeHtml
// On the client preview path sanitize=false (matches existing clientRender,
// which injects raw values); on the server export path sanitize=true.
// ─────────────────────────────────────────────

import type { CustomBlock, BlockContent, BlockProps } from '@/lib/types/blocks'
import type { Language } from '@/lib/types/template'
import { escapeHtml, sanitizeUrl } from '@/lib/utils/escapeHtml'

// Matches the master content table max-width; images are clamped to this.
const CONTENT_WIDTH = 560

export interface RenderBlockOptions {
  brand?: string
  sanitize?: boolean
}

// ── helpers ──────────────────────────────────

function fontFamily(brand?: string): string {
  return brand === 'X7' ? "'Open Sans', sans-serif" : 'Roboto, sans-serif'
}

// Resolve per-language content, falling back to 'en' then empty.
function contentFor(block: CustomBlock, lang: Language): BlockContent {
  return block.content[lang] ?? block.content.en ?? {}
}

function safeUrl(value: string | undefined, sanitize?: boolean): string {
  const v = value ?? ''
  return sanitize ? sanitizeUrl(v) : v
}

function safeText(value: string | undefined, sanitize?: boolean): string {
  const v = value ?? ''
  return sanitize ? escapeHtml(v) : v
}

function paddingStyle(p: BlockProps): string {
  const pt = p.paddingTop ?? 16
  const pb = p.paddingBottom ?? 16
  return `padding:${pt}px 24px ${pb}px 24px;`
}

function bgStyle(p: BlockProps): string {
  return p.backgroundColor ? `background-color:${p.backgroundColor};` : ''
}

// ── per-type renderers ───────────────────────

function renderText(block: CustomBlock, lang: Language, opts: RenderBlockOptions): string {
  const c = contentFor(block, lang)
  const p = block.props
  const align = p.align ?? 'center'
  const size = p.fontSize ?? 15
  const color = p.textColor ?? '#ffffff'
  const font = fontFamily(opts.brand)
  const inner = c.html ?? '' // richtext — injected as-is
  return `<tr><td align="${align}" style="${paddingStyle(p)}${bgStyle(p)}">` +
    `<div style="font-family:${font};font-size:${size}px;color:${color};line-height:1.5;text-align:${align};">${inner}</div>` +
    `</td></tr>`
}

function renderImage(block: CustomBlock, lang: Language, opts: RenderBlockOptions): string {
  const c = contentFor(block, lang)
  const p = block.props
  const align = p.align ?? 'center'
  const width = Math.min(p.width ?? CONTENT_WIDTH, CONTENT_WIDTH)
  const src = safeUrl(c.src, opts.sanitize)
  const alt = safeText(c.alt, opts.sanitize)
  const href = safeUrl(c.href, opts.sanitize)
  const marginAuto = align === 'center' ? 'margin:0 auto;' : ''
  const img = `<img src="${src}" alt="${alt}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;${marginAuto}" />`
  const wrapped = href ? `<a href="${href}" target="_blank">${img}</a>` : img
  return `<tr><td align="${align}" style="${paddingStyle(p)}${bgStyle(p)}">${wrapped}</td></tr>`
}

function renderButton(block: CustomBlock, lang: Language, opts: RenderBlockOptions): string {
  const c = contentFor(block, lang)
  const p = block.props
  const align = p.align ?? 'center'
  const btnColor = p.buttonColor ?? '#ef5e5e'
  const txtColor = p.buttonTextColor ?? '#ffffff'
  const radius = p.borderRadius ?? 4
  const font = fontFamily(opts.brand)
  const label = safeText(c.label, opts.sanitize)
  const href = safeUrl(c.href, opts.sanitize)
  const margin = align === 'center' ? '0 auto' : '0'
  return `<tr><td align="${align}" style="${paddingStyle(p)}${bgStyle(p)}">` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:${margin};"><tr>` +
    `<td align="center" bgcolor="${btnColor}" style="border-radius:${radius}px;">` +
    `<a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:${font};font-size:15px;font-weight:700;color:${txtColor};text-decoration:none;border-radius:${radius}px;">${label}</a>` +
    `</td></tr></table></td></tr>`
}

function renderDivider(block: CustomBlock): string {
  const p = block.props
  const color = p.lineColor ?? '#333333'
  const thickness = p.lineThickness ?? 1
  return `<tr><td style="${paddingStyle(p)}${bgStyle(p)}">` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="border-top:${thickness}px solid ${color};font-size:0;line-height:0;">&nbsp;</td>` +
    `</tr></table></td></tr>`
}

function renderSpacer(block: CustomBlock): string {
  const p = block.props
  const h = p.height ?? 24
  return `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;${bgStyle(p)}">&nbsp;</td></tr>`
}

// ── public API ───────────────────────────────

export function renderBlock(block: CustomBlock, lang: Language, opts: RenderBlockOptions = {}): string {
  switch (block.type) {
    case 'text':    return renderText(block, lang, opts)
    case 'image':   return renderImage(block, lang, opts)
    case 'button':  return renderButton(block, lang, opts)
    case 'divider': return renderDivider(block)
    case 'spacer':  return renderSpacer(block)
    case 'columns': return '' // Phase 9 — not yet rendered
    default:        return ''
  }
}

// Render every block once, keyed by id, for a given language.
// composeLayout looks blocks up by id as it walks the layout order.
export function renderBlocksById(
  blocks: CustomBlock[],
  lang: Language,
  opts: RenderBlockOptions = {}
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const block of blocks) {
    map[block.id] = renderBlock(block, lang, opts)
  }
  return map
}
