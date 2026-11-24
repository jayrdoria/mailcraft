// X7 Casino V2 (BL) + Whitelist (WL) footer refresh (2026-11-24). Safe to run any number of times.
// Saved templates are never touched (new templates only) — existing link snapshots and field values stay.
//
//  --phase=pre   ADD-ONLY, runs BEFORE `git pull` (old master HTML still on disk):
//                · appends FOOTER_GAMCARE_LINK to the baseline + current links (the new HTML uses it)
//                · WL: current 18+ link → x7casino.io/{lang}/responsible-gaming where it's still the bare default
//  --phase=post  runs AFTER the app restart (new master HTML live):
//                · current links: drop FOOTER_LOGO1_LINK / FOOTER_LOGO3_LINK (Play Responsibly / Kahnawake)
//                · BL: drop the FOOTER_LICENSE field · WL: FOOTER_LICENSE defaults → Boni Tech (added if missing)
//                · WL: FOOTER_LEGAL default RG link → per language (old default kept in linkHistory, D7)
//  (no --phase)  both · --dry-run prints what would change and writes nothing
//
// Local: npm run db:seed:x7v2-footer [-- --dry-run]
import { PrismaClient, Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { X7V2_GAMCARE_LINK, X7V2_WL_LOGO2_LINK, x7WhitelistRgUrl } from './templates/lockedLinks'
import { X7_V2_LANGUAGES, X7_V2_SLUG } from './templates/x7v2'
import { WHITELIST_URL, WL_LICENSE, WL_LICENSE_FIELD, X7_V2_WL_SLUG } from './templates/x7v2Whitelist'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 })

// Must match CacheKeys in lib/redis.ts (lib/ is not available in the migrator image)
const MASTER_LIST_KEY = 'mailcraft:master:list'
const masterHtmlKey = (id: string, lang: string) => `mailcraft:master:html:${id}:${lang}`

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const phaseArg = args.find((a) => a.startsWith('--phase='))?.split('=')[1]
if (phaseArg && phaseArg !== 'pre' && phaseArg !== 'post') throw new Error(`unknown --phase=${phaseArg}`)
const PRE = phaseArg !== 'post'
const POST = phaseArg !== 'pre'

interface Locked { key: string; value: string; values?: Record<string, string>; [k: string]: unknown }
interface Field { key: string; defaultValues?: Record<string, string>; [k: string]: unknown }
type History = Record<string, Record<string, string[]>>

const REMOVED_LOCKED = new Set(['FOOTER_LOGO1_LINK', 'FOOTER_LOGO3_LINK'])
const lockedFor = (f: Locked, lang: string) => f.values?.[lang] ?? f.value
// Key-order independent (Postgres JSONB reorders object keys) — so a re-run is a true no-op
const json = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : val
  )

const withGamcare = (fields: Locked[]) =>
  fields.some((f) => f.key === X7V2_GAMCARE_LINK.key) ? fields : [...fields, { ...X7V2_GAMCARE_LINK }]

/** WL 18+: languages still on the bare whitelist URL get the per-language RG page; admin-edited ones stay. */
function withWlLogo2(fields: Locked[]): Locked[] {
  return fields.map((f) => {
    if (f.key !== X7V2_WL_LOGO2_LINK.key) return f
    const per = Object.fromEntries(X7_V2_LANGUAGES.map((l) => [l, lockedFor(f, l) === WHITELIST_URL ? lockedFor(X7V2_WL_LOGO2_LINK, l) : lockedFor(f, l)]))
    if (X7_V2_LANGUAGES.every((l) => per[l] === lockedFor(f, l))) return f
    const value = per.en
    const values = Object.fromEntries(Object.entries(per).filter(([l, url]) => l !== 'en' && url !== value))
    return { ...f, value, values }
  })
}

async function patch(slug: string, isWl: boolean): Promise<string | null> {
  const m = await prisma.masterTemplate.findUnique({
    where: { slug },
    select: { id: true, isImported: true, lockedFields: true, currentLockedFields: true, editableFields: true, linkHistory: true },
  })
  if (!m || m.isImported) {
    console.log(`- ${slug}: not found — skipped`)
    return null
  }
  const baseline = (m.lockedFields as unknown as Locked[] | null) ?? []
  const current = m.currentLockedFields as unknown as Locked[] | null
  let nextBaseline = baseline
  let nextCurrent = current
  let nextFields = (m.editableFields as unknown as Field[] | null) ?? []
  const history: History = structuredClone((m.linkHistory as unknown as History | null) ?? {})
  const notes: string[] = []

  if (PRE) {
    nextBaseline = withGamcare(nextBaseline)
    if (nextCurrent) nextCurrent = withGamcare(nextCurrent)
    if (isWl) {
      const updated = withWlLogo2(nextCurrent ?? nextBaseline)
      if (updated !== (nextCurrent ?? nextBaseline)) nextCurrent = updated
    }
  }

  if (POST) {
    const cur = nextCurrent ?? nextBaseline
    if (cur.some((f) => REMOVED_LOCKED.has(f.key))) nextCurrent = cur.filter((f) => !REMOVED_LOCKED.has(f.key))

    if (!isWl) {
      if (nextFields.some((f) => f.key === 'FOOTER_LICENSE')) nextFields = nextFields.filter((f) => f.key !== 'FOOTER_LICENSE')
    } else {
      const at = nextFields.findIndex((f) => f.key === 'FOOTER_LICENSE')
      if (at === -1) {
        const legalAt = nextFields.findIndex((f) => f.key === 'FOOTER_LEGAL')
        if (legalAt === -1) throw new Error(`${slug}: FOOTER_LEGAL field missing`)
        nextFields = [...nextFields.slice(0, legalAt), { ...WL_LICENSE_FIELD } as Field, ...nextFields.slice(legalAt)]
      } else if (json(nextFields[at].defaultValues) !== json(WL_LICENSE)) {
        nextFields = nextFields.map((f, i) => (i === at ? { ...f, defaultValues: { ...WL_LICENSE } } : f))
      }
      nextFields = nextFields.map((f) => {
        if (f.key !== 'FOOTER_LEGAL' || !f.defaultValues) return f
        let changed = false
        const defaults = { ...f.defaultValues }
        for (const lang of X7_V2_LANGUAGES) {
          const before = defaults[lang]
          if (!before?.includes(`href="${WHITELIST_URL}"`)) continue
          defaults[lang] = before.replaceAll(`href="${WHITELIST_URL}"`, `href="${x7WhitelistRgUrl(lang)}"`)
          const past = ((history.FOOTER_LEGAL ??= {})[lang] ??= [])
          if (!past.includes(before)) past.push(before)
          changed = true
        }
        return changed ? { ...f, defaultValues: defaults } : f
      })
    }
  }

  const data: Record<string, Prisma.InputJsonValue> = {}
  if (json(nextBaseline) !== json(baseline)) {
    data.lockedFields = nextBaseline as unknown as Prisma.InputJsonValue
    notes.push(`baseline links: ${baseline.map((f) => f.key).join(',')} → ${nextBaseline.map((f) => f.key).join(',')}`)
  }
  if (json(nextCurrent) !== json(current)) {
    data.currentLockedFields = nextCurrent as unknown as Prisma.InputJsonValue
    notes.push(`current links: ${current ? current.map((f) => f.key).join(',') : '(baseline)'} → ${(nextCurrent ?? []).map((f) => `${f.key}=${f.value}${f.values ? ' ' + json(f.values) : ''}`).join(' · ')}`)
  }
  const fieldsBefore = (m.editableFields as unknown as Field[] | null) ?? []
  if (json(nextFields) !== json(fieldsBefore)) {
    data.editableFields = nextFields as unknown as Prisma.InputJsonValue
    const before = new Map(fieldsBefore.map((f) => [f.key, json(f)]))
    const after = new Map(nextFields.map((f) => [f.key, json(f)]))
    const keys = [...new Set([...before.keys(), ...after.keys()])].filter((k) => before.get(k) !== after.get(k))
    notes.push(`editable fields changed: ${keys.map((k) => (!after.has(k) ? `-${k}` : !before.has(k) ? `+${k}` : k)).join(', ')}`)
  }
  if (json(history) !== json(m.linkHistory ?? {})) data.linkHistory = history as unknown as Prisma.InputJsonValue

  if (Object.keys(data).length === 0) {
    console.log(`✓ ${slug}: already up to date — nothing changed`)
    return m.id
  }
  notes.forEach((n) => console.log(`  ${slug}: ${n}`))
  if (DRY) {
    console.log(`~ ${slug}: dry run — not written`)
    return null
  }
  // updateMany: no RETURNING * (the pre phase runs before `migrate deploy`)
  await prisma.masterTemplate.updateMany({ where: { id: m.id }, data })
  console.log(`✓ ${slug}: footer updated (${Object.keys(data).join(', ')})`)
  return m.id
}

async function main() {
  console.log(`X7 V2 footer refresh — phase ${phaseArg ?? 'pre+post'}${DRY ? ' (dry run)' : ''}`)
  const savedBefore = await prisma.savedTemplate.count()
  const ids = [await patch(X7_V2_SLUG, false), await patch(X7_V2_WL_SLUG, true)].filter((id): id is string => !!id)
  const savedAfter = await prisma.savedTemplate.count()
  console.log(`✓ Saved templates: ${savedBefore} → ${savedAfter}`)
  if (savedAfter !== savedBefore) throw new Error('Saved template count changed — investigate')
  if (DRY || ids.length === 0) return

  try {
    await redis.connect()
    await redis.del(MASTER_LIST_KEY, ...ids.flatMap((id) => X7_V2_LANGUAGES.map((l) => masterHtmlKey(id, l))))
    console.log('✓ Cleared master list + V2 / Whitelist master HTML cache')
  } catch (e) {
    console.warn('⚠ Redis unavailable — caches refresh within 1h', e instanceof Error ? e.message : e)
  }
}

main()
  .catch((e) => {
    console.error('X7 V2 footer refresh failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    redis.disconnect()
  })
