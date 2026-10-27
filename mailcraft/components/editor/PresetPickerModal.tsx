'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Check, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { presetText, type ThumbnailPreset } from '@/lib/types/thumbnailPreset'
import type { Language } from '@/lib/types/template'
import type { ThumbSlot } from '@/lib/thumbnailSlots'

// ─────────────────────────────────────────────
// Thumbnail preset picker.
//   mode 'single' (a slot's "Change"): click a preset → applied to that slot.
//   mode 'multi'  ("Fill from presets"): tick presets in slot order (badges 1–3),
//                 Apply → confirmation → applied to those slots.
// Either way a preset fills image, text and link in every language.
// ─────────────────────────────────────────────

interface Props {
  mode: 'single' | 'multi'
  title: string
  presets: ThumbnailPreset[] // already filtered to this brand + design
  slots: ThumbSlot[] // single: the one slot; multi: every slot of the design, in order
  activeLanguage: Language
  currentPresetId?: string // single: highlight what the slot has now
  onApplySingle: (presetId: string) => void
  onApplyMulti: (assignments: { slot: ThumbSlot; presetId: string }[]) => void
  onClose: () => void
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)
  return error ? (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <ImageOff className="h-5 w-5" />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setError(true)} className="h-full w-full object-contain bg-muted/40" />
  )
}

export default function PresetPickerModal({
  mode,
  title,
  presets,
  slots,
  activeLanguage,
  currentPresetId,
  onApplySingle,
  onApplyMulti,
  onClose,
}: Props) {
  const [picked, setPicked] = useState<string[]>([]) // multi: preset ids in slot order
  const [confirming, setConfirming] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const max = slots.length

  // Latest onClose without re-running the effect (parents pass inline callbacks)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const label = (p: ThumbnailPreset) => presetText(p.labels, activeLanguage) || p.labels.en
  const byId = (id: string) => presets.find((p) => p.id === id)

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < max ? [...prev, id] : prev))
  }

  const assignments = picked.map((presetId, i) => ({ slot: slots[i], presetId }))

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border bg-card shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b">
          <div>
            <h2 className="text-sm font-semibold">{confirming ? 'Replace thumbnails?' : title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {confirming
                ? 'Each slot gets the preset’s image, text and link in every language.'
                : mode === 'multi'
                  ? `Tick up to ${max} in the order you want them. Fills image, text and link in every language.`
                  : 'Pick one. Fills image, text and link in every language.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-md hover:bg-accent text-muted-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {presets.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No presets yet for this design.{' '}
              <Link href="/thumbnail-presets" className="underline hover:text-foreground">
                Manage presets
              </Link>
            </div>
          ) : confirming ? (
            <ul className="space-y-2">
              {assignments.map(({ slot, presetId }) => {
                const p = byId(presetId)
                if (!p) return null
                return (
                  <li key={slot.prefix} className="flex items-center gap-3 rounded-lg border p-2">
                    <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{slot.title}</span>
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded border">
                      <Thumb src={p.imageUrl} alt="" />
                    </div>
                    <span className="text-sm font-medium truncate">{label(p)}</span>
                  </li>
                )
              })}
              {picked.length < max && (
                <li className="text-xs text-muted-foreground px-1">
                  {slots.slice(picked.length).map((s) => s.title).join(', ')} stay{picked.length === max - 1 ? 's' : ''} as {picked.length === max - 1 ? 'it is' : 'they are'}.
                </li>
              )}
            </ul>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {presets.map((p) => {
                const order = picked.indexOf(p.id)
                const isPicked = order !== -1
                const isCurrent = mode === 'single' && p.id === currentPresetId
                const disabled = mode === 'multi' && !isPicked && picked.length >= max
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={mode === 'multi' ? isPicked : isCurrent}
                    onClick={() => (mode === 'single' ? onApplySingle(p.id) : toggle(p.id))}
                    className={cn(
                      'relative text-left rounded-lg border overflow-hidden transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                      isPicked || isCurrent ? 'border-primary ring-2 ring-primary/40' : 'hover:border-foreground/30'
                    )}
                  >
                    <div className="aspect-[4/3] w-full">
                      <Thumb src={p.imageUrl} alt="" />
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-xs font-semibold truncate">{label(p)}</p>
                      {p.sublabels && <p className="text-[11px] text-muted-foreground truncate">{presetText(p.sublabels, activeLanguage)}</p>}
                    </div>
                    {mode === 'multi' && isPicked && (
                      <span className="absolute top-1.5 left-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground shadow">
                        {slots[order]?.title.replace(/^(Thumbnail|Icon) /, '')}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        <Check className="h-3 w-3" /> Current
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {mode === 'multi' && presets.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              {confirming ? '' : `${picked.length} of ${max} picked`}
            </span>
            <div className="flex gap-2">
              {confirming ? (
                <>
                  <button onClick={() => setConfirming(false)} className="px-3 py-1.5 text-xs rounded-md border hover:bg-accent cursor-pointer">
                    Back
                  </button>
                  <button
                    onClick={() => onApplyMulti(assignments)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                  >
                    Replace
                  </button>
                </>
              ) : (
                <>
                  <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border hover:bg-accent cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={() => setConfirming(true)}
                    disabled={picked.length === 0}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Apply
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
