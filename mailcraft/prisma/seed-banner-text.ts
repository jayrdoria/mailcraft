// Add-only: give the built-in master templates the banner text box fields
// (BANNER_TITLE / BANNER_SUB). Safe to run any number of times.
//
// For each built-in master it only APPENDS the two fields when missing (after
// BANNER_LINK) — existing fields, admin edits, saved/cloned templates, users and
// imported masters are never touched. Re-running changes nothing.
// Also clears the master HTML cache so the BANNER:START/END markers (shipped in
// the master files) are picked up immediately instead of after the 1h TTL.
//
// Local: npm run db:seed:banner-text
import { PrismaClient, Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { withBannerTextFields } from './templates/bannerText'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
})

// Must match CacheKeys in lib/redis.ts (lib/ is not available in the migrator image)
const MASTER_LIST_KEY = 'mailcraft:master:list'
const masterHtmlKey = (id: string, lang: string) => `mailcraft:master:html:${id}:${lang}`
const ALL_LANGS = ['en', 'fr', 'frca', 'de', 'it', 'es']

const BUILT_IN_SLUGS = [
  'stakes-template',
  'stakes-casino-template',
  'x7-casino-template',
  'x7-casino-v2-template',
]

interface FieldLike { key: string }

async function main() {
  const savedBefore = await prisma.savedTemplate.count()
  const touchedIds: string[] = []

  for (const slug of BUILT_IN_SLUGS) {
    const master = await prisma.masterTemplate.findUnique({
      where: { slug },
      select: { id: true, editableFields: true, languages: true, isImported: true },
    })
    if (!master || master.isImported) {
      console.log(`- ${slug}: not found — skipped`)
      continue
    }
    touchedIds.push(master.id)

    const fields = (master.editableFields as unknown as FieldLike[]) ?? []
    const languages = (master.languages as unknown as string[]) ?? []
    const next = withBannerTextFields(fields, languages.length ? languages : ALL_LANGS)
    if (next === fields) {
      console.log(`✓ ${slug}: banner text fields already present — nothing changed`)
      continue
    }
    await prisma.masterTemplate.update({
      where: { id: master.id },
      data: { editableFields: next as unknown as Prisma.InputJsonValue },
    })
    console.log(`✓ ${slug}: added ${next.length - fields.length} banner text field(s)`)
  }

  const savedAfter = await prisma.savedTemplate.count()
  console.log(`✓ Saved templates: ${savedBefore} → ${savedAfter}`)
  if (savedAfter !== savedBefore) throw new Error('Saved template count changed — investigate')

  try {
    await redis.connect()
    const keys = touchedIds.flatMap((id) => ALL_LANGS.map((l) => masterHtmlKey(id, l)))
    await redis.del(MASTER_LIST_KEY, ...keys)
    console.log('✓ Cleared master list + master HTML cache')
  } catch (e) {
    console.warn('⚠ Redis unavailable — caches refresh within 1h', e instanceof Error ? e.message : e)
  }
}

main()
  .catch((e) => {
    console.error('Banner text fields failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    redis.disconnect()
  })
