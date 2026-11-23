# Gmail iOS dark mode lock + X7 V2 fluid promo cards: decisions

Date: 2026-11-19 → 2026-11-24 · Branch: `staging` · Commit: `cb4253d` · Migration: none

## Context
- All four brands are dark designs: a black container, white text and a coloured CTA.
- In dark mode, the Gmail iPhone app **inverts** inline colours. Black becomes white, white text becomes black, and the red CTA becomes salmon with black text. The live banner text turned black too.
- Gmail light mode, Gmail web and Apple Mail (light and dark) were already fine. Nothing may change there.
- Emails go out through Customer.io (CIO). The main workflow pastes MailCraft's clean HTML into a **drag-and-drop HTML block**. That block strips the email's `<head>`: `<meta name>`, `<link href>`, `<style>`/`@media` and MSO comments. Only inline markup survives.

## Decisions

### 1. Which techniques were tested on a device, and the result
POCs were sent through CIO to Gmail on iPhone in dark mode:
- **Works:** a one-colour `background-image: linear-gradient(C, C)` next to `background-color: C`. Gmail does not invert gradients, so backgrounds keep their colour.
- **Works:** white text wrapped in two **inline** spans: a black background with `mix-blend-mode: screen`, wrapping a black background with `mix-blend-mode: difference`. Gmail's inversion cancels itself out, and in every other client the blend changes nothing. **Only white survives the maths**, so only white text is locked.
- **Failed:** class-based Gmail CSS (`u + .body …`), even in a `data-embed` style block. It was dropped or never matched.
- **Failed:** `background-clip: text` (gradient-painted text).
- **Rejected:** `<meta name="color-scheme" content="light only">`. Since September 2026 the Gmail apps honour it (Google accounts only), and through the CIO **Code** editor it keeps the colours. But Gmail then shows a white margin around the email, and drag-and-drop strips the tag anyway.
- **Reference POC (device-approved):** `Approved Emails/X7 Casino V2/poc/dark-mode-poc-F.html`

### 2. The lock is a transform at export time, not a master edit
- **Decision:** `lib/emailDarkMode.ts` → `lockGmailDarkMode(html)` runs as the **last step** of `buildSectionTransformer`, after custom blocks are composed.
- **Why:** one place covers every brand and every source of markup: the masters, the banner text box, body paragraphs, the V2 layouts, thumbnails, custom blocks and future masters. The master files stay clean, and the editor preview is unchanged because light mode looks identical.
- **Rules:**
  - Any inline background, or `bgcolor`-only element, with luminance ≤ 0.3 gets the gradient twin. Light backgrounds are never touched, so dark text on a light block stays as it is today.
  - Text whose own or inherited colour is white (luminance ≥ 0.9) is wrapped inside its nearest block element (block pair) or inline-block element such as the CTA `<a>` (inline-block pair). A cell that contains tables is never wrapped as a whole.
  - `:hover` rules with a dark `background-color` get a gradient twin, so the CTA hover still works.
  - The wrappers sit inside `<!--[if !mso]><!-->`, because Outlook paints span backgrounds but can't blend them.
  - The transform is idempotent and makes **insertions only**. The original HTML is never re-serialised.

### 3. Scope: built-in masters only, blocks included (D1, D2)
- **Decision:** `darkModeLock: !master.isImported` is passed on all 7 export call sites: html, clean, zip, admin view, the sections route, saved create and saved update.
- **Blocks are locked (D1):** a default text block is white on the master's black background, which is now locked. Without the lock, Gmail would turn its text black on black, making it invisible.
- **Imported (`imp-*`) masters are left as they are (D2):** their designs are unknown and weren't tested.

### 4. X7 V2 + Whitelist promo cards are fluid-hybrid with a ring border (D3, D4)
- **Problem:**
  - Drag-and-drop strips the `@media` that stacked the cards on phones, so they stayed side by side with uneven heights.
  - Gmail iOS also inverts **border** colours, and gradients can't fix borders.
- **Decision (10 master files, X7 V2 + Whitelist only, D3):**
  - The card region becomes 272px `inline-block` columns plus an Outlook ghost table. They sit side by side on desktop and stack on phones with **no media query**.
  - The card border becomes a 1px `#2a2d3a` padding ring, which the lock can keep dark.
  - New `.promo-fluid`/`.promo-gutter` rules inside the existing `@media` block keep the old stacked-70% look in clients that support media queries (Apple Mail, the CIO Code editor). This is optional: the layout doesn't depend on it.
- **`lib/v2Layouts.ts` (D4):**
  - The Welcome step dividers become 1px rows instead of `border-top`/`border-bottom`.
  - The Free Spins chips get a 1px ring. The white game name is its own inline-block, so the red bullet stays outside the lock.
- **Other brands' 3-card rows:** unchanged (out of scope by D3). They still get the colour lock.

### 5. Proof of no regression: strip-compare
- **Decision:** `stripGmailDarkMode()` removes exactly what the lock adds. The regression gate (`strip-compare.ts` in `run.mjs`) requires every changed render to satisfy `strip(after) === before`, unless it is listed as an intended structural change (`strip:` lines in `.out/allow.txt`).
- **Result at hand-off:**
  - 128 renders identical
  - 9 differ only by the lock (Stakes saved template + block fixtures)
  - 137 intended (X7 V2 + Whitelist), all confined to the THUMBNAILS section (plus BODY for Welcome/Free Spins)
  - 0 other
- **Pixel checks (Edge):**
  - With `@media` at 375/600/800px: max difference 20/255, and only anti-aliasing on the chips' rounded edges.
  - Without `@media`: the cards stack exactly like POC F.

### 6. Regression suite extended
- **Snapshot (`snapshot-logic.ts`) adds:**
  - banner-on variants (white, gold and black text)
  - the V2 Welcome and Free Spins bodies
  - every saved template through the export path (with the flag)
  - default custom-block fixtures in each built-in master
  - a full HTML dump per render
- **`assert-dark-mode.ts` (609 asserts):**
  - unit cases
  - over the whole corpus: exact strip, idempotence, no light background locked, zero white text left unlocked
  - `lock(V2) == POC F` outside the cards
  - guards on the new card and chip structure

### 7. Known limitation (Gmail iOS dark only)
- A coloured element **inside** locked white text gets a shifted colour instead of Gmail's usual one. Examples: a link in a custom text block, or the red numbers in centre-aligned Welcome steps.
- Grey (#888) and red text outside white blocks still shift slightly, as they did before (only white can be locked). This was accepted during device testing.

## Ops notes
- **No migration and no deploy script.** The colour lock is live as soon as the app restarts.
- **Master HTML is cached in Redis for 1 hour** (`mailcraft:master:html:*`). The new V2 card layout can take up to 1 hour to appear after deploy, unless those keys are flushed.
- **CIO drag-and-drop:** set the HTML block padding to **0** and the email/content background to **#000000**. Otherwise CIO's wrapper adds white strips above and below the email.
- **Emails already pasted into CIO** keep the old HTML until they are copied again from MailCraft.
