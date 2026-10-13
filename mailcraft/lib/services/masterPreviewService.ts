import { redis, CacheKeys, CacheTTL } from '@/lib/redis'
import { readTemplateHtml } from '@/lib/services/fileService'
import type { Language } from '@/lib/types/template'

// ─────────────────────────────────────────────
// Raw master HTML per language for the editor preview.
// Same cache keys + files as renderService, so the preview and the exports read
// identical HTML. Missing files are skipped — the editor then falls back to the
// EN preview for that language (the pre-existing behaviour).
// ─────────────────────────────────────────────

export async function getMasterHtmlByLang(
  masterTemplateId: string,
  baseFilePath: string,
  languages: Language[]
): Promise<Partial<Record<Language, string>>> {
  const entries = await Promise.all(
    languages.map(async (lang): Promise<[Language, string | null]> => {
      const cacheKey = CacheKeys.masterTemplateHtml(masterTemplateId, lang)
      try {
        const cached = await redis.get(cacheKey)
        if (cached) return [lang, cached]
      } catch {
        // Redis unavailable — fall through to disk read
      }
      try {
        const html = await readTemplateHtml(baseFilePath, lang)
        redis.set(cacheKey, html, 'EX', CacheTTL.masterTemplateHtml).catch(() => {})
        return [lang, html]
      } catch {
        return [lang, null] // HTML file not found
      }
    })
  )

  const result: Partial<Record<Language, string>> = {}
  for (const [lang, html] of entries) {
    if (html !== null) result[lang] = html
  }
  return result
}
