# Admin → Links, X7 Casino V2 Whitelist, Stakes FR/IT 18+ fix: decisions

Date: 2026-11-17 · Branch: `staging` · Migration: `20261117090000_master_link_admin`

## Context
- The Stakes 18+ footer logo link was one locked value (`https://stakes.com/responsible-gaming`) for every language, so the FR and IT emails linked to `stakes.com`. FR and IT must always use `stakes3.com`.
- A whitelist version of X7 Casino V2 was needed, with every X7 link on `x7casino.io`.
- Changing a link meant a code change and a deploy. Admins need to edit links in the system, but only new templates may pick up an edit. Existing templates must never change.
- Links reached a render in three ways:
  - **Editable defaults** (logo, banner, CTA, forgot password, footer text) are copied into a template when it is created, so they already affected only new templates.
  - **Locked fields** (footer logo links) were injected live at every render, so editing one changed every existing template.
  - **Hardcoded links** in the master HTML (the X7 V2 per-language 18+ link) were also live.

## Decisions

### 1. Locked links can differ per language
- **Decision:** `LockedFieldConfig` gains an optional `values` map, keyed by language. A language without an entry uses `value`.
- **Code:** `lib/lockedFields.ts` (`lockedValue` / `lockedTokensFor` / `injectLockedFields`). Every render, preview and editor path uses it.
- **Stakes:** `FOOTER_LOGO1_LINK` gets `values: { fr: stakes3, it: stakes3 }`. FRCA, EN, DE and ES keep `stakes.com`.

### 2. The Stakes fix also applies to existing templates (D1)
- **Decision:** the fix is made on the master's baseline `lockedFields`, which existing templates render with.
- **Why:** it's a bug. The "old templates never change" rule covers edits made through Admin → Links, not bug fixes.
- **Accepted (intended) change:** existing Stakes FR/IT exports now link the 18+ logo to `stakes3.com`. This was the only render difference from the baseline.

### 3. The X7 V2 18+ link moves from hardcoded HTML to a locked link
- **Decision:** `x7-v2/{lang}.html` now carries `{{FOOTER_LOGO2_LINK}}`. A per-language locked field (`X7V2_LOGO2_LINK`) holds the same five URLs.
- **Why:** links that stay hardcoded in HTML can't be edited in the system and always apply to every template.
- **Result:** X7 V2 renders are byte-identical to before (regression-checked).

### 4. Templates keep their own copy of the locked links
- **Decision:** there are now three places a locked link can come from:
  - `master.lockedFields`: the **baseline**. Templates created before this ticket (snapshot NULL) render with it, so they never change.
  - `master.currentLockedFields`: what Admin → Links sets. It's NULL until a locked link is first edited, and NULL means "same as the baseline".
  - `saved.lockedFieldsSnapshot`: a copy of the current links, stored on every new template and duplicate.
- **Why:** this is the only way to edit links without touching existing templates, and no saved-template rows had to be backfilled.
- **Code:** `lib/masterLinks.ts` (`currentLockedFields` / `effectiveLockedFields`). The create, duplicate, update, html, clean, zip, sections, admin view and editor paths all go through it.
- **Why `currentLockedFields` starts NULL:** baseline fixes shipped by seed scripts keep reaching new templates until an admin actually edits a locked link.

### 5. Duplicates take the current links (D6), and stale defaults are refreshed (D7)
- **Decision:** a duplicate gets the master's current locked links. Any field value that still exactly equals a *previous* default is switched to the current default. Links the user typed themselves are kept.
- **How:** each link edit appends the old default to `master.linkHistory`, keyed by field and language. `refreshStaleDefaults()` runs on duplicate.
- **Accepted edge:** a user who deliberately typed exactly the old default gets it swapped.

### 6. X7 Casino V2 Whitelist is its own master (D2–D4)
- **Decision:** a new master "X7 Casino V2 Whitelist" (`x7-casino-v2-whitelist-template`) with brand `X7_V2` (the same design, fields and presets).
- **Links:** every `x7casino.com` / `x7casino2.com` link becomes the bare `https://x7casino.io`, including DE. The `gamingcommission.ca` links stay. This is derived in code (`toWhitelistLinks`), so it follows the V2 config.
- **HTML:** a separate copy in `master-templates/x7-v2-whitelist/`. A future V2 HTML edit can't add a `.com` link to the whitelist master. The cost is that a V2 design change has to be copied over.
- **Regression proof:** the whitelist render equals the V2 render with only its links swapped, in all 5 languages.
- **Accepted cost:** thumbnail and CTA presets are shared with X7 V2, so filling them inserts `.com` links. Edit those links on the presets pages.
- **Accepted cost:** URL fields go through the existing `sanitizeUrl`, which adds a trailing slash (`https://x7casino.io/`). Locked links don't. Both are the same link. The shared sanitizer was left untouched.

### 7. Admin → Links page (D5)
- **Decision:** a "Links" button on every master card opens `/admin/master-templates/[id]/links`. It shows one slot per language for:
  - editable url/link fields, excluding images (`*_IMG`)
  - each `href` inside richtext defaults
  - locked links, excluding CIO read-only tokens
- **Edit options:** single edits, or a bulk "Replace in all links" (find ≥ 3 characters) that changes only link addresses, never text or images.
- **Per-language storage:** when one language of an all-language default is edited, the field becomes per-language. When every language ends up with the same locked link, it collapses back to a single value.
- **API:** `GET/PUT /api/admin/master-templates/[id]/links`. It is admin-only, Zod-validated, rate-limited (30/min), logs `MASTER_LINKS_UPDATED` and clears the master list cache.

### 8. New links are validated strictly
- **Decision:** a link must be `http(s)://`, `mailto:`, `tel:`, `#…`, or a CIO token (`{{ … }}` / `{% … %}`). It may not contain quotes, angle brackets, backticks, backslashes or whitespace (except inside `{% %}`), and it is capped at 2000 characters. A bulk replace is validated on its results.
- **Why:** locked values are injected into the HTML unescaped, and richtext hrefs are spliced in place. A quote or `javascript:` would be HTML or script injection.

### 9. Concurrent edits are rejected, not merged
- **Decision:** a PUT carries the master's `updatedAt`, and every edit carries the URL the admin saw (`from`). A mismatch returns 409 and the page reloads.
- **Why:** two admins (or two tabs) can't silently overwrite each other.

### 10. Deploy order: locked links before `git pull`
- **Decision:** `prisma/seed-locked-links.ts` (add-only, idempotent) runs **before** `git pull` and before `migrate deploy`, with no `|| echo` (a failure stops the deploy and leaves the app untouched). `prisma/seed-x7v2-whitelist.ts` (create-only) runs after the app restart, like the other master scripts.
- **Why:** the new V2 HTML uses `{{FOOTER_LOGO2_LINK}}`. The DB must already have that field when the file lands on disk, or the old app would render the token literally. Until the restart, the old app ignores `values`, so V2 18+ falls back to the EN link for a few seconds.
- **Gotcha found in review:** the script uses `updateMany`, not `update`. `update` returns every column, and the migration's new columns don't exist yet at that point. Proven by replaying the full deploy order on a restore of the pre-migration DB; reruns change nothing.

### 11. Migration is strictly additive
- **Decision:** the migration adds `master_templates.currentLockedFields`, `master_templates.linkHistory` and `saved_templates.lockedFieldsSnapshot` (all nullable JSONB with no default) and the enum value `MASTER_LINKS_UPDATED`. It runs in one transaction.
- **Why:** no existing row changes. NULL means "behave exactly as before".

### 12. Regression suite extended
- **logic:**
  - `links.json` lists every href per master and language, so link diffs are readable.
  - Renders go through the saved-template path as a pre-snapshot template.
  - `assert-links.ts` has 67 asserts (per-language links, snapshots, D7 refresh, the link service and its validation, the whitelist equivalence).
- **api:** 18 `links-*` cases covering:
  - permissions
  - validation
  - 409s
  - bulk replace
  - old template unchanged, while a new clone and a duplicate get the new links
- **Cleanup:** the Whitelist master is backed up and restored around the api layer (`links-master.ts`, `restore-api.ts`), even after a failed run.
- **Result:** the gate passed, with only the intended diffs (Stakes FR/IT, the new columns and migration, the new master).
