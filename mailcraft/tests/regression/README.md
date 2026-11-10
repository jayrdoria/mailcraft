# Regression suite (backend)

Local-only safety net for routes + DB, ~5–20s. Snapshot before a ticket, diff after every phase. Never run against prod.
The frontend is checked by hand.

```bash
npm run regress:baseline        # start of a ticket, before any code change (--force to replace an old baseline)
npm run regress                 # after each phase — exit 1 on any regression
npm run regress -- --layers logic                          # no server needed (~3s)
npm run regress -- --allow "logic/db\.json\|schema\|thumbnail_presets$"   # intended change (regex on the diff path)
```

- **logic** — DB schema (every table's columns), migrations, row hashes of users / masters / saved templates /
  folders / shares / CTA presets, thumbnail preset rows, preset fill output for every master × slot × language,
  server render hashes of every active master, feature asserts (`assert-presets.ts`).
- **api** — `/api/thumbnail-presets` (+ duplicate) against the running `npm run dev` (:3000, or `REGRESS_URL`):
  statuses, messages, bodies, permissions. Temp presets (`https://example.com/regress-*`) are always deleted;
  the test users' rate-limit counters are reset first. After a schema change, restart `npm run dev` first.

Needs local Postgres + Redis (docker compose) and `.env.development`.
Output goes to `tests/regression/.out/` (gitignored): `baseline/` (+ `db.dump` backup), `runs/<name>/`, cookies.
Intended changes for the current ticket can also go in `.out/allow.txt` (one regex per line).

Extending: add cases to `fixtures.ts` / `assert-presets.ts` / the snapshot scripts, then retake the baseline
**before** changing app code.
