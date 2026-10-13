// Add-only registration of the X7 Casino V2 master template.
// Runs automatically on every deploy (.github/workflows/deploy.yml), after the app restart.
//
// Default (create-only): creates the template if missing; if it already exists it does
// NOTHING — so admin edits to V2 and an admin soft-delete are never overwritten.
// --update: re-applies prisma/templates/x7v2.ts to the existing row (manual use only).
//
// Never deletes or touches users, saved/cloned templates, or the other master templates.
//
// Local: npm run db:seed:x7v2 [-- --update]
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { X7_V2_LANGUAGES, X7_V2_SLUG, x7v2CreateData, x7v2UpdateData } from './templates/x7v2'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
})

// Must match CacheKeys in lib/redis.ts (lib/ is not available in the migrator image)
const MASTER_LIST_KEY = 'mailcraft:master:list'
const masterHtmlKey = (id: string, lang: string) => `mailcraft:master:html:${id}:${lang}`

const UPDATE = process.argv.includes('--update')

// Template root as already used by the live X7 master (proven correct on this server);
// falls back to TEMPLATE_BASE_DIR for a fresh database without the X7 template.
async function resolveTemplateBaseDir(): Promise<string> {
  const x7 = await prisma.masterTemplate.findUnique({
    where: { slug: 'x7-casino-template' },
    select: { baseFilePath: true },
  })
  const suffix = '/master-templates/x7'
  if (x7?.baseFilePath.endsWith(suffix)) return x7.baseFilePath.slice(0, -suffix.length)
  return process.env.TEMPLATE_BASE_DIR ?? './data/templates'
}

async function clearCaches(id: string) {
  try {
    await redis.connect()
    await redis.del(MASTER_LIST_KEY, ...X7_V2_LANGUAGES.map((l) => masterHtmlKey(id, l)))
    console.log('✓ Cleared master list cache')
  } catch (e) {
    console.warn('⚠ Redis unavailable — master list refreshes within 5 min', e instanceof Error ? e.message : e)
  }
}

async function main() {
  const existing = await prisma.masterTemplate.findUnique({
    where: { slug: X7_V2_SLUG },
    select: { id: true },
  })
  if (existing && !UPDATE) {
    console.log(`✓ X7 Casino V2 already registered (${existing.id}) — skipping, nothing changed`)
    return
  }

  const templateBaseDir = await resolveTemplateBaseDir()
  const savedBefore = await prisma.savedTemplate.count()
  const mastersBefore = await prisma.masterTemplate.count()

  const tpl = existing
    ? await prisma.masterTemplate.update({ where: { slug: X7_V2_SLUG }, data: x7v2UpdateData(templateBaseDir) })
    : await prisma.masterTemplate.create({ data: x7v2CreateData(templateBaseDir) })
  console.log(`✓ X7 Casino V2 Template ${existing ? 'updated' : 'created'}: ${tpl.id} (${tpl.baseFilePath})`)

  const savedAfter = await prisma.savedTemplate.count()
  const mastersAfter = await prisma.masterTemplate.count()
  console.log(`✓ Saved templates: ${savedBefore} → ${savedAfter}`)
  console.log(`✓ Master templates: ${mastersBefore} → ${mastersAfter}`)
  if (savedAfter !== savedBefore) throw new Error('Saved template count changed — investigate')

  await clearCaches(tpl.id)
}

main()
  .catch((e) => {
    console.error('X7 V2 registration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    redis.disconnect()
  })
