// Prepares the api layer: mints local Auth.js session cookies (admin, department user, and an account
// that doesn't exist → no preset permission) into the gitignored .out dir, and resets the test users'
// preset rate-limit counters so back-to-back runs never hit 429.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

interface TokenUser {
  id: string
  email: string
  name: string | null
  role: string
  department: string | null
  canAccessEmails: boolean
}

async function main() {
  const out = process.argv[2]
  if (!out) throw new Error('usage: mint-cookies.ts <outDir>')
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  mkdirSync(out, { recursive: true })

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, department: true, canAccessEmails: true },
  })
  const make = (u: TokenUser) =>
    encode({
      salt: 'authjs.session-token',
      secret,
      maxAge: 24 * 60 * 60,
      token: { sub: u.id, id: u.id, email: u.email, name: u.name, role: u.role, department: u.department, canAccessEmails: u.canAccessEmails },
    })

  const admin = users.find((u) => u.role === 'ADMIN')
  if (!admin) throw new Error('no ADMIN user in the local DB')
  writeFileSync(join(out, 'cookie-admin.txt'), await make(admin))
  const dept = users.find((u) => u.role === 'DEPARTMENT')
  if (dept) writeFileSync(join(out, 'cookie-dept.txt'), await make(dept))
  writeFileSync(
    join(out, 'cookie-noperm.txt'),
    await make({ id: 'regress-nonexistent-user', email: 'nobody@example.com', name: 'nobody', role: 'DEPARTMENT', department: 'crm', canAccessEmails: false })
  )
  if (redis.status === 'wait') await redis.connect() // client is lazyConnect
  await redis.del(...users.map((u) => `thumbnail-presets:${u.id}`))
  console.log('api prep: cookies minted, rate limits reset')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => setTimeout(() => process.exit(), 100))
