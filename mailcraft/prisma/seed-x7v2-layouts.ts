// Add-only: give the X7 Casino V2 master the layout option fields (Welcome Boost /
// Free Spins bodies, Icons thumbnail design, "More at X7" heading). Safe to run any
// number of times.
//
// Only APPENDS the fields that are missing — existing fields, admin edits,
// saved/cloned templates, users and every other master are never touched.
// Re-running changes nothing. Also clears the V2 master HTML cache so the
// V2BODY/V2THUMBS markers (shipped in the master files) are live immediately.
//
// Local: npm run db:seed:x7v2-layouts
import { PrismaClient, Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { withV2LayoutFields } from './templates/x7v2Layouts'
import { X7_V2_LANGUAGES, X7_V2_SLUG } from './templates/x7v2'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
})

// Must match CacheKeys in lib/redis.ts (lib/ is not available in the migrator image)
const MASTER_LIST_KEY = 'mailcraft:master:list'
const masterHtmlKey = (id: string, lang: string) => `mailcraft:master:html:${id}:${lang}`

interface FieldLike { key: string }

async function main() {
  const master = await prisma.masterTemplate.findUnique({
    where: { slug: X7_V2_SLUG },
    select: { id: true, editableFields: true, isImported: true },
  })
  if (!master || master.isImported) {
    console.log(`- ${X7_V2_SLUG}: not found — skipped`)
    return
  }

  const savedBefore = await prisma.savedTemplate.count()
  const fields = (master.editableFields as unknown as FieldLike[]) ?? []
  const next = withV2LayoutFields(fields)
  if (next === fields) {
    console.log(`✓ ${X7_V2_SLUG}: layout fields already present — nothing changed`)
  } else {
    await prisma.masterTemplate.update({
      where: { id: master.id },
      data: { editableFields: next as unknown as Prisma.InputJsonValue },
    })
    console.log(`✓ ${X7_V2_SLUG}: added ${next.length - fields.length} layout field(s)`)
  }

  const savedAfter = await prisma.savedTemplate.count()
  console.log(`✓ Saved templates: ${savedBefore} → ${savedAfter}`)
  if (savedAfter !== savedBefore) throw new Error('Saved template count changed — investigate')

  try {
    await redis.connect()
    await redis.del(MASTER_LIST_KEY, ...X7_V2_LANGUAGES.map((l) => masterHtmlKey(master.id, l)))
    console.log('✓ Cleared master list + V2 master HTML cache')
  } catch (e) {
    console.warn('⚠ Redis unavailable — caches refresh within 1h', e instanceof Error ? e.message : e)
  }
}

main()
  .catch((e) => {
    console.error('X7 V2 layout fields failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    redis.disconnect()
  })
