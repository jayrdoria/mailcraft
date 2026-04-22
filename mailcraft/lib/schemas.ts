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
})

export const updateSavedTemplateSchema = z.object({
  name:          z.string().min(1).max(150).optional(),
  fieldValues:   z
    .record(languageSchema, z.record(z.string(), fieldValueSchema))
    .optional(),
  sectionConfig: z.array(savedSectionConfigSchema).optional(),
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
  isActive:        z.boolean().optional(),
  canAccessEmails: z.boolean().optional(),
  password:        z.string().min(8).optional(),
})
