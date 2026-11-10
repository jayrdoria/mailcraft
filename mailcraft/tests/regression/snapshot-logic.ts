// Regression layer "logic": DB preset rows, preset fill output (presetSlotValues / activePresetId)
// and server renders of every active master. Read-only — nothing is written to the DB.
// Run through run.mjs (needs .env.development for the DB / Redis).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { prisma } from '@/lib/prisma'
import { activePresetId, mergeLangPatches, presetSlotValues, slotsFromFields } from '@/lib/thumbnailSlots'
import { renderTemplate } from '@/lib/services/renderService'
import type {
  FieldValue,
  Language,
  LockedFieldConfig,
  MultiLanguageFieldValues,
  TemplateFieldConfig,
} from '@/lib/types/template'
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
  let renderCount = 0

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
          lockedFields: m.lockedFields as unknown as LockedFieldConfig[],
          editableFields: fields,
          fieldValues: vals as unknown as MultiLanguageFieldValues,
        })
        renders[key] = sha(html)
        renderCount++
      }
    }

    await render('defaults', base)
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

  writeFileSync(join(out, 'fills.json'), JSON.stringify(fills, null, 1))
  writeFileSync(join(out, 'active.json'), JSON.stringify(active, null, 1))
  writeFileSync(join(out, 'renders.json'), JSON.stringify(renders, null, 1))
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
