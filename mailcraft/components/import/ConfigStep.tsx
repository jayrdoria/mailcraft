'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/apiFetch'
import type { FieldMapping } from '@/lib/types/import'
import type { Language } from '@/lib/types/template'
import { LANGUAGES, LANGUAGE_LABELS } from '@/lib/types/template'

type Brand = 'STAKES' | 'X7'

const BRAND_OPTIONS: { value: Brand; label: string }[] = [
  { value: 'STAKES', label: 'Stakes' },
  { value: 'X7',     label: 'X7 Casino' },
]

interface ConfigStepProps {
  html: string
  fieldMappings: FieldMapping[]
  onBack: () => void
  onClose: () => void
}

export default function ConfigStep({ html, fieldMappings, onBack, onClose }: ConfigStepProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState<Brand>('STAKES')
  const [activeLanguages, setActiveLanguages] = useState<Language[]>(['en'])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleLanguage(lang: Language) {
    setActiveLanguages((prev) => {
      if (prev.includes(lang)) {
        if (prev.length === 1) return prev  // keep at least one
        return prev.filter((l) => l !== lang)
      }
      return [...prev, lang]
    })
  }

  const canCreate = name.trim().length > 0 && fieldMappings.length > 0

  async function handleCreate() {
    if (!canCreate) return
    setCreating(true)
    setError(null)

    try {
      const res = await apiFetch('/api/import/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand,
          activeLanguages,
          html,
          fieldMappings,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to create import')
        return
      }

      onClose()
      router.push(`/editor/new?master=${json.data.masterTemplateId}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* Template name */}
        <div>
          <label className="text-xs font-medium mb-1.5 block">
            Template Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stakes Welcome Email — Summer Campaign"
            maxLength={150}
            className="w-full px-3 py-2 text-sm rounded-md border bg-background
                       placeholder:text-muted-foreground
                       focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Brand */}
        <div>
          <p className="text-xs font-medium mb-1.5">Brand</p>
          <div className="flex gap-2">
            {BRAND_OPTIONS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBrand(b.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer',
                  brand === b.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div>
          <p className="text-xs font-medium mb-0.5">Languages</p>
          <p className="text-[11px] text-muted-foreground mb-2">
            Only selected languages appear in the editor. At least one required.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((lang) => {
              const isActive = activeLanguages.includes(lang)
              return (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer uppercase font-medium',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              )
            })}
          </div>
        </div>

        {/* No fields warning */}
        {fieldMappings.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-destructive/10 text-[11px] text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            No editable fields defined. Go back and define fields in the mapper.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-[12px] text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-4 border-t shrink-0">
        <button
          onClick={onBack}
          className="px-4 py-1.5 text-xs rounded-md border hover:bg-accent transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <button
          onClick={handleCreate}
          disabled={!canCreate || creating}
          className={cn(
            'flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md',
            'bg-primary text-primary-foreground hover:opacity-90 transition-opacity',
            canCreate && !creating ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
          )}
        >
          {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {creating ? 'Creating…' : 'Create Import →'}
        </button>
      </div>
    </>
  )
}
