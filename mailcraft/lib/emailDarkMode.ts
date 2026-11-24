// ─────────────────────────────────────────────
// GMAIL iOS DARK-MODE LOCK — keeps the export looking exactly as designed in the
// Gmail iPhone app, whose dark mode inverts inline colours (black → white,
// white text → black, red → salmon). Device-verified 2026-11-19, reference POC:
// Approved Emails/X7 Casino V2/poc/dark-mode-poc-F.html
//
//  · Backgrounds: Gmail leaves gradients alone, so every DARK background colour
//    (luminance ≤ 0.3) gets a one-colour `linear-gradient(C, C)` twin. Light
//    backgrounds are left alone (dark text on them can't be protected).
//  · White text: wrapped in two inline spans — black bg + mix-blend-mode screen >
//    difference. Gmail's inversion cancels itself out; in every other client the
//    blend is an identity. Only white survives the maths, so only white is locked.
//    The wrappers are hidden from Outlook (Word paints span backgrounds, no blending).
//  · Lists: the whole <ul>/<ol> is wrapped (in divs) instead of each <li>'s content —
//    a block wrapper inside a `list-style-position: inside` item pushes the text below
//    its marker, and wrapping the list also locks the white markers (2026-11-24).
//
// Byte-preserving: the original HTML is never re-serialised, only insertions are
// made — stripGmailDarkMode() removes exactly those, which is how the regression
// suite proves nothing else changed. Pure string work, shared by every export.
// ─────────────────────────────────────────────

const NOT_MSO_OPEN = '<!--[if !mso]><!-->'
const NOT_MSO_CLOSE = '<!--<![endif]-->'

type PairDisplay = 'block' | 'inline-block'

const pairOpen = (d: PairDisplay) =>
  `${NOT_MSO_OPEN}<span style="display: ${d}; background-color: #000000; mix-blend-mode: screen;">` +
  `<span style="display: ${d}; background-color: #000000; mix-blend-mode: difference;">${NOT_MSO_CLOSE}`
const PAIR_CLOSE = `${NOT_MSO_OPEN}</span></span>${NOT_MSO_CLOSE}`
const LIST_PAIR_OPEN =
  `${NOT_MSO_OPEN}<div style="display: block; background-color: #000000; mix-blend-mode: screen;">` +
  `<div style="display: block; background-color: #000000; mix-blend-mode: difference;">${NOT_MSO_CLOSE}`
const LIST_PAIR_CLOSE = `${NOT_MSO_OPEN}</div></div>${NOT_MSO_CLOSE}`
const LIST_TAGS = new Set(['ul', 'ol'])

const gradient = (hex: string) => `background-image: linear-gradient(${hex}, ${hex})`

const HEX = '#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?'
const BG_DECL_RE = new RegExp(`(^|[;\\s"])background(?:-color)?\\s*:\\s*(${HEX})\\s*(!important)?\\s*(;?)`, 'i')
const COLOR_DECL_RE = new RegExp(`(?:^|[;\\s])color\\s*:\\s*(${HEX}|white)\\s*(?:!important)?\\s*(?:;|$)`, 'i')

function relativeLuminance(hex: string): number {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const isDark = (hex: string) => relativeLuminance(hex) <= 0.3
const isWhite = (c: string) => c.toLowerCase() === 'white' || relativeLuminance(c) >= 0.9

// ─────────────────────────────────────────────
// Tokenizer — comments, tags and text, in order, with offsets into the source
// ─────────────────────────────────────────────

interface Token {
  kind: 'comment' | 'open' | 'close' | 'text'
  start: number
  end: number
  tag?: string
  raw: string
}

const RAW_TEXT = new Set(['style', 'script', 'title', 'textarea'])
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])

function tokenize(html: string, from: number): Token[] {
  const tokens: Token[] = []
  const re = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g
  re.lastIndex = from
  let last = from
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m.index > last) tokens.push({ kind: 'text', start: last, end: m.index, raw: html.slice(last, m.index) })
    const raw = m[0]
    const end = m.index + raw.length
    if (raw.startsWith('<!--')) tokens.push({ kind: 'comment', start: m.index, end, raw })
    else if (raw.startsWith('</')) tokens.push({ kind: 'close', start: m.index, end, raw, tag: raw.slice(2).split(/[\s>]/)[0].toLowerCase() })
    else {
      const tag = raw.slice(1).split(/[\s>/]/)[0].toLowerCase()
      tokens.push({ kind: 'open', start: m.index, end, raw, tag })
      if (RAW_TEXT.has(tag)) {
        const close = html.toLowerCase().indexOf(`</${tag}`, end)
        if (close === -1) break
        re.lastIndex = close
      }
    }
    last = re.lastIndex
  }
  if (last < html.length) tokens.push({ kind: 'text', start: last, end: html.length, raw: html.slice(last) })
  return tokens
}

function attr(tagRaw: string, name: string): { value: string; start: number } | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tagRaw)
  if (!m) return null
  return { value: m[1], start: m.index + m[0].indexOf('"') + 1 }
}

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'center', 'blockquote'])
const TABLE_TAGS = new Set(['table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th'])

function displayOf(tag: string, style: string): 'block' | 'inline-block' | 'inline' {
  const d = /(?:^|[;\s])display\s*:\s*([a-z-]+)/i.exec(style)?.[1]?.toLowerCase()
  if (d === 'inline-block') return 'inline-block'
  if (d === 'block' || d === 'table-cell' || d === 'list-item') return 'block'
  if (d === 'inline') return 'inline'
  return BLOCK_TAGS.has(tag) ? 'block' : 'inline'
}

interface Insertion {
  at: number
  text: string
  order: number // ties: closes before opens at the same offset
}

// Background twin for one start tag (style background colour, or a bgcolor-only element)
function backgroundInsertion(tok: Token): Insertion | null {
  const style = attr(tok.raw, 'style')
  if (style) {
    if (/mix-blend-mode/i.test(style.value)) return null // our own wrappers
    if (/background-image|gradient\(|url\(/i.test(style.value)) return null // already an image/gradient
    const m = BG_DECL_RE.exec(style.value)
    if (m) {
      const hex = m[2]
      if (!isDark(hex)) return null
      const important = m[3] ? ' !important' : ''
      const declEnd = m.index + m[0].length
      // `…: C;` → `…: C; background-image: …;`  ·  last declaration without `;` → `…: C; background-image: …`
      const text = m[4] ? ` ${gradient(hex)}${important};` : `; ${gradient(hex)}${important}`
      return { at: tok.start + style.start + declEnd, text, order: 1 }
    }
  }
  const bgcolor = attr(tok.raw, 'bgcolor')
  if (!bgcolor || !new RegExp(`^${HEX}$`).test(bgcolor.value.trim()) || !isDark(bgcolor.value.trim())) return null
  const hex = bgcolor.value.trim()
  if (!style) {
    const tagEnd = tok.raw.endsWith('/>') ? tok.raw.length - 2 : tok.raw.length - 1
    return { at: tok.start + tagEnd, text: ` style="${gradient(hex)};"`, order: 1 }
  }
  const trimmed = style.value.trimEnd()
  const at = tok.start + style.start + trimmed.length
  if (trimmed === '' || trimmed.endsWith(';')) return { at, text: ` ${gradient(hex)};`, order: 1 }
  return { at, text: `; ${gradient(hex)}`, order: 1 }
}

interface Frame {
  tag: string
  color: string | null // effective text colour
  display: 'block' | 'inline-block' | 'inline'
  openStart: number // offset of the start tag
  openEnd: number // offset right after the start tag
  locked: boolean // inside one of our wrappers already
  hasWhiteText: boolean // has white text whose nearest block/inline-block ancestor is this element
  hasTable: boolean // contains table structure (can't be wrapped as a unit)
  hasWrapChild: boolean // a descendant is itself wrapped (avoid nested wrappers)
  hasWhiteItem: boolean // <ul>/<ol>: one of its <li> has white text → wrap the whole list
}

/** Lock an exported email against Gmail iOS dark-mode inversion. Idempotent, insertions only. */
export function lockGmailDarkMode(html: string): string {
  const insertions: Insertion[] = []

  // 1. :hover rules in <style> blocks — keep hover colours over the gradient twin
  html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (block, css: string, offset: number) => {
    const cssStart = offset + block.indexOf(css)
    css.replace(/([^{}]*:hover[^{}]*)\{([^{}]*)\}/g, (rule, _sel: string, body: string, ruleOffset: number) => {
      if (/background-image|gradient\(/i.test(body)) return rule
      const m = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)\s*(!important)?\s*;/i.exec(body)
      if (m && isDark(m[1])) {
        const bodyStart = cssStart + ruleOffset + rule.indexOf('{') + 1
        insertions.push({ at: bodyStart + m.index + m[0].length, text: ` ${gradient(m[1])}${m[2] ? ' !important' : ''};`, order: 1 })
      }
      return rule
    })
    return block
  })

  // 2. Body: background twins + white-text wrappers
  const bodyAt = html.search(/<body\b/i)
  const tokens = tokenize(html, bodyAt === -1 ? 0 : bodyAt)
  const stack: Frame[] = [
    { tag: '#root', color: null, display: 'block', openStart: 0, openEnd: 0, locked: false, hasWhiteText: false, hasTable: false, hasWrapChild: false, hasWhiteItem: false },
  ]

  const nearestTarget = (): Frame => {
    for (let i = stack.length - 1; i > 0; i--) if (stack[i].display !== 'inline') return stack[i]
    return stack[0]
  }

  // closeEnd = offset after the element's own close tag (closeStart when it was closed implicitly)
  const closeFrame = (frame: Frame, closeStart: number, closeEnd = closeStart) => {
    const parent = stack[stack.length - 1]
    if (frame.hasTable || TABLE_TAGS.has(frame.tag)) parent.hasTable = true
    // A list item's white text is locked by wrapping its whole list (see header)
    if (frame.tag === 'li' && LIST_TAGS.has(parent.tag) && frame.hasWhiteText && !frame.hasWrapChild) {
      parent.hasWhiteItem = true
      return
    }
    if (LIST_TAGS.has(frame.tag) && frame.hasWhiteItem && !frame.locked && !frame.hasTable && !frame.hasWrapChild) {
      insertions.push({ at: frame.openStart, text: LIST_PAIR_OPEN, order: 2 })
      insertions.push({ at: closeEnd, text: LIST_PAIR_CLOSE, order: 0 })
      parent.hasWrapChild = true
      return
    }
    const wrap = frame.hasWhiteText && !frame.locked && !frame.hasTable && !frame.hasWrapChild && frame.tag !== '#root'
    if (wrap) {
      const d: PairDisplay = frame.display === 'inline-block' ? 'inline-block' : 'block'
      insertions.push({ at: frame.openEnd, text: pairOpen(d), order: 2 })
      insertions.push({ at: closeStart, text: PAIR_CLOSE, order: 0 })
    }
    if (wrap || frame.hasWrapChild) parent.hasWrapChild = true
  }

  for (const tok of tokens) {
    if (tok.kind === 'comment') continue
    if (tok.kind === 'text') {
      const top = stack[stack.length - 1]
      if (!top.locked && tok.raw.trim() !== '' && top.color && isWhite(top.color)) nearestTarget().hasWhiteText = true
      continue
    }
    if (tok.kind === 'close') {
      const idx = stack.map((f) => f.tag).lastIndexOf(tok.tag!)
      if (idx <= 0) continue
      while (stack.length > idx) {
        const frame = stack.pop()!
        closeFrame(frame, tok.start, stack.length === idx ? tok.end : tok.start)
      }
      continue
    }
    // open tag
    const bg = backgroundInsertion(tok)
    if (bg) insertions.push(bg)
    const tag = tok.tag!
    if (VOID.has(tag) || tok.raw.endsWith('/>')) continue
    const style = attr(tok.raw, 'style')?.value ?? ''
    const parent = stack[stack.length - 1]
    const own = COLOR_DECL_RE.exec(style)?.[1] ?? null
    const ours = /mix-blend-mode/i.test(style)
    stack.push({
      tag,
      color: own ?? parent.color,
      display: displayOf(tag, style),
      openStart: tok.start,
      openEnd: tok.end,
      locked: parent.locked || ours,
      hasWhiteText: false,
      hasTable: false,
      hasWrapChild: false,
      hasWhiteItem: false,
    })
    if (ours) parent.hasWrapChild = true // already locked content — never wrap around it again
  }
  while (stack.length > 1) closeFrame(stack.pop()!, html.length)

  if (insertions.length === 0) return html
  insertions.sort((a, b) => a.at - b.at || a.order - b.order)
  let out = ''
  let cursor = 0
  for (const ins of insertions) {
    out += html.slice(cursor, ins.at) + ins.text
    cursor = ins.at
  }
  return out + html.slice(cursor)
}

/** Exact inverse of lockGmailDarkMode — used by the regression suite to prove insertions are all that changed. */
export function stripGmailDarkMode(html: string): string {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return html
    .replace(new RegExp(esc(pairOpen('block')), 'g'), '')
    .replace(new RegExp(esc(pairOpen('inline-block')), 'g'), '')
    .replace(new RegExp(esc(PAIR_CLOSE), 'g'), '')
    .replace(new RegExp(esc(LIST_PAIR_OPEN), 'g'), '')
    .replace(new RegExp(esc(LIST_PAIR_CLOSE), 'g'), '')
    .replace(new RegExp(` style="background-image: linear-gradient\\((${HEX}), \\1\\);"`, 'g'), '')
    .replace(new RegExp(` background-image: linear-gradient\\((${HEX}), \\1\\)( !important)?;`, 'g'), '')
    .replace(new RegExp(`; background-image: linear-gradient\\((${HEX}), \\1\\)( !important)?(?=\\s*")`, 'g'), '')
}

/** White text that would still invert in Gmail iOS (not inside a lock wrapper) — regression audit helper. */
export function findUnlockedWhiteText(html: string): string[] {
  const bodyAt = html.search(/<body\b/i)
  const found: string[] = []
  const stack: { tag: string; color: string | null; locked: boolean }[] = [{ tag: '#root', color: null, locked: false }]
  for (const tok of tokenize(html, bodyAt === -1 ? 0 : bodyAt)) {
    const top = stack[stack.length - 1]
    if (tok.kind === 'text') {
      if (!top.locked && tok.raw.trim() !== '' && top.color && isWhite(top.color)) found.push(tok.raw.trim().slice(0, 60))
    } else if (tok.kind === 'close') {
      const idx = stack.map((f) => f.tag).lastIndexOf(tok.tag!)
      if (idx > 0) stack.length = idx
    } else if (tok.kind === 'open' && !VOID.has(tok.tag!) && !tok.raw.endsWith('/>')) {
      const style = attr(tok.raw, 'style')?.value ?? ''
      stack.push({
        tag: tok.tag!,
        color: COLOR_DECL_RE.exec(style)?.[1] ?? top.color,
        locked: top.locked || /mix-blend-mode:\s*difference/i.test(style),
      })
    }
  }
  return found
}
