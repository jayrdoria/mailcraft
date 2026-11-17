// Feature asserts for master links (2026-11-17 link-admin ticket): per-language locked links, link
// snapshots (old templates frozen, new ones take current links) and the D7 duplicate refresh.
// Pure functions + one read-only master render. Run by the logic layer; exit 1 on failure.
import { lockedTokensFor, lockedValue } from '@/lib/lockedFields'
import { currentLockedFields, effectiveLockedFields, refreshStaleDefaults } from '@/lib/masterLinks'
import { renderTemplate } from '@/lib/services/renderService'
import { LinkEditError, applyLinkEdits, isSafeLink, listLinkSlots } from '@/lib/services/masterLinkService'
import { prisma } from '@/lib/prisma'
import { X7_V2_WL_SLUG, toWhitelistLinks } from '@/prisma/templates/x7v2Whitelist'
import type {
  Language,
  LockedFieldConfig,
  MultiLanguageFieldValues,
  TemplateFieldConfig,
} from '@/lib/types/template'

let passed = 0
const failures: string[] = []
const eq = (name: string, actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed++
  else failures.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

// ── Per-language locked values ──
const logo: LockedFieldConfig = {
  key: 'L', label: 'L', value: 'https://a.com/rg', values: { fr: 'https://b.com/rg' }, isReadOnly: false,
}
eq('lockedValue override', lockedValue(logo, 'fr'), 'https://b.com/rg')
eq('lockedValue fallback', lockedValue(logo, 'frca'), 'https://a.com/rg')
eq('lockedValue no values', lockedValue({ ...logo, values: undefined }, 'fr'), 'https://a.com/rg')
eq('lockedTokensFor', lockedTokensFor([logo], 'de'), { L: 'https://a.com/rg' })

// ── Snapshots: old templates frozen, new ones current ──
const base = [{ ...logo, value: 'https://old.com' }]
const cur = [{ ...logo, value: 'https://new.com' }]
eq('legacy saved → baseline', effectiveLockedFields({ lockedFieldsSnapshot: null }, { lockedFields: base, currentLockedFields: cur }), base)
eq('snapshot wins', effectiveLockedFields({ lockedFieldsSnapshot: cur }, { lockedFields: base }), cur)
eq('current → admin links', currentLockedFields({ lockedFields: base, currentLockedFields: cur }), cur)
eq('current → baseline when unset', currentLockedFields({ lockedFields: base, currentLockedFields: null }), base)
eq('imported master (no locked)', currentLockedFields({ lockedFields: [] }), [])

// ── D7: duplicate refresh ──
const fields = [
  { key: 'LOGO_LINK', label: 'Logo', type: 'url', defaultValues: { en: 'https://x7casino.io/new', fr: 'https://x7casino.io/new-fr' } },
  { key: 'FORGOT_LINK', label: 'Forgot', type: 'url', defaultValue: 'https://x7casino.io/forgot-new' },
  { key: 'CTA_LINK', label: 'CTA', type: 'url', defaultValue: 'https://x7casino.io/cta' },
] as TemplateFieldConfig[]
const history = {
  LOGO_LINK: { en: ['https://x7casino.io/old'], fr: ['https://x7casino.io/old-fr'] },
  FORGOT_LINK: { '*': ['https://x7casino.io/forgot-old'] },
}
const vals = {
  en: { LOGO_LINK: 'https://x7casino.io/old', FORGOT_LINK: 'https://x7casino.io/forgot-old', CTA_LINK: 'https://typed.example/promo', _bodyAlignment: 'left' },
  fr: { LOGO_LINK: 'https://user-typed.example/fr', FORGOT_LINK: 'https://x7casino.io/forgot-old' },
} as unknown as MultiLanguageFieldValues
const refreshed = refreshStaleDefaults(vals, fields, history)
eq('D7 stale per-lang default → current', refreshed.en.LOGO_LINK, 'https://x7casino.io/new')
eq('D7 stale single default → current (en)', refreshed.en.FORGOT_LINK, 'https://x7casino.io/forgot-new')
eq('D7 stale single default → current (fr)', refreshed.fr.FORGOT_LINK, 'https://x7casino.io/forgot-new')
eq('D7 typed link kept', refreshed.fr.LOGO_LINK, 'https://user-typed.example/fr')
eq('D7 field without history kept', refreshed.en.CTA_LINK, 'https://typed.example/promo')
eq('D7 meta keys kept', refreshed.en._bodyAlignment, 'left')
eq('D7 source not mutated', vals.en.LOGO_LINK, 'https://x7casino.io/old')
eq('D7 no history → same object', refreshStaleDefaults(vals, fields, null) === vals, true)
eq('D7 nothing stale → same object', refreshStaleDefaults(vals, fields, { CTA_LINK: { en: ['https://nope'] } }) === vals, true)

// ── Admin → Links service (pure) ──
const lm = {
  languages: ['en', 'fr', 'de'],
  editableFields: [
    { key: 'LOGO_LINK', label: 'Logo', type: 'url', defaultValue: 'https://x7casino.io' },
    { key: 'BANNER_IMG', label: 'Banner', type: 'url', defaultValue: 'https://cdn.example/x7casino.io.png' },
    { key: 'CTA_LINK', label: 'CTA', type: 'url', defaultValues: { en: 'https://x7casino.io/a', fr: 'https://x7casino.io/b', de: 'https://x7casino.io/c' } },
    { key: 'FOOTER_LEGAL', label: 'Legal', type: 'richtext', defaultValues: { en: 'x <a href="https://x7casino.io/rg">RG</a> y <a href="https://other.example">o</a>' } },
    { key: 'TITLE', label: 'Title', type: 'text', defaultValue: 'Visit x7casino.io' },
  ],
  lockedFields: [
    { key: 'FOOTER_LOGO2_LINK', label: '18+', value: 'https://x7casino.io', values: { de: 'https://x7casino.io/de' }, isReadOnly: false },
    { key: 'UNSUB', label: 'Unsub', value: '{% unsubscribe_url %}', isReadOnly: true },
  ],
  currentLockedFields: null,
  linkHistory: null,
}
const slots = listLinkSlots(lm)
eq('links: image + text fields excluded', slots.some((l) => l.key === 'BANNER_IMG' || l.key === 'TITLE'), false)
eq('links: read-only CIO token excluded', slots.some((l) => l.key === 'UNSUB'), false)
eq('links: slot count (3 logo + 3 cta + 2 legal hrefs + 3 locked)', slots.length, 11)
eq('links: locked per-lang resolved', slots.find((l) => l.id === 'locked:FOOTER_LOGO2_LINK:de:0')?.url, 'https://x7casino.io/de')
const bulkRes = applyLinkEdits(lm, [], { find: 'x7casino.io', replace: 'x7new.io' })
eq('bulk: changed count (3 logo + 3 cta + 1 legal href + 3 locked)', bulkRes.changed, 10)
eq('bulk: single default stays single', bulkRes.editableFields[0], { key: 'LOGO_LINK', label: 'Logo', type: 'url', defaultValue: 'https://x7new.io' })
eq('bulk: image untouched', bulkRes.editableFields[1], lm.editableFields[1])
eq('bulk: text untouched', bulkRes.editableFields[4], lm.editableFields[4])
eq('bulk: richtext href only', (bulkRes.editableFields[3] as { defaultValues: Record<string, string> }).defaultValues.en, 'x <a href="https://x7new.io/rg">RG</a> y <a href="https://other.example">o</a>')
eq('bulk: locked keeps per-lang override', bulkRes.lockedFields[0], { key: 'FOOTER_LOGO2_LINK', label: '18+', value: 'https://x7casino.io', values: { en: 'https://x7new.io', fr: 'https://x7new.io', de: 'https://x7new.io/de' }, isReadOnly: false })
eq('bulk: locked changed flag', bulkRes.lockedChanged, true)
eq('bulk: baseline lockedFields untouched', lm.lockedFields[0].value, 'https://x7casino.io')
eq('bulk: history keeps old defaults', bulkRes.linkHistory.CTA_LINK, { en: ['https://x7casino.io/a'], fr: ['https://x7casino.io/b'], de: ['https://x7casino.io/c'] })
const collapse = applyLinkEdits(lm, [{ id: 'locked:FOOTER_LOGO2_LINK:de:0', from: 'https://x7casino.io/de', to: 'https://x7casino.io' }])
eq('locked: same link everywhere collapses to value', collapse.lockedFields[0], { key: 'FOOTER_LOGO2_LINK', label: '18+', value: 'https://x7casino.io', isReadOnly: false })
const oneLang = applyLinkEdits(lm, [{ id: 'editable:LOGO_LINK:fr:0', from: 'https://x7casino.io', to: 'https://x7casino.io/fr' }])
eq('single default edited in one language → per-language', (oneLang.editableFields[0] as TemplateFieldConfig).defaultValues, { en: 'https://x7casino.io', fr: 'https://x7casino.io/fr', de: 'https://x7casino.io' })
eq('D7 end-to-end: duplicate refresh after edit', refreshStaleDefaults({ fr: { LOGO_LINK: 'https://x7casino.io' }, en: { LOGO_LINK: 'https://x7casino.io' } } as unknown as MultiLanguageFieldValues, oneLang.editableFields as TemplateFieldConfig[], oneLang.linkHistory).fr.LOGO_LINK, 'https://x7casino.io/fr')
const throws = (name: string, fn: () => unknown, code: string) => {
  try { fn(); failures.push(`${name}: did not throw`) } catch (e) { eq(name, e instanceof LinkEditError ? e.code : String(e), code) }
}
throws('reject javascript:', () => applyLinkEdits(lm, [{ id: 'editable:LOGO_LINK:en:0', from: 'https://x7casino.io', to: 'javascript:alert(1)' }]), 'INVALID')
throws('reject quote injection', () => applyLinkEdits(lm, [{ id: 'locked:FOOTER_LOGO2_LINK:en:0', from: 'https://x7casino.io', to: 'https://a.com/" onclick="x' }]), 'INVALID')
throws('reject bulk producing bad url', () => applyLinkEdits(lm, [], { find: 'https://', replace: 'javascript:' }), 'INVALID')
throws('reject stale from', () => applyLinkEdits(lm, [{ id: 'editable:LOGO_LINK:en:0', from: 'https://changed', to: 'https://a.com' }]), 'STALE')
throws('reject unknown slot', () => applyLinkEdits(lm, [{ id: 'editable:NOPE:en:0', from: 'x', to: 'https://a.com' }]), 'NOT_FOUND')
eq('accept CIO token + mailto + #', ['{% unsubscribe_url %}', '{{ customer.link }}', 'mailto:a@b.co', '#top', 'https://a.com/p?q=1&r=2#x'].every(isSafeLink), true)

// ── Render: a snapshot really drives the output; the master's baseline drives legacy ──
async function renderChecks() {
  const m = await prisma.masterTemplate.findUnique({ where: { slug: 'stakes-template' } })
  if (!m) return failures.push('stakes-template master missing')
  const render = (lang: Language, lockedFields: LockedFieldConfig[]) =>
    renderTemplate({
      masterTemplateId: m.id, baseFilePath: m.baseFilePath, lang, brand: m.brand, lockedFields,
      editableFields: m.editableFields as unknown as TemplateFieldConfig[],
      fieldValues: { en: {}, fr: {}, frca: {}, de: {}, it: {}, es: {} },
    })
  const legacy = effectiveLockedFields({ lockedFieldsSnapshot: null }, m)
  for (const lang of ['fr', 'it'] as Language[]) {
    eq(`stakes ${lang} 18+ → stakes3`, (await render(lang, legacy)).includes('href="https://stakes3.com/responsible-gaming"'), true)
  }
  for (const lang of ['en', 'frca', 'de', 'es'] as Language[]) {
    const html = await render(lang, legacy)
    eq(`stakes ${lang} 18+ → stakes.com`, html.includes('href="https://stakes.com/responsible-gaming"') && !html.includes('stakes3.com/responsible-gaming"\n'), true)
  }
  const snap = legacy.map((f) => (f.key === 'FOOTER_LOGO1_LINK' ? { ...f, value: 'https://snap.example/rg', values: undefined } : f))
  eq('render uses snapshot', (await render('fr', snap)).includes('href="https://snap.example/rg"'), true)

  const v2 = await prisma.masterTemplate.findUnique({ where: { slug: 'x7-casino-v2-template' } })
  if (v2) {
    for (const lang of ['en', 'fr', 'de', 'it', 'es'] as Language[]) {
      const html = await renderTemplate({
        masterTemplateId: v2.id, baseFilePath: v2.baseFilePath, lang, brand: v2.brand,
        lockedFields: effectiveLockedFields({ lockedFieldsSnapshot: null }, v2),
        editableFields: v2.editableFields as unknown as TemplateFieldConfig[],
        fieldValues: { en: {}, fr: {}, frca: {}, de: {}, it: {}, es: {} },
      })
      eq(`v2 ${lang} no unresolved locked token`, /\{\{FOOTER_LOGO\d_LINK\}\}/.test(html), false)
    }
  }

  // X7 Casino V2 Whitelist = V2 with only the X7 links swapped (byte-for-byte otherwise)
  const wl = await prisma.masterTemplate.findUnique({ where: { slug: X7_V2_WL_SLUG } })
  if (!v2 || !wl) return failures.push('v2 / whitelist master missing')
  const defaults = (fields: TemplateFieldConfig[], lang: Language) =>
    Object.fromEntries(fields.map((f) => [f.key, f.type === 'paragraphs' ? (f.defaultParagraphsByLang?.[lang] ?? f.defaultParagraphs ?? []) : (f.defaultValues?.[lang] ?? f.defaultValue ?? '')]))
  for (const lang of ['en', 'fr', 'de', 'it', 'es'] as Language[]) {
    const r = async (m: typeof v2) => {
      const fields = m.editableFields as unknown as TemplateFieldConfig[]
      return renderTemplate({
        masterTemplateId: m.id, baseFilePath: m.baseFilePath, lang, brand: m.brand,
        lockedFields: currentLockedFields(m), editableFields: fields,
        fieldValues: { en: {}, fr: {}, frca: {}, de: {}, it: {}, es: {}, [lang]: defaults(fields, lang) } as unknown as MultiLanguageFieldValues,
      })
    }
    const [v2Html, wlHtml] = [await r(v2), await r(wl)]
    eq(`whitelist ${lang} has no x7casino .com link`, /x7casino2?\.com/.test(wlHtml), false)
    eq(`whitelist ${lang} links → x7casino.io`, wlHtml.includes('href="https://x7casino.io"'), true)
    // url fields go through sanitizeUrl (URL parse → trailing slash); locked links don't — both are the same link
    const noSlash = (h: string) => h.replaceAll('"https://x7casino.io/"', '"https://x7casino.io"')
    eq(`whitelist ${lang} = V2 with links swapped`, noSlash(wlHtml) === toWhitelistLinks(v2Html), true)
  }
}

renderChecks()
  .catch((e) => failures.push(`render checks threw: ${e instanceof Error ? e.message : e}`))
  .finally(() => {
    if (failures.length) {
      console.error(`link asserts: ${failures.length} FAILED\n  ${failures.join('\n  ')}`)
      process.exitCode = 1
    } else console.log(`link asserts: ${passed} passed`)
    setTimeout(() => process.exit(), 200)
  })
