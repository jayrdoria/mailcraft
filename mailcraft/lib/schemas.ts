import { z } from 'zod'

// ─────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────

export const languageSchema = z.enum(['en', 'fr', 'frca', 'de', 'it', 'es'])

export const bodyParagraphSchema = z.object({
  id:   z.string().min(1),
  html: z.string(),
})

export const fieldValueSchema = z.union([
  z.string(),
  z.array(bodyParagraphSchema),
])

export const templateFieldConfigSchema = z.object({
  key:               z.string().min(1),
  label:             z.string().min(1),
  type:              z.enum(['url', 'text', 'richtext', 'link', 'paragraphs']),
  placeholder:       z.string().optional(),
  defaultRequired:   z.boolean(),
  defaultValue:      z.string().optional(),
  defaultValues:     z.record(languageSchema, z.string()).optional(),
  defaultParagraphs: z.array(bodyParagraphSchema).optional(),
  group:             z.string().optional(),
})

export const lockedFieldConfigSchema = z.object({
  key:        z.string().regex(/^[A-Z_]+$/, 'Key must be uppercase with underscores'),
  label:      z.string().min(1),
  value:      z.string(),
  note:       z.string().optional(),
  isReadOnly: z.boolean(),
})

export const savedSectionConfigSchema = z.object({
  name:      z.string().min(1),
  label:     z.string().min(1),
  isActive:  z.boolean(),
  isDeleted: z.boolean().optional(),
})

// ─────────────────────────────────────────────
// Custom blocks + layout order (MailCraft Blocks)
// ─────────────────────────────────────────────

export const blockTypeSchema = z.enum(['text', 'image', 'button', 'divider', 'spacer', 'columns'])

export const blockContentSchema = z.object({
  html:  z.string().optional(),
  src:   z.string().optional(),
  alt:   z.string().optional(),
  href:  z.string().optional(),
  label: z.string().optional(),
})

export const blockPropsSchema = z.object({
  align:            z.enum(['left', 'center', 'right']).optional(),
  paddingTop:       z.number().optional(),
  paddingBottom:    z.number().optional(),
  backgroundColor:  z.string().optional(),
  fontSize:         z.number().optional(),
  textColor:        z.string().optional(),
  width:            z.number().optional(),
  buttonColor:      z.string().optional(),
  buttonTextColor:  z.string().optional(),
  borderRadius:     z.number().optional(),
  lineColor:        z.string().optional(),
  lineThickness:    z.number().optional(),
  height:           z.number().optional(),
})

export const customBlockSchema = z.object({
  id:      z.string().min(1),
  type:    blockTypeSchema,
  props:   blockPropsSchema,
  content: z.record(languageSchema, blockContentSchema),
})

export const layoutItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('section'), name: z.string().min(1) }),
  z.object({ kind: z.literal('block'),   id:   z.string().min(1) }),
])

export const layoutOrderSchema = z.array(layoutItemSchema)

// ─────────────────────────────────────────────
// Master templates
// ─────────────────────────────────────────────

export const createMasterTemplateSchema = z.object({
  name:           z.string().min(1).max(100),
  brand:          z.enum(['STAKES', 'X7']),
  description:    z.string().optional(),
  editableFields: z.array(templateFieldConfigSchema),
  lockedFields:   z.array(lockedFieldConfigSchema),
  languages:      z.array(languageSchema).optional(),
})

export const updateMasterTemplateSchema = z.object({
  name:           z.string().min(1).max(100).optional(),
  description:    z.string().optional(),
  editableFields: z.array(templateFieldConfigSchema).optional(),
  lockedFields:   z.array(lockedFieldConfigSchema).optional(),
  languages:      z.array(languageSchema).optional(),
})

// ─────────────────────────────────────────────
// Saved templates
// ─────────────────────────────────────────────

export const createSavedTemplateSchema = z.object({
  name:             z.string().min(1).max(150),
  masterTemplateId: z.string().cuid(),
  fieldValues:      z
    .record(languageSchema, z.record(z.string(), fieldValueSchema))
    .optional()
    .default({ en: {}, fr: {}, frca: {}, de: {}, it: {}, es: {} }),
  sectionConfig: z.array(savedSectionConfigSchema).optional().default([]),
  customBlocks:  z.array(customBlockSchema).optional(),
  layoutOrder:   layoutOrderSchema.optional(),
  folderId:      z.string().cuid().nullable().optional(),
})

export const updateSavedTemplateSchema = z.object({
  name:          z.string().min(1).max(150).optional(),
  fieldValues:   z
    .record(languageSchema, z.record(z.string(), fieldValueSchema))
    .optional(),
  sectionConfig: z.array(savedSectionConfigSchema).optional(),
  customBlocks:  z.array(customBlockSchema).optional(),
  layoutOrder:   layoutOrderSchema.optional(),
  folderId:      z.string().cuid().nullable().optional(),
})

// ─────────────────────────────────────────────
// Folders
// ─────────────────────────────────────────────

export const createFolderSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

// ─────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────

export const toggleSectionSchema = z.object({
  sectionName: z.string().min(1),
  action:      z.enum(['enable', 'disable']),
})

export const deleteSectionSchema = z.object({
  sectionName: z.string().min(1),
})

// ─────────────────────────────────────────────
// Sharing
// ─────────────────────────────────────────────

export const createShareSchema = z.object({
  savedTemplateId: z.string().cuid(),
  sharedWithIds:   z.array(z.string().cuid()).min(1),
})

// ─────────────────────────────────────────────
// Import
// ─────────────────────────────────────────────

export const createImportSchema = z.object({
  name:            z.string().min(1).max(150),
  brand:           z.enum(['STAKES', 'X7']),
  activeLanguages: z.array(languageSchema).min(1),
  html:            z.string().min(1),
  fieldMappings:   z.array(z.object({
    mcId:  z.string().min(1),
    label: z.string().min(1).max(100),
    type:  z.enum(['text', 'url', 'link', 'richtext']),
  })).min(1),
  // Phase 8 — the mapper's edited sections; wrapped in SECTION markers on save.
  sections:        z.array(z.object({
    sectionId: z.string().min(1),
    label:     z.string().max(100),
    rowIds:    z.array(z.string().min(1)),
  })).optional().default([]),
})

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────

export const createUserSchema = z.object({
  email:           z.string().email(),
  name:            z.string().min(1).max(100),
  password:        z.string().min(8),
  department:      z.string().min(1).max(50),
  canAccessEmails: z.boolean().default(true),
})

export const updateUserSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  email:           z.string().email().optional(),
  department:      z.string().min(1).max(50).optional(),
  role:            z.enum(['ADMIN', 'DEPARTMENT']).optional(),
  isActive:        z.boolean().optional(),
  canAccessEmails: z.boolean().optional(),
  password:        z.string().min(8).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8),
})
