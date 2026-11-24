# X7 V2 (BL) + Whitelist (WL) footer refresh + CIO bullet-list fix: decisions

Date: 2026-11-24 · Branch: `staging` · Commit: `4f7af82` · Migration: none (data update via deploy script)

## Context
- **BL** = master "X7 Casino V2" (`x7-casino-v2-template`), **WL** = master "X7 Casino V2 Whitelist" (`x7-casino-v2-whitelist-template`). Same brand (`X7_V2`) and same design. Before this ticket the footers were also identical, apart from the links.
- The compliance footer changed:
  - **BL:** remove the payment logos, the red divider, the Play Responsibly and Kahnawake logos, and the Starscream / Kahnawake license text. The logo row becomes 18+ and GamCare, as in Stakes.
  - **WL:** remove Play Responsibly and Kahnawake and add GamCare. The payment logos and red divider stay. The license becomes Boni Tech Limited / Tobique Gaming Commission in EN/FR/DE/IT/ES.
  - **Links:**
    - BL 18+ and Responsible Gambling: `x7casino.com/{lang}/responsible-gaming`, DE on `x7casino2.com`
    - WL 18+ and Responsible Gambling: `x7casino.io/{lang}/responsible-gaming`, DE included
    - GamCare, both masters: `https://www.gamcare.org.uk/`
- **Bug (every brand):** bullet lists looked right in the editor preview, but in CIO and sent emails each bullet sat on its own line above the text.

## Decisions

### 1. Samples first, then the system (P1)
- **Decision:** before any system change, generate full-email samples for BL and WL in 5 languages, plus a bullet-list sample, in `Approved Emails/X7 Casino V2/footer-samples/`. They come from real master renders, with the new footer and the export lock applied.
- **Why:** the user approved the look, links and list fix through a CIO test send before anything shipped.
- **How it was applied:** the master HTML was edited with the **same transform** that built the samples. All 10 system footers are byte-identical to the approved samples.

### 2. Scope: new templates only
- **Decision:** values stored per template are **not** migrated: license text, Responsible Gambling link, link snapshots.
- **Consequence, accepted:** the master HTML is live, so existing templates still get the new layout.
  - Existing **BL** templates lose the payment row and the license (D2: the license token was removed from the BL HTML).
  - Existing **WL** templates get the new logo row, but keep their stored Starscream text and bare `x7casino.io` links.
  - A **duplicated** WL template swaps the old Responsible Gambling default for the new per-language link. This is D7 from the link-admin ticket, which uses `linkHistory`.

### 3. Bullet-list fix: wrap the whole list (D1)
- **Root cause:** the Gmail iOS dark-mode lock wrapped each `<li>`'s text in `display:block` blend spans. The list uses `list-style-position: inside`, so the block pushed the text below the marker. The preview has no lock, which is why it looked fine there.
- **Decision:** `lockGmailDarkMode` now wraps the whole `<ul>`/`<ol>` in a **div** blend pair (a div because a list inside a span is invalid HTML), and leaves list items alone.
- **Why:**
  - The marker and text stay on one line.
  - The white bullets are locked too.
  - The look is unchanged.
  - Lock and strip are still exact inverses.
- **Rejected:**
  - `list-style-position: outside`: the markers stay outside the lock, so Gmail iOS would turn them black.
  - Table-based bullets: these would change every list render.
- Verified by a CIO test send. Gmail iOS dark mode keeps the bullets and text white.

### 4. GamCare is a new locked key, and older templates fall back to the current links
- **Decision:**
  - New locked field `FOOTER_GAMCARE_LINK` on BL and WL.
  - `FOOTER_LOGO1_LINK` and `FOOTER_LOGO3_LINK` are dropped from both masters' current links (D3). Old snapshots keep them, which is harmless because the HTML no longer uses them.
- **Decision:** `effectiveLockedFields()` appends any key from the master's **current** links that is missing from a template's snapshot or from the baseline.
- **Why:** reusing `FOOTER_LOGO3_LINK` for GamCare would have pointed existing templates' GamCare logo at gamingcommission.ca. A new key would otherwise render as a raw `{{FOOTER_GAMCARE_LINK}}` in every older template.

### 5. License: field removed on BL, own field on WL (D2)
- **BL:** the `FOOTER_LICENSE` field and the `{{FOOTER_LICENSE}}` token are both removed.
- **WL:** `x7v2Whitelist.ts` puts its own `FOOTER_LICENSE` field (Boni Tech, 5 languages) before `FOOTER_LEGAL`. It's still editable per template.
- `prisma/templates/*` no longer imports from `@/lib`, because the `:migrate` image only contains `prisma/`.

### 6. Prod update: one script, two deploy steps
- **Script:** `prisma/seed-x7v2-footer.ts`. It never writes saved templates and aborts if the saved-template count changes.
- **`--phase=pre`** runs before `git pull`, while the old HTML is still on disk. It is add-only:
  - appends `FOOTER_GAMCARE_LINK` to the baseline and current links
  - sets the WL 18+ link per language, wherever it is still the bare default
  - it has no `|| echo` fallback, so if it fails the deploy stops before the new HTML is pulled
- **`--phase=post`** runs after the app restart, when the new HTML is live:
  - drops LOGO1/LOGO3 from the current links
  - removes the BL license field
  - sets the WL license defaults
  - changes the WL Responsible Gambling default link and pushes the old default into `linkHistory`
  - clears the BL/WL master HTML cache and the master list cache
  - `|| echo WARNING`, so a failure never fails the deploy
- **Safety:**
  - Links set in Admin → Links are kept, because only exact old defaults are replaced.
  - The baseline `lockedFields` is only ever appended to.
  - `--dry-run` prints the changes without writing.
  - JSON is compared with sorted keys, because Postgres JSONB reorders keys. Without that, a re-run was not a no-op.
- **Tested:** in a locally built `:migrate` image, on a clone restored from the pre-change dump: dry run, then pre, then post, then a re-run that changed nothing.

### 7. WL registered address: stop Gmail turning it into a blue Maps link (follow-up)
- **Problem:** Gmail auto-links "10 Manoel Street, Castries, Saint Lucia" as a blue Google Maps link. Our HTML has no link there, and head CSS cannot restyle Gmail's link because CIO strips it.
- **Device test (Gmail web, one email per variant, with V1 confirmed blue as the control):**
  - Still blue: `&zwnj;` (zero-width non-joiner), `&#8203;` (zero-width spaces), hidden `display:none` spans.
  - Grey: wrapping the address in a link with no `href` (V3), and a link with `href="#"` (V4).
- **Decision:** V3. WL `FOOTER_LICENSE` defaults (5 languages) wrap the address via `noAutoLink()` in `x7v2Whitelist.ts`: `<a style="color: #888888 !important; text-decoration: none !important;">…</a>`. Same in the WL CIO snippets.
- **Why not V4:** a `#` link would appear in Admin → Links and could be wrapped by CIO click tracking.
- **Caveat:** the editor (TipTap) drops links without `href`. If someone edits the WL License field by hand, the wrapper is lost and the address can turn blue again.
- **Prod:** `seed-x7v2-footer.ts --phase=post` updates the WL license default on the next deploy (new templates only).

## Regression
- **Baseline:** `assert-dark-mode.ts` now strips renders that the export path had already locked before testing them. The `lock(V2) == POC F` check was retired, because the V2 head and footer have moved on since the POC.
- **New asserts:**
  - lists: wrapped once outside the `<ul>`, exact strip, idempotent
  - the snapshot fallback
  - BL/WL locked keys and per-language links
  - WL Responsible Gambling defaults
  - per-language rendered footers: logo order, links, license, no payment row on BL
  - WL equals V2 with the links swapped, now compared **outside** the LEGAL section
- **Gate:** PASS. 149 reviewed diffs, all inside `SECTION:LEGAL` of BL/WL renders, plus master rows, the link inventory and the WL Admin → Links slots.
- **Corpus gap:** no saved template in the corpus had a list, so the unit asserts cover the list fix. A test template with a list (created during frontend testing) passed lock(strip(x)) = x with no white text left unlocked.

## Ops notes
- **No manual VPS step.** Both phases run from `deploy.yml`.
- **Don't run `npm run build` while `npm run dev` is running locally.** The build overwrites the shared `.next`, so the API regression layer fails partway and leaves `regress-*` presets and saved templates in the dev DB.
- **Emails already pasted into CIO** keep the old footer and the old list markup until they are copied again from MailCraft.
- **CIO footer snippets** (`CIO Snippets/Footer/x7-casino-v2*/`) were regenerated with the new footers and the dark-mode lock (gradient twins), matching the system exports.
