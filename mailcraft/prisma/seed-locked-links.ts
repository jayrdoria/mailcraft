// Add-only: per-language locked footer links (2026-11-17). Safe to run any number of times.
//
//  - Stakes: FOOTER_LOGO1_LINK (18+) gets FR + IT → stakes3.com (only languages without an override yet)
//  - X7 Casino V2: appends FOOTER_LOGO2_LINK (18+, per language) if missing — the master HTML now
//    carries {{FOOTER_LOGO2_LINK}} where the link used to be hardcoded
//
// Runs in the deploy BEFORE `git pull` (the new master HTML): the DB already has FOOTER_LOGO2_LINK when
// {{FOOTER_LOGO2_LINK}} lands on disk, so it never renders unresolved. Until the app restarts, the old
// app ignores `values` (V2 18+ → the EN link, Stakes 18+ → stakes.com as before) — seconds, harmless.
// Saved templates, users and every other field are never touched. Clears the affected master caches.
//
// Local: npm run db:seed:locked-links
import { PrismaClient, Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { STAKES_LOGO1_VALUES, X7V2_LOGO2_LINK } from './templates/lockedLinks'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
})

// Must match CacheKeys in lib/redis.ts (lib/ is not available in the migrator image)
const MASTER_LIST_KEY = 'mailcraft:master:list'
const masterHtmlKey = (id: string, lang: string) => `mailcraft:master:html:${id}:${lang}`

interface LockedLike {
  key: string
  value: string
  values?: Record<string, string>
  [k: string]: unknown
}

async function patchMaster(slug: string, patch: (fields: LockedLike[]) => LockedLike[] | null): Promise<string | null> {
  const master = await prisma.masterTemplate.findUnique({
    where: { slug },
    select: { id: true, lockedFields: true, isImported: true },
  })
  if (!master || master.isImported) {
    console.log(`- ${slug}: not found — skipped`)
    return null
  }
  const next = patch((master.lockedFields as unknown as LockedLike[]) ?? [])
  if (!next) {
    console.log(`✓ ${slug}: already up to date — nothing changed`)
    return master.id
  }
  // updateMany: no RETURNING * — this runs BEFORE `migrate deploy`, when the new columns don't exist yet
  await prisma.masterTemplate.updateMany({
    where: { id: master.id },
    data: { lockedFields: next as unknown as Prisma.InputJsonValue },
  })
  console.log(`✓ ${slug}: locked links updated`)
  return master.id
}

async function main() {
  const savedBefore = await prisma.savedTemplate.count()

  const stakesId = await patchMaster('stakes-template', (fields) => {
    const i = fields.findIndex((f) => f.key === 'FOOTER_LOGO1_LINK')
    if (i === -1) return null
    const values = { ...(fields[i].values ?? {}) }
    let changed = false
    for (const [lang, url] of Object.entries(STAKES_LOGO1_VALUES)) {
      if (values[lang] === undefined) {
        values[lang] = url
        changed = true
      }
    }
    if (!changed) return null
    const next = [...fields]
    next[i] = { ...fields[i], values }
    return next
  })

  const v2Id = await patchMaster('x7-casino-v2-template', (fields) =>
    fields.some((f) => f.key === X7V2_LOGO2_LINK.key) ? null : [...fields, { ...X7V2_LOGO2_LINK }]
  )

  const savedAfter = await prisma.savedTemplate.count()
  console.log(`✓ Saved templates: ${savedBefore} → ${savedAfter}`)
  if (savedAfter !== savedBefore) throw new Error('Saved template count changed — investigate')

  try {
    await redis.connect()
    const keys = [MASTER_LIST_KEY]
    if (stakesId) keys.push(...['en', 'fr', 'frca', 'de', 'it', 'es'].map((l) => masterHtmlKey(stakesId, l)))
    if (v2Id) keys.push(...['en', 'fr', 'de', 'it', 'es'].map((l) => masterHtmlKey(v2Id, l)))
    await redis.del(...keys)
    console.log('✓ Cleared master list + Stakes / V2 master HTML cache')
  } catch (e) {
    console.warn('⚠ Redis unavailable — caches refresh within 1h', e instanceof Error ? e.message : e)
  }
}

main()
  .catch((e) => {
    console.error('Locked links update failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    redis.disconnect()
  })
