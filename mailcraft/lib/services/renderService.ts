import type {
  TemplateFieldConfig,
  LockedFieldConfig,
  MultiLanguageFieldValues,
  Language,
  SavedSectionConfig,
  FieldValue,
} from '@/lib/types/template'
import { LANGUAGES } from '@/lib/types/template'
import { readTemplateHtml, writeTemplateHtml } from '@/lib/services/fileService'
import { disableSection, deleteSection } from '@/lib/services/sectionService'
import { redis, CacheKeys, CacheTTL } from '@/lib/redis'
import { renderBodyParagraphs } from '@/lib/paragraphRenderer'

// ─────────────────────────────────────────────
// Section config transformer
// Applies sectionConfig (disable/delete) to rendered HTML
// ─────────────────────────────────────────────

export function buildSectionTransformer(
  sectionConfig: SavedSectionConfig[]
): (html: string) => string {
  return (html: string): string => {
    let result = html
    for (const section of sectionConfig) {
      if (section.isDeleted) {
        result = deleteSection(result, section.name)
      } else if (!section.isActive) {
        result = disableSection(result, section.name)
      }
    }
    return result
  }
}

// ─────────────────────────────────────────────
// Token injection
// Replaces {{TOKEN_NAME}} with a value
// CIO merge tags (*|...|*) are passed through as literal strings
// ─────────────────────────────────────────────

function injectTokens(html: string, tokens: Record<string, FieldValue>, brand = 'STAKES'): string {
  let result = html
  for (const [key, value] of Object.entries(tokens)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const replacement = Array.isArray(value)
      ? renderBodyParagraphs(value, brand)
      : value
    result = result.replace(new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g'), replacement)
  }
  return result
}

// ─────────────────────────────────────────────
// Read master template HTML with Redis cache
// ─────────────────────────────────────────────

async function getMasterHtml(
  masterTemplateId: string,
  baseFilePath: string,
  lang: Language
): Promise<string> {
  const cacheKey = CacheKeys.masterTemplateHtml(masterTemplateId, lang)

  const cached = await redis.get(cacheKey)
  if (cached) return cached

  const html = await readTemplateHtml(baseFilePath, lang)
  await redis.set(cacheKey, html, 'EX', CacheTTL.masterTemplateHtml)
  return html
}

// ─────────────────────────────────────────────
// Invalidate master template cache
// Call when admin updates a master template
// ─────────────────────────────────────────────

export async function invalidateMasterTemplateCache(
  masterTemplateId: string,
  languages: Language[] = LANGUAGES
): Promise<void> {
  await Promise.all(
    languages.map((lang) =>
      redis.del(CacheKeys.masterTemplateHtml(masterTemplateId, lang))
    )
  )
}

// ─────────────────────────────────────────────
// Render a saved template for one language
//
// Two-pass injection:
//   Pass 1: locked fields (from master) — logos, CIO tokens, footer links
//   Pass 2: editable fields (from user's saved fieldValues)
//
// Locked fields live only on master — updating master propagates to all clones
// ─────────────────────────────────────────────

export async function renderTemplate(params: {
  masterTemplateId: string
  baseFilePath: string
  lang: Language
  brand: string
  lockedFields: LockedFieldConfig[]
  editableFields: TemplateFieldConfig[]
  fieldValues: MultiLanguageFieldValues
}): Promise<string> {
  const { masterTemplateId, baseFilePath, lang, brand, lockedFields, fieldValues } = params

  const masterHtml = await getMasterHtml(masterTemplateId, baseFilePath, lang)

  // Pass 1: inject locked fields (all strings, brand irrelevant here)
  const lockedTokens: Record<string, string> = {}
  for (const field of lockedFields) {
    lockedTokens[field.key] = field.value
  }
  let html = injectTokens(masterHtml, lockedTokens)

  // Pass 2: inject user's editable field values for this language
  const langValues = fieldValues[lang] ?? {}
  html = injectTokens(html, langValues, brand)

  return html
}

// ─────────────────────────────────────────────
// Render and save all language files for a saved template
// ─────────────────────────────────────────────

export async function renderAndSaveAllLanguages(params: {
  masterTemplateId: string
  masterBaseFilePath: string
  savedBaseFilePath: string
  lang: Language
  brand: string
  lockedFields: LockedFieldConfig[]
  editableFields: TemplateFieldConfig[]
  fieldValues: MultiLanguageFieldValues
  sectionTransformer?: (html: string) => string
}): Promise<void> {
  const {
    masterTemplateId,
    masterBaseFilePath,
    savedBaseFilePath,
    lang,
    brand,
    lockedFields,
    editableFields,
    fieldValues,
    sectionTransformer,
  } = params

  let html = await renderTemplate({
    masterTemplateId,
    baseFilePath: masterBaseFilePath,
    lang,
    brand,
    lockedFields,
    editableFields,
    fieldValues,
  })

  if (sectionTransformer) {
    html = sectionTransformer(html)
  }

  await writeTemplateHtml(savedBaseFilePath, lang, html)
}
