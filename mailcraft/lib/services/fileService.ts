import path from 'path'
import fs from 'fs/promises'
import type { Language } from '@/lib/types/template'

const TEMPLATE_BASE_DIR = process.env.TEMPLATE_BASE_DIR ?? './data/templates'

// ─────────────────────────────────────────────
// Path helpers — all paths are validated to prevent traversal attacks
// ─────────────────────────────────────────────

function resolveTemplatePath(baseDir: string, lang: Language): string {
  const resolved = path.resolve(baseDir, `${lang}.html`)
  const resolvedBase = path.resolve(TEMPLATE_BASE_DIR)

  // Ensure the resolved path is inside TEMPLATE_BASE_DIR
  if (!resolved.startsWith(resolvedBase)) {
    throw new Error('Path traversal attempt detected')
  }

  return resolved
}

// ─────────────────────────────────────────────
// Read a master or saved template HTML file
// ─────────────────────────────────────────────

export async function readTemplateHtml(
  baseFilePath: string,
  lang: Language
): Promise<string> {
  const filePath = resolveTemplatePath(baseFilePath, lang)
  return fs.readFile(filePath, 'utf-8')
}

// ─────────────────────────────────────────────
// Write a saved template HTML file
// Creates parent directories if they don't exist
// ─────────────────────────────────────────────

export async function writeTemplateHtml(
  baseFilePath: string,
  lang: Language,
  html: string
): Promise<void> {
  const filePath = resolveTemplatePath(baseFilePath, lang)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, html, 'utf-8')
}

// ─────────────────────────────────────────────
// Delete a saved template directory (all language files)
// ─────────────────────────────────────────────

export async function deleteTemplateDir(baseFilePath: string): Promise<void> {
  const resolved = path.resolve(baseFilePath)
  const resolvedBase = path.resolve(TEMPLATE_BASE_DIR)
  if (!resolved.startsWith(resolvedBase)) {
    throw new Error('Path traversal attempt detected')
  }
  await fs.rm(resolved, { recursive: true, force: true })
}

// ─────────────────────────────────────────────
// Generate a saved template base path
// ─────────────────────────────────────────────

export function getSavedTemplatePath(userId: string, savedTemplateId: string): string {
  return path.join(TEMPLATE_BASE_DIR, 'saved-templates', userId, savedTemplateId)
}
