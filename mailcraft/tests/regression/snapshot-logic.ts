// Regression layer "logic": DB preset rows, preset fill output (presetSlotValues / activePresetId)
// and server renders of every active master. Read-only — nothing is written to the DB.
// Run through run.mjs (needs .env.development for the DB / Redis).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { prisma } from '@/lib/prisma'
import { activePresetId, mergeLangPatches, presetSlotValues, slotsFromFields } from '@/lib/thumbnailSlots'
import { buildSectionTransformer, renderTemplate } from '@/lib/services/renderService'
import { effectiveLockedFields } from '@/lib/masterLinks'
import type {
  FieldValue,
  Language,
  MultiLanguageFieldValues,
  SavedSectionConfig,
  TemplateFieldConfig,
} from '@/lib/types/template'
import type { CustomBlock, LayoutOrder } from '@/lib/types/blocks'
import type { ThumbnailPreset } from '@/lib/types/thumbnailPreset'
import { FIXTURE_PRESETS } from './fixtures'

type LangVals = Partial<Record<Language, Record<string, FieldValue>>>

const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16)

function defaults(fields: TemplateFieldConfig[], langs: Language[]): LangVals {
  const v: LangVals = {}
  for (const lang of langs) {
    const row: Record<string, FieldValue> = {}
    for (const f of fields) {
      if (f.type === 'paragraphs') row[f.key] = f.defaultParagraphsByLang?.[lang] ?? f.defaultParagraphs ?? []
      else row[f.key] = f.defaultValues?.[lang] ?? f.defaultValue ?? ''
    }
    v[lang] = row
  }
  return v
}

// 2026-11-19 (Gmail dark-mode ticket): optional render paths that are off in the defaults —
// banner text box (light / non-white light / dark text) and the X7 V2 body designs. Meta keys live on en.
const VARIANTS: Record<string, Record<string, string>> = {
  'banner:left-white': { _bannerBox: 'left', _bannerAlign: 'left' },
  'banner:center-gold': { _bannerBox: 'center', _bannerAlign: 'bottom', _bannerTitleColor: '#F5C542', _bannerSubColor: '#F5C542' },
  'banner:right-black': { _bannerBox: 'right', _bannerAlign: 'right', _bannerTitleColor: '#000000', _bannerSubColor: '#000000' },
  'body:welcome': { _bodyLayout: 'welcome' },
  'body:spins': { _bodyLayout: 'spins', _thumbStyle: 'icons', _moreHeading: 'on' },
}

const safeName = (key: string) => key.replace(/[^a-zA-Z0-9.-]+/g, '_')

function apply(base: LangVals, patch: LangVals): LangVals {
  const o: LangVals = {}
  for (const l of Object.keys(base) as Language[]) o[l] = { ...base[l], ...(patch[l] ?? {}) }
  return o
}

async function main() {
  const out = process.argv[2]
  if (!out) throw new Error('usage: snapshot-logic.ts <outDir>')
  mkdirSync(out, { recursive: true })

  // 1. Preset rows — the columns every version of the table has (new columns are checked by the API layer)
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    select id, brand::text as brand, kind, "imageUrl", labels, sublabels, links, "sortOrder", "createdAt", "updatedAt"
    from thumbnail_presets order by id`
  writeFileSync(join(out, 'rows.json'), JSON.stringify(rows, null, 1))

  // 2. DB shape + every other table this app owns (hash per table, volatile timestamps dropped).
  //    A ticket that adds a column shows up here as an intended diff; anything else is a regression.
  const columns = await prisma.$queryRaw<{ table_name: string; column_name: string; data_type: string; is_nullable: string }[]>`
    select table_name, column_name, data_type, is_nullable from information_schema.columns
    where table_schema = 'public' order by table_name, column_name`
  const schema: Record<string, string[]> = {}
  for (const c of columns) (schema[c.table_name] ??= []).push(`${c.column_name} ${c.data_type}${c.is_nullable === 'YES' ? ' null' : ''}`)
  const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
    select migration_name from _prisma_migrations where finished_at is not null order by migration_name`
  const hashRows = (rows: { j: unknown }[]) => ({ count: rows.length, sha: sha(JSON.stringify(rows.map((r) => r.j))) })
  const tables = {
    users: hashRows(await prisma.$queryRaw`select to_jsonb(t) - 'updatedAt' - 'lastLoginAt' as j from users t order by id`),
    master_templates: hashRows(await prisma.$queryRaw`select to_jsonb(t) - 'updatedAt' as j from master_templates t order by id`),
    saved_templates: hashRows(await prisma.$queryRaw`select to_jsonb(t) - 'updatedAt' as j from saved_templates t order by id`),
    folders: hashRows(await prisma.$queryRaw`select to_jsonb(t) - 'updatedAt' as j from folders t order by id`),
    shared_templates: hashRows(await prisma.$queryRaw`select to_jsonb(t) - 'updatedAt' as j from shared_templates t order by id`),
    cta_presets: hashRows(await prisma.$queryRaw`select to_jsonb(t) - 'updatedAt' as j from cta_presets t order by id`),
  }
  writeFileSync(
    join(out, 'db.json'),
    JSON.stringify({ schema, migrations: migrations.map((m) => m.migration_name), tables }, null, 1)
  )

  const dbPresets = (await prisma.thumbnailPreset.findMany({ orderBy: { id: 'asc' } })) as unknown as ThumbnailPreset[]
  const presets = [...dbPresets, ...FIXTURE_PRESETS]
  const masters = await prisma.masterTemplate.findMany({ where: { isActive: true }, orderBy: { slug: 'asc' } })

  const fills: Record<string, LangVals> = {}
  const active: Record<string, string> = {}
  const renders: Record<string, string> = {}
  // 2026-11-17: every href in each master's default render, readable (link-admin ticket)
  const links: Record<string, string[]> = {}
  let renderCount = 0
  // Full HTML of every render (gitignored .out) — lets a ticket prove a diff is only its intended markup
  const htmlDir = join(out, 'html')
  mkdirSync(htmlDir, { recursive: true })

  for (const m of masters) {
    const fields = m.editableFields as unknown as TemplateFieldConfig[]
    const langs = m.languages as unknown as Language[]
    const keys = fields.map((f) => f.key)
    const keySet = new Set(keys)
    const slots = slotsFromFields(keys)
    const base = defaults(fields, langs)
    const brandPresets = presets.filter((p) => p.brand === m.brand)

    const render = async (tag: string, vals: LangVals) => {
      for (const lang of langs) {
        const key = `${m.slug}|${lang}|${tag}`
        // Stale imported masters can point at files that no longer exist
        if (!existsSync(join(m.baseFilePath, `${lang}.html`))) {
          renders[key] = 'missing-file'
          continue
        }
        const html = await renderTemplate({
          masterTemplateId: m.id,
          baseFilePath: m.baseFilePath,
          lang,
          brand: m.brand,
          // 2026-11-17: through the saved-template path, as a pre-snapshot (legacy) template
          lockedFields: effectiveLockedFields({ lockedFieldsSnapshot: null }, m),
          editableFields: fields,
          fieldValues: vals as unknown as MultiLanguageFieldValues,
        })
        renders[key] = sha(html)
        writeFileSync(join(htmlDir, `${safeName(key)}.html`), html)
        if (tag === 'defaults') links[key] = [...new Set([...html.matchAll(/href="([^"]*)"/g)].map((x) => x[1]))].sort()
        renderCount++
      }
    }

    await render('defaults', base)
    for (const [tag, meta] of Object.entries(VARIANTS)) {
      if (tag.startsWith('body:') && m.brand !== 'X7_V2') continue
      await render(tag, apply(base, { en: meta }))
    }
    for (const slot of slots) active[`${m.slug}|${slot.prefix}|defaults`] = activePresetId(brandPresets, slot, langs, keySet, base)

    for (const p of brandPresets) {
      const patches: LangVals[] = []
      for (const slot of slots.filter((s) => s.kind === p.kind)) {
        const patch = presetSlotValues(p, slot.prefix, langs, keySet, base)
        fills[`${m.slug}|${slot.prefix}|${p.id}`] = patch
        patches.push(patch)
        active[`${m.slug}|${slot.prefix}|after:${p.id}`] = activePresetId(brandPresets, slot, langs, keySet, apply(base, patch))
      }
      if (patches.length) await render(`all:${p.id}`, apply(base, mergeLangPatches(patches)))
    }
  }

  // Every saved template, through the same path as the HTML export route (render + section transformer)
  const saved = await prisma.savedTemplate.findMany({ include: { masterTemplate: true }, orderBy: { id: 'asc' } })
  for (const t of saved) {
    const m = t.masterTemplate
    const transformer = buildSectionTransformer(t.sectionConfig as unknown as SavedSectionConfig[], {
      customBlocks: t.customBlocks as unknown as CustomBlock[] | null,
      layoutOrder: t.layoutOrder as unknown as LayoutOrder | null,
      brand: m.brand,
      darkModeLock: !m.isImported, // same flag as every export route
    })
    for (const lang of m.languages as unknown as Language[]) {
      const key = `saved:${t.id}|${lang}`
      if (!existsSync(join(m.baseFilePath, `${lang}.html`))) {
        renders[key] = 'missing-file'
        continue
      }
      const html = transformer(
        await renderTemplate({
          masterTemplateId: m.id,
          baseFilePath: m.baseFilePath,
          lang,
          brand: m.brand,
          lockedFields: effectiveLockedFields(t, m),
          editableFields: m.editableFields as unknown as TemplateFieldConfig[],
          fieldValues: t.fieldValues as unknown as MultiLanguageFieldValues,
        }),
        lang
      )
      renders[key] = sha(html)
      writeFileSync(join(htmlDir, `${safeName(key)}.html`), html)
      renderCount++
    }
  }

  // 2026-11-23 (Gmail dark-mode ticket): default custom blocks (text / button / divider) inside every built-in
  // master, through the export path — blocks are composed after the master render, then the lock runs last.
  const FIXTURE_BLOCKS: CustomBlock[] = [
    { id: 'fx-text', type: 'text', props: {}, content: { en: { html: '<p>Block text <strong>bold</strong></p>' } } },
    { id: 'fx-button', type: 'button', props: {}, content: { en: { label: 'Block CTA', href: 'https://example.com/cta' } } },
    { id: 'fx-divider', type: 'divider', props: {}, content: {} },
  ]
  for (const m of masters.filter((x) => !x.isImported)) {
    const fields = m.editableFields as unknown as TemplateFieldConfig[]
    if (!existsSync(join(m.baseFilePath, 'en.html'))) continue
    const transformer = buildSectionTransformer([], {
      customBlocks: FIXTURE_BLOCKS,
      layoutOrder: [
        { kind: 'section', name: 'HEADER' },
        { kind: 'section', name: 'BODY' },
        ...FIXTURE_BLOCKS.map((blk) => ({ kind: 'block' as const, id: blk.id })),
      ],
      brand: m.brand,
      darkModeLock: !m.isImported,
    })
    const html = transformer(
      await renderTemplate({
        masterTemplateId: m.id,
        baseFilePath: m.baseFilePath,
        lang: 'en',
        brand: m.brand,
        lockedFields: effectiveLockedFields({ lockedFieldsSnapshot: null }, m),
        editableFields: fields,
        fieldValues: defaults(fields, ['en']) as unknown as MultiLanguageFieldValues,
      }),
      'en'
    )
    const key = `fixture:blocks|${m.slug}|en`
    renders[key] = sha(html)
    writeFileSync(join(htmlDir, `${safeName(key)}.html`), html)
    renderCount++
  }

  writeFileSync(join(out, 'fills.json'), JSON.stringify(fills, null, 1))
  writeFileSync(join(out, 'active.json'), JSON.stringify(active, null, 1))
  writeFileSync(join(out, 'renders.json'), JSON.stringify(renders, null, 1))
  writeFileSync(join(out, 'links.json'), JSON.stringify(links, null, 1))
  console.log(
    `logic: rows ${rows.length} · masters ${masters.length} · presets ${presets.length} · fills ${Object.keys(fills).length} · active ${Object.keys(active).length} · renders ${renderCount}`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  // Redis / Prisma keep handles open
  .finally(() => setTimeout(() => process.exit(), 200))
