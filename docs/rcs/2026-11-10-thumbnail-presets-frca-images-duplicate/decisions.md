# Thumbnail presets — FRCA, per-language images, duplicate: decisions

Date: 2026-11-10 · Branch: `staging` · Migration: `20261110090000_thumbnail_preset_images`

## Context
- Thumbnail presets (Thumbnail Presets page → editor slot cards) stored text and links for EN / FR / DE / IT / ES only. FRCA silently reused FR.
- For Stakes that was wrong: the FR link is on `stakes3.com`, the FRCA link on `stakes.com`. Picking a preset gave FRCA the `stakes3` link.
- A preset had one image for every language, so artwork with translated text couldn't be used.
- Presets couldn't be copied; making a variant meant re-typing every language.
- Stakes is the only brand with FRCA. Stakes Casino is EN only; X7 and X7 V2 have no FRCA.

## Decisions

### 1. FRCA is an optional key in the existing JSON, not a column
- **Decision:** `labels`, `sublabels` and `links` may carry an optional `frca` key. No schema change for it.
- **Why:** existing rows stay valid as they are, nothing to backfill, and every brand without FRCA keeps the exact same shape.
- **Code:** `PresetTexts` in `lib/types/thumbnailPreset.ts`; `hasFrca()` / `FRCA_PRESET_BRANDS` (Stakes only).

### 2. FRCA is kept for Stakes only — the server strips it elsewhere
- **Decision:** `presetWriteData()` drops `frca` (texts and image) for any brand not in `FRCA_PRESET_BRANDS`, and drops a blank `frca` instead of storing `''`.
- **Why:** the server is the source of truth; a stale form or API call can't store FRCA data on a brand that never renders it.

### 3. Blank FRCA: text falls back to FR, the link never does (D2)
- **Decision:** blank FRCA label / sublabel → the FR text. Blank FRCA link → the template keeps its own FRCA link. FRCA never borrows the FR link.
- **Why:** French wording is fine for Canada, but the FR and FRCA links point at different domains.
- **Accepted cost (intended behaviour change):** an existing Stakes preset without an FRCA link used to give FRCA the FR `stakes3` link; it now keeps the template's FRCA link. Add an FRCA link on the preset if a specific one is needed.
- **Code:** `presetText()` / `presetLink()`.

### 4. Per-language images are overrides on top of the main image
- **Decision:** new nullable `imageUrls JSONB` column holding only the languages that differ. `imageUrl` stays the default for every language. `NULL` = old behaviour.
- **Why:** strictly additive — old rows need no backfill and fill exactly as before; the form only shows extra rows when "Different image per language" is ticked.
- **FRCA image:** its own override, else the FR override, else the main image (French artwork carries over, like the label).
- **Code:** `presetImage()`; migration wrapped in a transaction, no default, no data touched.

### 5. Whitespace-only counts as blank in the new URL fields only
- **Decision:** per-language image URLs and the FRCA link treat `'  '` as blank. The existing per-language link validation was left as it was.
- **Why:** not changing validation that already works (strictly additive).
- **Accepted cost:** a small inconsistency between old and new URL fields.

### 6. Duplicate is an instant copy placed right after the original (D1)
- **Decision:** `POST /api/thumbnail-presets/:id/duplicate` copies everything (images, FRCA, links) and adds " (Copy)" to every label, trimmed so the label stays ≤ 100 characters. Later presets in the group shift down one, in the same transaction.
- **Why:** a one-click copy that's obviously a copy until it's renamed, sitting next to its source.
- **Accepted cost:** if nobody renames it, " (Copy)" would show up in emails that use it.

### 7. Editor: image edits can target one language (D3)
- **Decision:** the slot card's Edit panel has "All languages / <LANG> only". Default is All; it switches to "<LANG> only" on its own when the slot's languages already have different images, and shows a warning if All would overwrite them. Single-language templates keep the old label with no toggle.
- **Why:** without it, one manual paste silently replaces every translated image a preset filled in.
- **Picker and slot card** show the active language's image.

### 8. No seeded Stakes presets (D4)
- **Decision:** the migration adds the column only; Stakes presets are created on the page.
- **Why:** seeding could duplicate presets already added by hand in production.

### 9. POST and PATCH share one write path
- **Decision:** `presetWriteData()` in `lib/services/thumbnailPresetService.ts` builds the data for both.
- **Why:** FRCA stripping, blank handling and NULL storage can't drift between create and update.

### 10. Backend regression suite in the repo
- **Decision:** `mailcraft/tests/regression/`, run with `npm run regress:baseline` (before changing code) and `npm run regress` (after each step). Layers:
  - **logic** — DB schema, migrations, table hashes, preset rows, fill output, master renders, feature asserts.
  - **api** — preset endpoints against the running dev server.
- **Why:** regression first, without slowing development (~3s logic-only, ~10–20s full).
- **Tried and dropped:** a headless-browser UI layer (flaky preview timing, slow) and an isolated second app copy on :3001 (slow cold starts; background launch was killed on Windows). The frontend is checked by hand.
- **Notes:** output (baselines, local session cookies, DB backup) lives in the gitignored `.out/`; `tests/` is excluded from the Docker image. After a schema change the dev server must be restarted before the api layer runs (stale Prisma client — the runner says so).
