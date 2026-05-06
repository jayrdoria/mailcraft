'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'
import { clientRender } from '@/lib/clientRender'
import ParagraphEditor from '@/components/editor/ParagraphEditor'
import type { TemplateFieldConfig, Language, SavedSectionConfig, FieldValue, BodyParagraph } from '@/lib/types/template'
import { LANGUAGE_LABELS, LANGUAGES } from '@/lib/types/template'

function normalizeGroup(group: string): string {
  return group.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
}

interface FieldEditorProps {
  editableFields: TemplateFieldConfig[]
  sectionConfig: SavedSectionConfig[]
}

function useDebounce<T extends unknown[]>(fn: (...args: T) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback(
    (...args: T) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => fn(...args), delay)
    },
    [fn, delay]
  )
}

export default function FieldEditor({ editableFields, sectionConfig }: FieldEditorProps) {
  const activeLanguage = useEditorStore((s) => s.activeLanguage)
  const setActiveLanguage = useEditorStore((s) => s.setActiveLanguage)
  const fieldValues = useEditorStore((s) => s.fieldValues)
  const activeSections = useEditorStore((s) => s.activeSections)
  const masterPreviewHtml = useEditorStore((s) => s.masterPreviewHtml)
  const setFieldValue = useEditorStore((s) => s.setFieldValue)
  const setRenderedHtml = useEditorStore((s) => s.setRenderedHtml)
  const requiredFields = useEditorStore((s) => s.requiredFields)
  const supportedLanguages = useEditorStore((s) => s.supportedLanguages)
  const brand = useEditorStore((s) => s.brand)

  // Build current section config from active sections
  const currentSectionConfig: SavedSectionConfig[] = sectionConfig.map((s) => ({
    ...s,
    isActive: activeSections.includes(s.name),
  }))

  // Debounced preview update
  const updatePreview = useDebounce(
    (html: string, values: Record<string, FieldValue>, sc: SavedSectionConfig[], br: string) => {
      const rendered = clientRender(html, values, sc, br)
      setRenderedHtml(rendered)
    },
    300
  )

  const currentLangValues = fieldValues[activeLanguage] ?? {}

  useEffect(() => {
    updatePreview(masterPreviewHtml, currentLangValues, currentSectionConfig, brand)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterPreviewHtml, fieldValues, activeSections, activeLanguage])

  // Fields grouped by section
  const fieldsBySectionName = editableFields.reduce<Record<string, TemplateFieldConfig[]>>(
    (acc, f) => {
      const group = f.group ?? '__default__'
      if (!acc[group]) acc[group] = []
      acc[group].push(f)
      return acc
    },
    {}
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Language tabs */}
      <div className="flex gap-0 border-b shrink-0 overflow-x-auto">
        {supportedLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveLanguage(lang)}
            className={cn(
              'px-3 py-2 text-xs font-medium shrink-0 border-b-2 transition-colors cursor-pointer uppercase',
              activeLanguage === lang
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {Object.entries(fieldsBySectionName).map(([sectionName, fields]) => {
          const sectionLabel =
            sectionName === '__default__'
              ? null
              : sectionName

          const isSectionActive =
            sectionName === '__default__' ||
            activeSections.includes(normalizeGroup(sectionName))

          return (
            <div key={sectionName} className={cn(!isSectionActive && 'opacity-50 pointer-events-none')}>
              {sectionLabel && (
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {sectionLabel}
                  </p>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      isSectionActive
                        ? 'bg-green-500/15 text-green-500'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isSectionActive ? 'ON' : 'OFF'}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {fields.map((field) => {
                  const isRequired = requiredFields.includes(field.key) || field.defaultRequired

                  if (field.type === 'paragraphs') {
                    const rawParagraphs = currentLangValues[field.key]
                    const paragraphs: BodyParagraph[] =
                      Array.isArray(rawParagraphs) && rawParagraphs.length > 0
                        ? rawParagraphs
                        : (field.defaultParagraphsByLang?.[activeLanguage as Language] ?? field.defaultParagraphs ?? [{ id: 'p1', html: '' }])
                    return (
                      <div key={field.key}>
                        <label className="flex items-center gap-1 text-xs font-medium mb-1">
                          {field.label}
                          {isRequired && <span className="text-destructive">*</span>}
                        </label>
                        <ParagraphEditor
                          key={`${field.key}-${activeLanguage}`}
                          value={paragraphs}
                          onChange={(v) => setFieldValue(field.key, v)}
                        />
                      </div>
                    )
                  }

                  const rawValue = currentLangValues[field.key]
                  const value = typeof rawValue === 'string' ? rawValue : (field.defaultValue ?? '')

                  return (
                    <div key={field.key}>
                      <label className="flex items-center gap-1 text-xs font-medium mb-1">
                        {field.label}
                        {isRequired && <span className="text-destructive">*</span>}
                      </label>

                      {field.type === 'richtext' ? (
                        <textarea
                          value={value}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full px-3 py-2 text-sm rounded-md border bg-background
                                     placeholder:text-muted-foreground resize-y
                                     focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <input
                          type={field.type === 'url' ? 'url' : 'text'}
                          value={value}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 text-sm rounded-md border bg-background
                                     placeholder:text-muted-foreground
                                     focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      )}

                      {field.type === 'url' && value && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={value}
                          alt=""
                          className="mt-1.5 h-12 w-auto rounded border object-contain bg-muted"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Locked fields notice */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-muted/50 text-[11px] text-muted-foreground">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Logo, footer legal text, and responsible gaming logos are managed by your admin.</span>
        </div>
      </div>
    </div>
  )
}

export function LanguageSelector({
  value,
  onChange,
  languages = LANGUAGES,
}: {
  value: Language
  onChange: (lang: Language) => void
  languages?: Language[]
}) {
  return (
    <div className="flex gap-1">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={cn(
            'px-2 py-1 text-xs rounded-md border transition-colors cursor-pointer uppercase',
            value === lang
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-muted-foreground hover:bg-accent'
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
