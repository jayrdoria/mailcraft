import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
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

interface EditorPageProps {
  params: Promise<{ savedId: string }>
}

export async function generateMetadata({ params }: EditorPageProps) {
  const { savedId } = await params
  const saved = await prisma.savedTemplate.findUnique({
    where: { id: savedId },
    select: { name: true },
  })
  return { title: `${saved?.name ?? 'Edit'} — MailCraft` }
}

function injectLockedFields(html: string, lockedFields: LockedFieldConfig[]): string {
  let result = html
  for (const field of lockedFields) {
    const escaped = field.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), field.value)
  }
  return result
}

export default async function EditorPage({ params }: EditorPageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const { savedId } = await params
  const isAdmin = session.user.role === 'ADMIN'

  const saved = await prisma.savedTemplate.findFirst({
    where: isAdmin
      ? { id: savedId }
      : {
          id: savedId,
          OR: [
            { userId: session.user.id },
            { sharedWith: { some: { sharedWithId: session.user.id } } },
          ],
        },
    include: { masterTemplate: true },
  })

  if (!saved) redirect('/dashboard')

  const isOwner = saved.userId === session.user.id || isAdmin
  const editableFields = saved.masterTemplate.editableFields as unknown as TemplateFieldConfig[]
  const lockedFields = saved.masterTemplate.lockedFields as unknown as LockedFieldConfig[]
  const fieldValues = saved.fieldValues as unknown as MultiLanguageFieldValues
  const sectionConfig = saved.sectionConfig as unknown as SavedSectionConfig[]
  const masterRaw = saved.masterTemplate as unknown as { languages?: unknown }
  const masterLanguages = (masterRaw.languages as Language[]) ?? []
  const supportedLanguages: Language[] = masterLanguages.length > 0 ? masterLanguages : LANGUAGES

  // Fetch master preview HTML
  let masterPreviewHtml = ''
  try {
    const cacheKey = CacheKeys.masterTemplateHtml(saved.masterTemplate.id, 'en')
    let rawHtml = await redis.get(cacheKey)
    if (!rawHtml) {
      rawHtml = await readTemplateHtml(saved.masterTemplate.baseFilePath, 'en')
      await redis.set(cacheKey, rawHtml, 'EX', CacheTTL.masterTemplateHtml)
    }
    masterPreviewHtml = injectLockedFields(rawHtml, lockedFields)
  } catch {
    // HTML not on disk yet — preview won't show on first load
  }

  return (
    <EditorClient
      masterTemplate={{
        id: saved.masterTemplate.id,
        name: saved.masterTemplate.name,
        brand: saved.masterTemplate.brand,
        editableFields,
      }}
      savedTemplateId={saved.id}
      savedTemplateName={saved.name}
      fieldValues={fieldValues}
      sectionConfig={sectionConfig}
      masterPreviewHtml={masterPreviewHtml}
      isOwner={isOwner}
      supportedLanguages={supportedLanguages}
    />
  )
}
