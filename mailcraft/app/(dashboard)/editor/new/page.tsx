import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMasterTemplateById } from '@/lib/services/templateService'
import { redis, CacheKeys, CacheTTL } from '@/lib/redis'
import { readTemplateHtml } from '@/lib/services/fileService'
import EditorClient from '@/components/editor/EditorClient'
import type {
  TemplateFieldConfig,
  LockedFieldConfig,
  MultiLanguageFieldValues,
  SavedSectionConfig,
  Language,
} from '@/lib/types/template'
import { LANGUAGES } from '@/lib/types/template'

export const metadata = {
  title: 'New Template — MailCraft',
}

interface NewEditorPageProps {
  searchParams: Promise<{ master?: string }>
}

function injectLockedFields(html: string, lockedFields: LockedFieldConfig[]): string {
  let result = html
  for (const field of lockedFields) {
    const escaped = field.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), field.value)
  }
  return result
}

export default async function NewEditorPage({ searchParams }: NewEditorPageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const { master: masterId } = await searchParams
  if (!masterId) redirect('/templates')

  const masterTemplate = await getMasterTemplateById(masterId)
  if (!masterTemplate || !masterTemplate.isActive) redirect('/templates')

  const editableFields = masterTemplate.editableFields as unknown as TemplateFieldConfig[]
  const lockedFields = masterTemplate.lockedFields as unknown as LockedFieldConfig[]

  const masterRaw = masterTemplate as unknown as { languages?: unknown }
  const masterLanguages = (masterRaw.languages as Language[]) ?? []
  const supportedLanguages: Language[] = masterLanguages.length > 0 ? masterLanguages : LANGUAGES

  // Default field values from field definitions — supports per-language overrides via defaultValues
  const defaultFieldValues: MultiLanguageFieldValues = { en: {}, fr: {}, frca: {}, de: {}, it: {}, es: {} }
  for (const lang of supportedLanguages) {
    for (const field of editableFields) {
      if (field.type === 'paragraphs') {
        defaultFieldValues[lang][field.key] =
          field.defaultParagraphsByLang?.[lang] ?? field.defaultParagraphs ?? []
      } else {
        const value = field.defaultValues?.[lang] ?? field.defaultValue
        if (value !== undefined) {
          defaultFieldValues[lang][field.key] = value
        }
      }
    }
  }

  const defaultSectionConfig: SavedSectionConfig[] = []

  // Fetch master preview HTML (locked fields injected, editable tokens left in place)
  let masterPreviewHtml = ''
  try {
    const cacheKey = CacheKeys.masterTemplateHtml(masterId, 'en')
    let rawHtml: string | null = null
    try {
      rawHtml = await redis.get(cacheKey)
    } catch {
      // Redis unavailable — fall through to disk read
    }
    if (!rawHtml) {
      rawHtml = await readTemplateHtml(masterTemplate.baseFilePath, 'en')
      redis.set(cacheKey, rawHtml, 'EX', CacheTTL.masterTemplateHtml).catch(() => {})
    }
    masterPreviewHtml = injectLockedFields(rawHtml, lockedFields)
  } catch {
    // HTML file not found
  }

  const brandLabel =
    masterTemplate.brand === 'STAKES' ? 'Stakes'
    : masterTemplate.brand === 'STAKES_CASINO' ? 'Stakes Casino'
    : 'X7 Casino'
  const defaultName = `${brandLabel} — ${masterTemplate.name}`

  return (
    <EditorClient
      masterTemplate={{
        id: masterTemplate.id,
        name: masterTemplate.name,
        brand: masterTemplate.brand,
        editableFields,
      }}
      savedTemplateId={null}
      savedTemplateName={defaultName}
      fieldValues={defaultFieldValues}
      sectionConfig={defaultSectionConfig}
      masterPreviewHtml={masterPreviewHtml}
      isOwner={true}
      supportedLanguages={supportedLanguages}
    />
  )
}
