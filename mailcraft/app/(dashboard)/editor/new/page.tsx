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

  // Default field values from field definitions — supports per-language overrides via defaultValues
  const defaultFieldValues: MultiLanguageFieldValues = { en: {}, fr: {}, de: {}, it: {}, es: {} }
  for (const lang of LANGUAGES) {
    for (const field of editableFields) {
      const langSpecific = field.defaultValues?.[lang]
      const fallback = field.defaultValue
      const value = langSpecific ?? fallback
      if (value !== undefined) {
        defaultFieldValues[lang][field.key] = value
      }
    }
  }

  const defaultSectionConfig: SavedSectionConfig[] = []

  // Fetch master preview HTML (locked fields injected, editable tokens left in place)
  let masterPreviewHtml = ''
  try {
    const cacheKey = CacheKeys.masterTemplateHtml(masterId, 'en')
    let rawHtml = await redis.get(cacheKey)
    if (!rawHtml) {
      rawHtml = await readTemplateHtml(masterTemplate.baseFilePath, 'en')
      await redis.set(cacheKey, rawHtml, 'EX', CacheTTL.masterTemplateHtml)
    }
    masterPreviewHtml = injectLockedFields(rawHtml, lockedFields)
  } catch {
    // HTML files not yet on disk in dev
  }

  const defaultName = `${masterTemplate.brand === 'STAKES' ? 'Stakes' : 'X7 Casino'} — ${masterTemplate.name}`

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
    />
  )
}
