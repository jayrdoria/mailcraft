// Feature asserts for the Gmail iOS dark-mode lock (pure functions, no DB). Run by the logic layer; exit 1 on failure.
// Uses the baseline HTML dump (.out/baseline/logic/html) as the corpus: every render the app produced before the lock.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findUnlockedWhiteText, lockGmailDarkMode, stripGmailDarkMode } from '@/lib/emailDarkMode'

let passed = 0
const failures: string[] = []
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) passed++
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
}

const OUT = join(process.cwd(), 'tests/regression/.out')
const CORPUS = join(OUT, 'baseline/logic/html')
const POC_F = join(process.cwd(), '../Approved Emails/X7 Casino V2/poc/dark-mode-poc-F.html')
const OWN_GRADIENT = /linear-gradient\((#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?), \1\)/g

// ── Unit cases ──
const cta = '<body><a style="display: inline-block; background-color: #c80824; color: #ffffff;">Go</a></body>'
const ctaLocked = lockGmailDarkMode(cta)
ok('cta: gradient twin', ctaLocked.includes('background-color: #c80824; background-image: linear-gradient(#c80824, #c80824);'))
ok('cta: inline-block pair', ctaLocked.includes('display: inline-block; background-color: #000000; mix-blend-mode: screen;'))
ok('cta: no unlocked white', findUnlockedWhiteText(ctaLocked).length === 0)
ok('cta: strip exact', stripGmailDarkMode(ctaLocked) === cta)

const light = '<body><td style="background-color: #ececec; color: #111111;">Dark on light</td></body>'
ok('light bg + dark text untouched', lockGmailDarkMode(light) === light)

const block = '<body><td bgcolor="#000000"><p style="color: #FFFFFF">Hi <strong>you</strong></p></td></body>'
const blockLocked = lockGmailDarkMode(block)
ok('bgcolor-only → style added', blockLocked.includes('<td bgcolor="#000000" style="background-image: linear-gradient(#000000, #000000);">'))
ok('p wrapped once (strong inside)', (blockLocked.match(/mix-blend-mode: screen/g) ?? []).length === 1)
ok('block strip exact', stripGmailDarkMode(blockLocked) === block)

const lastDecl = '<body><div style="color: #fff; background-color: #1a1b1e">x</div></body>'
const lastLocked = lockGmailDarkMode(lastDecl)
ok('last decl without ;', lastLocked.includes('background-color: #1a1b1e; background-image: linear-gradient(#1a1b1e, #1a1b1e)"'))
ok('last decl strip exact', stripGmailDarkMode(lastLocked) === lastDecl)

const existing = '<body><td style="background-color: #ff3263; background: linear-gradient(90deg, #d9d9d9 0%, #ff3263 100%); color: #ffffff">x</td></body>'
ok('existing gradient bg not twinned', !lockGmailDarkMode(existing).includes('linear-gradient(#ff3263, #ff3263)'))

const hover = '<head><style>.cta-btn:hover { background-color: #d2063e !important; }</style></head><body></body>'
const hoverLocked = lockGmailDarkMode(hover)
ok('hover twin', hoverLocked.includes('background-color: #d2063e !important; background-image: linear-gradient(#d2063e, #d2063e) !important;'))
ok('hover strip exact', stripGmailDarkMode(hoverLocked) === hover)

const tableCell = '<body><td style="color: #ffffff">Text<table><tr><td>inner</td></tr></table></td></body>'
const tableLocked = lockGmailDarkMode(tableCell)
ok('cell containing a table is not wrapped as a unit', tableLocked.startsWith('<body><td style="color: #ffffff">Text<table>'))
ok('its inner cell (inherits white) is wrapped', (tableLocked.match(/mix-blend-mode: screen/g) ?? []).length === 1)

const mso = '<body><!--[if mso]><td style="background-color:#000000;color:#ffffff">x</td><![endif]--></body>'
ok('conditional comments untouched', lockGmailDarkMode(mso) === mso)

// ── Corpus: every baseline render ──
if (!existsSync(CORPUS)) {
  failures.push(`no baseline HTML dump at ${CORPUS} — run \`npm run regress:baseline\``)
} else {
  const files = readdirSync(CORPUS).filter((f) => f.endsWith('.html'))
  let stripOk = 0
  let idem = 0
  let unlocked = 0
  const unlockedSamples: string[] = []
  for (const f of files) {
    const html = readFileSync(join(CORPUS, f), 'utf8')
    ok(`precondition ${f}: no blend / own gradients`, !/mix-blend-mode/.test(html) && !OWN_GRADIENT.test(html))
    OWN_GRADIENT.lastIndex = 0
    const locked = lockGmailDarkMode(html)
    if (stripGmailDarkMode(locked) === html) stripOk++
    else failures.push(`strip(lock(x)) !== x: ${f}`)
    if (lockGmailDarkMode(locked) === locked) idem++
    else failures.push(`not idempotent: ${f}`)
    const light = [...locked.matchAll(OWN_GRADIENT)].map((m) => m[1]).filter((hex) => {
      const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1)
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
      return (r + g + b) / 3 > 200
    })
    ok(`no light background locked: ${f}`, light.length === 0, light.join(','))
    const left = findUnlockedWhiteText(locked)
    if (left.length) {
      unlocked += left.length
      unlockedSamples.push(`${f}: ${left.slice(0, 2).join(' | ')}`)
    }
  }
  ok(`strip(lock(x)) === x for all ${files.length} renders`, stripOk === files.length)
  ok(`idempotent for all ${files.length} renders`, idem === files.length)
  ok('no white text left unlocked', unlocked === 0, `${unlocked} left, e.g. ${unlockedSamples.slice(0, 5).join(' || ')}`)

  // ── Device-approved reference: lock(V2 banner render) == POC F outside the promo cards ──
  const v2 = join(CORPUS, 'x7-casino-v2-template_en_banner_left-white.html')
  if (existsSync(POC_F) && existsSync(v2)) {
    const outsideCards = (h: string) =>
      h
        .replace(/<!-- SECTION:START:THUMBNAILS -->[\s\S]*?<!-- SECTION:END:THUMBNAILS -->/, '')
        .replace(/; background-image: linear-gradient\(#ececec, #ececec\)/g, '') // POC locked the light outer grey too
        .replace(/\s+/g, ' ')
    const mine = outsideCards(lockGmailDarkMode(readFileSync(v2, 'utf8')))
    const poc = outsideCards(readFileSync(POC_F, 'utf8'))
    ok('lock(V2) matches POC F outside the cards', mine === poc, firstDiff(mine, poc))
  } else failures.push('POC F or the V2 banner render is missing')
}

// ── Phase 3 guards: X7 V2 + Whitelist promo cards (fluid columns + 1px ring) and V2 layout lines/chips ──
for (const dir of ['x7-v2', 'x7-v2-whitelist']) {
  for (const lang of ['en', 'fr', 'de', 'it', 'es']) {
    const f = join(process.cwd(), 'data/templates/master-templates', dir, `${lang}.html`)
    const h = readFileSync(f, 'utf8')
    ok(`${dir}/${lang}: 2 fluid card columns`, (h.match(/class="promo-fluid"/g) ?? []).length === 2)
    ok(`${dir}/${lang}: ring instead of CSS border`, (h.match(/bgcolor="#2a2d3a"/g) ?? []).length === 2 && !/border:\s*1px solid #2a2d3a/i.test(h))
    ok(`${dir}/${lang}: @media keeps the old stacked look`, h.includes('.promo-fluid {') && h.includes('.promo-gutter {'))
    ok(`${dir}/${lang}: card tokens intact`, ['1', '2'].every((n) => ['IMG', 'LINK', 'LABEL', 'SUBLABEL'].every((k) => h.includes(`{{THUMB${n}_${k}}}`))))
  }
}
const layouts = readFileSync(join(process.cwd(), 'lib/v2Layouts.ts'), 'utf8')
ok('v2Layouts: no dark CSS borders on chips / step lines', !/border(?:-top|-bottom)?:\s*1px solid (?:#2e3038|\$\{LINE\})/.test(layouts))

function firstDiff(a: string, b: string): string {
  let i = 0
  while (i < a.length && a[i] === b[i]) i++
  return i >= a.length && i >= b.length ? '' : `at ${i}: mine «${a.slice(i - 40, i + 80)}» vs poc «${b.slice(i - 40, i + 80)}»`
}

if (failures.length) {
  failures.slice(0, 20).forEach((f) => console.error(`  FAIL ${f}`))
  console.error(`dark-mode asserts: ${passed} passed, ${failures.length} failed`)
  process.exit(1)
}
console.log(`dark-mode asserts: ${passed} passed`)
