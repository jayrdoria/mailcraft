import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { createImportSchema } from '@/lib/schemas'
import { prisma } from '@/lib/prisma'
import {
  injectPlaceholders,
  buildEditableFields,
  saveHtmlFiles,
  buildImportSlug,
  buildImportBasePath,
} from '@/lib/services/htmlImportService'
import type { Language, TemplateFieldConfig } from '@/lib/types/template'

// POST /api/import/create
// Creates only the hidden MasterTemplate + saves HTML files to disk.
// No SavedTemplate is created here — the editor's normal save flow handles that,
// keeping UX consistent with regular templates (no export until after first save).
export const POST = apiHandler(async (req) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const body = await req.json()
  const parsed = createImportSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name, brand, activeLanguages, html, fieldMappings } = parsed.data

  // Replace mapped elements with {{KEY}} tokens.
  // initialValues holds the original content extracted from each mapped element.
  const { placeholderHtml, initialValues } = injectPlaceholders(html, fieldMappings)

  // Build editable field definitions, then populate defaultValue from the extracted
  // original content so the editor pre-fills with real content instead of blank fields.
  const editableFields: TemplateFieldConfig[] = buildEditableFields(fieldMappings).map((field) => ({
    ...field,
    defaultValue: initialValues[field.key] ?? '',
  }))

  // Generate a unique slug and resolve the disk path
  const slug = buildImportSlug(session.user.id, name)
  const baseFilePath = buildImportBasePath(slug)

  // Save the placeholder HTML for every selected language
  try {
    await saveHtmlFiles(placeholderHtml, baseFilePath, activeLanguages as Language[])
  } catch (err) {
    console.error('[import/create] Failed to save HTML files:', err)
    return apiError('Failed to save template files', 500)
  }

  // Create the hidden MasterTemplate that backs this import
  const master = await prisma.masterTemplate.create({
    data: {
      name,
      slug,
      brand,
      isImported: true,
      importedBy: session.user.id,
      baseFilePath,
      editableFields: editableFields as unknown as object,
      lockedFields: [],
      languages: activeLanguages as unknown as object,
      isActive: true,
    },
  })

  return apiSuccess({ masterTemplateId: master.id }, 'Import ready', 201)
})
