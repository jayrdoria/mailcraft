// Feature asserts for preset fill logic (pure functions, no DB). Run by the logic layer; exit 1 on failure.
import { activePresetId, presetSlotValues, slotsFromFields } from '@/lib/thumbnailSlots'
import { presetImage, presetLink, presetText } from '@/lib/types/thumbnailPreset'
import type { FieldValue, Language } from '@/lib/types/template'
import { FIXTURE_PRESETS } from './fixtures'

let passed = 0
const failures: string[] = []
const eq = (name: string, actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed++
  else failures.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}
const fx = (id: string) => {
  const p = FIXTURE_PRESETS.find((f) => f.id === id)
  if (!p) throw new Error(`fixture ${id} missing`)
  return p
}

const STAKES_LANGS: Language[] = ['en', 'fr', 'frca', 'de', 'it', 'es']
const keys = new Set(['THUMB1_IMG', 'THUMB1_LABEL', 'THUMB1_LINK'])
const current: Partial<Record<Language, Record<string, FieldValue>>> = Object.fromEntries(
  STAKES_LANGS.map((l) => [l, { THUMB1_IMG: 'tpl.png', THUMB1_LABEL: 'tpl', THUMB1_LINK: `https://tpl/${l}` }])
)

// ── FRCA texts / links ──
const full = fx('fx_new_stakes_frca_imgs')
eq('frca label set', presetText(full.labels, 'frca'), 'Nouveau CA')
eq('frca link set', presetLink(full.links, 'frca'), 'https://www.stakes.com/n-ca')
const blank = fx('fx_new_stakes_blank_frca')
eq('frca label blank → FR', presetText(blank.labels, 'frca'), 'Vide')
eq('frca link blank → empty (keep template)', presetLink(blank.links, 'frca'), '')
const old = fx('fx_stakes_full')
eq('old preset: frca label → FR', presetText(old.labels, 'frca'), 'Bonus')
eq('old preset: frca link never borrows FR', presetLink(old.links, 'frca'), '')
eq('non-frca link unchanged', presetLink(old.links, 'fr'), 'https://www.stakes3.com/a')

// ── per-language images ──
eq('image override', presetImage(full, 'fr'), 'https://example.com/n1-fr.png')
eq('image no override → main', presetImage(full, 'it'), 'https://example.com/n1.png')
eq('image frca blank → FR override', presetImage(full, 'frca'), 'https://example.com/n1-fr.png')
eq('image frca own', presetImage(blank, 'frca'), 'https://example.com/n2-ca.png')
eq('image fr no override, frca has one', presetImage(blank, 'fr'), 'https://example.com/n2.png')
eq('old preset image everywhere', STAKES_LANGS.map((l) => presetImage(old, l)), STAKES_LANGS.map(() => old.imageUrl))

// ── slot fill (what the editor writes) ──
const fill = presetSlotValues(full, 'THUMB1', STAKES_LANGS, keys, current)
eq('fill FR', fill.fr, { THUMB1_IMG: 'https://example.com/n1-fr.png', THUMB1_LABEL: 'Nouveau', THUMB1_LINK: 'https://www.stakes3.com/n' })
eq('fill FRCA', fill.frca, { THUMB1_IMG: 'https://example.com/n1-fr.png', THUMB1_LABEL: 'Nouveau CA', THUMB1_LINK: 'https://www.stakes.com/n-ca' })
eq('fill IT keeps template link when blank', fill.it, { THUMB1_IMG: 'https://example.com/n1.png', THUMB1_LABEL: 'Nuovo', THUMB1_LINK: 'https://tpl/it' })
const fillBlank = presetSlotValues(blank, 'THUMB1', STAKES_LANGS, keys, current)
eq('fill FRCA blank link keeps template FRCA link', fillBlank.frca?.THUMB1_LINK, 'https://tpl/frca')
const fillOld = presetSlotValues(old, 'THUMB1', STAKES_LANGS, keys, current)
eq('old preset FRCA keeps template FRCA link (not stakes3)', fillOld.frca?.THUMB1_LINK, 'https://tpl/frca')

// ── active preset detection with per-language images ──
const [slot] = slotsFromFields(keys)
const after = Object.fromEntries(STAKES_LANGS.map((l) => [l, { ...current[l], ...fill[l] }]))
eq('active after per-language fill', activePresetId([old, full, blank], slot, STAKES_LANGS, keys, after), full.id)
const tampered = { ...after, de: { ...after.de, THUMB1_IMG: 'https://example.com/n1.png' } }
eq('not active when one language image differs', activePresetId([full], slot, STAKES_LANGS, keys, tampered), '')

if (failures.length) {
  failures.forEach((f) => console.error(`  FAIL ${f}`))
  console.error(`asserts: ${passed} passed, ${failures.length} failed`)
  process.exit(1)
}
console.log(`asserts: ${passed} passed`)
