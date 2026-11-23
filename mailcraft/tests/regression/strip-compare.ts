// Gmail dark-mode ticket: proves every changed render differs from the baseline ONLY by the lock markup —
// stripGmailDarkMode(run) must be byte-identical to the baseline render. Usage: strip-compare.ts <baselineDir> <runDir>
// Intended structural changes are listed in .out/allow.txt as `strip: <regex on the file name>` (each one reviewed).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { stripGmailDarkMode } from '@/lib/emailDarkMode'

const [baseDir, runDir] = process.argv.slice(2)
const base = baseDir && join(baseDir, 'logic/html')
const run = runDir && join(runDir, 'logic/html')
if (!base || !run || !existsSync(base) || !existsSync(run)) {
  console.log('  strip-compare: skipped (no HTML dump)')
  process.exit(0)
}

// <runDir> is .out/runs/<name>, so the ticket allow list is two levels up
const allowFile = join(runDir, '../../allow.txt')
const structural = existsSync(allowFile)
  ? readFileSync(allowFile, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('strip:'))
      .map((l) => new RegExp(l.slice(6).trim()))
  : []

let same = 0
let lockOnly = 0
let intended = 0
const bad: string[] = []
for (const f of readdirSync(run).filter((x) => x.endsWith('.html'))) {
  const b = join(base, f)
  if (!existsSync(b)) continue // new key — reported by compare.mjs
  const before = readFileSync(b, 'utf8')
  const after = readFileSync(join(run, f), 'utf8')
  if (after === before) same++
  else if (stripGmailDarkMode(after) === before) lockOnly++
  else if (structural.some((r) => r.test(f))) intended++
  else bad.push(f)
}
console.log(
  `  strip-compare: ${same} identical · ${lockOnly} differ only by the dark-mode lock · ${intended} intended structural (allow.txt) · ${bad.length} other`
)
if (bad.length) {
  bad.slice(0, 40).forEach((f) => console.error(`  STRIP-COMPARE FAIL ${f}`))
  process.exit(1)
}
