// The api layer's links-* cases edit the X7 Casino V2 Whitelist master through Admin → Links.
// Its link columns are backed up before and restored exactly after (logic hashes ignore updatedAt),
// so the local DB ends every run the way it started. A backup left by a crashed run is restored first.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export const LINKS_MASTER_SLUG = 'x7-casino-v2-whitelist-template'
const file = (out: string) => join(out, 'links-master-backup.json')

export async function restoreLinksMaster(out: string): Promise<boolean> {
  if (!existsSync(file(out))) return false
  const b = JSON.parse(readFileSync(file(out), 'utf8'))
  const json = (v: unknown) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue))
  await prisma.masterTemplate.update({
    where: { id: b.id },
    data: {
      editableFields: b.editableFields,
      lockedFields: b.lockedFields,
      currentLockedFields: json(b.currentLockedFields),
      linkHistory: json(b.linkHistory),
    },
  })
  if (redis.status === 'wait') await redis.connect()
  await redis.del('mailcraft:master:list')
  rmSync(file(out))
  return true
}

export async function backupLinksMaster(out: string): Promise<void> {
  if (await restoreLinksMaster(out)) console.log('api prep: restored the links master left by an interrupted run')
  const m = await prisma.masterTemplate.findUnique({ where: { slug: LINKS_MASTER_SLUG } })
  if (!m) throw new Error(`${LINKS_MASTER_SLUG} missing — run npm run db:seed:x7v2-whitelist`)
  writeFileSync(
    file(out),
    JSON.stringify({
      id: m.id,
      editableFields: m.editableFields,
      lockedFields: m.lockedFields,
      currentLockedFields: m.currentLockedFields,
      linkHistory: m.linkHistory,
    })
  )
  writeFileSync(join(out, 'links-master-id.txt'), m.id)
}
