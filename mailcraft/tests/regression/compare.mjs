// Diffs a regression run against the baseline.
// Usage: node compare.mjs <baselineDir> <runDir> [allowRegex ...]
// Every difference is printed; ones whose path matches an allow regex are marked ALLOWED (intended change, review them),
// anything else is a REGRESSION and the exit code is 1. A new `imageUrls` key is ignored only when it is null.
import { existsSync, readFileSync } from 'node:fs'
const [base, after, ...allow] = process.argv.slice(2)
const allowRe = allow.map((a) => new RegExp(a))
const FILES = ['logic/db.json', 'logic/rows.json', 'logic/fills.json', 'logic/active.json', 'logic/renders.json', 'api.json']
const NEW_NULLABLE = new Set(['imageUrls'])
let regress = 0, allowed = 0
const out = (path, a, b) => {
  const ok = allowRe.some((r) => r.test(path))
  if (ok) allowed++
  else regress++
  const s = (v) => (v === undefined ? '∅' : JSON.stringify(v)).slice(0, 400)
  console.log(`${ok ? 'ALLOWED   ' : 'REGRESSION'} ${path}\n    before: ${s(a)}\n    after:  ${s(b)}`)
}
const diff = (a, b, path) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    if (Array.isArray(a) && a.length !== b.length) return out(path, a, b)
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      if (!(k in a) && NEW_NULLABLE.has(k) && b[k] === null) continue
      diff(a[k], b[k], `${path}|${k}`)
    }
    return
  }
  out(path, a, b)
}
for (const f of FILES) {
  if (!existsSync(`${after}/${f}`)) { console.log(`SKIPPED    ${f} (not in after run)`); continue }
  diff(JSON.parse(readFileSync(`${base}/${f}`, 'utf8')), JSON.parse(readFileSync(`${after}/${f}`, 'utf8')), f)
}
console.log(`\n${regress === 0 ? 'GATE PASS' : 'GATE FAIL'} — regressions ${regress} · allowed (intended, reviewed) ${allowed}`)
process.exitCode = regress === 0 ? 0 : 1
