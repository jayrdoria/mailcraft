#!/usr/bin/env node
// MailCraft regression suite (backend) — one command, ~10s. Local dev only, never prod.
//
//   npm run regress:baseline     snapshot the current code (start of a ticket, before any change; --force to replace)
//   npm run regress              snapshot again and diff against the baseline (after every phase)
//   npm run regress -- --layers logic          one layer only
//   npm run regress -- --allow "<regex>"       intended change (regex on the diff path); or .out/allow.txt
//
// Layers: logic (DB schema + table hashes, preset rows, fill output, server renders, feature asserts — no
// server needed) · api (preset endpoints against the running `npm run dev` on :3000, override REGRESS_URL).
// The api layer shares the local dev DB: temp presets are created and always deleted.
// Output (baseline, runs, cookies) lives in tests/regression/.out — gitignored.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../..')
const OUT = join(HERE, '.out')
const ORIGIN = process.env.REGRESS_URL ?? 'http://localhost:3000/mailcraft'
const PG_CONTAINER = process.env.REGRESS_PG_CONTAINER ?? 'mailcraft-postgres-1'

// ── args ──
const argv = process.argv.slice(2)
const cmd = argv[0] && !argv[0].startsWith('--') ? argv.shift() : 'check'
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1]
}
const layers = opt('layers', 'logic,api').split(',')
const allow = argv.flatMap((a, i) => (argv[i - 1] === '--allow' ? [a] : []))
const allowFile = join(OUT, 'allow.txt') // optional, one regex per line (ticket-local intended changes)
if (existsSync(allowFile)) allow.push(...readFileSync(allowFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')))

const log = (m) => console.log(`[regress] ${m}`)
const fail = (m) => { console.error(`[regress] ${m}`); process.exit(1) }

// ── helpers ──
const devEnv = () => {
  const env = { ...process.env }
  for (const f of ['.env', '.env.development']) {
    const p = join(REPO, f)
    if (existsSync(p)) Object.assign(env, parseEnv(readFileSync(p, 'utf8')))
  }
  return env
}
const tsx = (script, ...args) => {
  const r = spawnSync(process.execPath, [join(REPO, 'node_modules/tsx/dist/cli.mjs'), '--tsconfig', 'tsconfig.json', script, ...args], {
    cwd: REPO, env: devEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  })
  // Drop Prisma's dev query log (multi-line statements continue on indented lines)
  let inQuery = false
  const lines = `${r.stdout}\n${r.stderr}`.split('\n').filter((l) => {
    if (l.startsWith('prisma:query')) return !(inQuery = true)
    if (inQuery && /^\s/.test(l)) return false
    inQuery = false
    return l.trim() !== ''
  })
  lines.forEach((l) => console.log(`  ${l}`))
  if (r.status !== 0) fail(`${script} failed`)
}
const node = (script, ...args) => spawnSync(process.execPath, [join(HERE, script), ...args], { cwd: REPO, stdio: 'inherit' }).status ?? 1

async function checkServer() {
  try {
    const r = await fetch(`${ORIGIN}/login`, { signal: AbortSignal.timeout(60000), redirect: 'manual' })
    if (r.status < 500) return
  } catch {}
  fail(`no dev server at ${ORIGIN} — start \`npm run dev\` (or set REGRESS_URL), or run with --layers logic`)
}

function backupDb(dir) {
  const r = spawnSync('docker', ['exec', PG_CONTAINER, 'sh', '-c', 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc'], { maxBuffer: 1024 * 1024 * 1024 })
  if (r.status !== 0) return log(`DB backup skipped (container ${PG_CONTAINER} not reachable)`)
  writeFileSync(join(dir, 'db.dump'), r.stdout)
  log(`DB backup: ${join(dir, 'db.dump')} (${Math.round(r.stdout.length / 1024)} KB)`)
}

async function snapshot(dir) {
  mkdirSync(dir, { recursive: true })
  if (layers.includes('logic')) {
    tsx('tests/regression/snapshot-logic.ts', join(dir, 'logic'))
    tsx('tests/regression/assert-presets.ts')
  }
  if (layers.includes('api')) {
    await checkServer()
    tsx('tests/regression/prepare-api.ts', OUT)
    const probe = await fetch(`${ORIGIN}/api/thumbnail-presets`, {
      headers: { cookie: `authjs.session-token=${readFileSync(join(OUT, 'cookie-admin.txt'), 'utf8').trim()}` },
    }).catch(() => null)
    if (!probe || probe.status >= 500) {
      fail(`${ORIGIN}/api/thumbnail-presets → ${probe?.status ?? 'no response'}: restart \`npm run dev\` (stale Prisma client after a schema change)`)
    }
    if (node('snapshot-api.mjs', OUT, join(dir, 'api.json'), ORIGIN) !== 0) {
      fail('api layer failed — a 500 after a schema change usually means `npm run dev` needs a restart (stale Prisma client)')
    }
  }
}

// ── commands ──
mkdirSync(OUT, { recursive: true })
const started = Date.now()
if (cmd === 'baseline') {
  const dir = join(OUT, 'baseline')
  if (existsSync(dir) && !argv.includes('--force')) fail('a baseline already exists — pass --force to replace it (only at the start of a ticket)')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  backupDb(dir)
  await snapshot(dir)
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ takenAt: new Date().toISOString(), layers }, null, 1))
  log(`baseline saved (${((Date.now() - started) / 1000).toFixed(1)}s)`)
} else if (cmd === 'check') {
  if (!existsSync(join(OUT, 'baseline'))) fail('no baseline yet — run `npm run regress:baseline` first')
  const dir = join(OUT, 'runs', opt('name', new Date().toISOString().replace(/[:.]/g, '-')))
  await snapshot(dir)
  process.exitCode = node('compare.mjs', join(OUT, 'baseline'), dir, ...allow)
  log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
} else {
  fail(`unknown command "${cmd}" (baseline | check)`)
}
