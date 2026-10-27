'use client'

import { useState } from 'react'
import { ChevronDown, ImageOff, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'
import PresetPickerModal from '@/components/editor/PresetPickerModal'
import { activePresetId, mergeLangPatches, presetSlotValues, type ThumbSlot } from '@/lib/thumbnailSlots'
import { LANGUAGE_LABELS, type TemplateFieldConfig } from '@/lib/types/template'
import type { ThumbnailPreset } from '@/lib/types/thumbnailPreset'

// ─────────────────────────────────────────────
// Thumbnail slots — one compact card per slot (Thumbnail 1–2 / Icon 1–3):
// image + label + link at a glance, "Change" (preset picker) and "Edit" (raw fields).
// The image is the same in every language; label / sublabel / link are per language.
// "Fill from presets" fills several slots in one go (PresetPickerModal, multi mode).
// ─────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function CardImage({ src }: { src: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || failed === src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground" title={src ? 'Image couldn’t load' : 'No image'}>
        <ImageOff className="h-4 w-4" />
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" onError={() => setFailed(src)} className="h-full w-full object-contain bg-muted/40" />
}

function SlotCard({
  slot,
  fields,
  required,
  onChange,
}: {
  slot: ThumbSlot
  fields: Map<string, TemplateFieldConfig>
  required: (key: string) => boolean
  onChange: () => void
}) {
  const fieldValues = useEditorStore((s) => s.fieldValues)
  const activeLanguage = useEditorStore((s) => s.activeLanguage)
  const setFieldValue = useEditorStore((s) => s.setFieldValue)
  const setFieldValueAllLanguages = useEditorStore((s) => s.setFieldValueAllLanguages)
  const setActiveFieldKey = useEditorStore((s) => s.setActiveFieldKey)
  const [open, setOpen] = useState(false)

  const k = (part: string) => `${slot.prefix}_${part}`
  const langValues = fieldValues[activeLanguage] ?? {}
  const value = (part: string) => {
    const v = langValues[k(part)]
    return typeof v === 'string' ? v : (fields.get(k(part))?.defaultValue ?? '')
  }
  const lang = LANGUAGE_LABELS[activeLanguage]
  const anyRequired = ['IMG', 'LINK', 'LABEL', 'SUBLABEL'].some((p) => fields.has(k(p)) && required(k(p)))
  const link = value('LINK').replace(/^https?:\/\//, '')

  const textField = (part: 'LABEL' | 'SUBLABEL' | 'LINK', name: string) =>
    fields.has(k(part)) && (
      <div onFocusCapture={() => setActiveFieldKey(k(part))}>
        <label className="flex items-center gap-1 text-xs font-medium mb-1">
          {name} <span className="font-normal text-muted-foreground">({lang})</span>
          {required(k(part)) && <span className="text-destructive">*</span>}
        </label>
        <input
          type={part === 'LINK' ? 'url' : 'text'}
          value={value(part)}
          onChange={(e) => setFieldValue(k(part), e.target.value)}
          placeholder={fields.get(k(part))?.placeholder}
          aria-label={`${slot.title} ${name}`}
          className={inputCls}
        />
      </div>
    )

  return (
    <div className="rounded-md border" onFocusCapture={() => setActiveFieldKey(k('IMG'))}>
      <div className="flex items-center gap-3 p-2.5">
        <div className="h-12 w-16 shrink-0 overflow-hidden rounded border">
          <CardImage src={value('IMG')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            {slot.title}
            {anyRequired && <span className="text-destructive">*</span>}
          </p>
          <p className="text-sm font-medium truncate">{value('LABEL') || <span className="text-muted-foreground">No label</span>}</p>
          {fields.has(k('SUBLABEL')) && value('SUBLABEL') && <p className="text-[11px] text-muted-foreground truncate">{value('SUBLABEL')}</p>}
          {link && <p className="text-[11px] text-muted-foreground truncate">{link}</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveFieldKey(k('IMG'))
              onChange()
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
          >
            Change
          </button>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-center gap-0.5 px-2.5 py-1 text-xs rounded-md border hover:bg-accent cursor-pointer"
          >
            Edit <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t p-2.5">
          {fields.has(k('IMG')) && (
            <div onFocusCapture={() => setActiveFieldKey(k('IMG'))}>
              <label className="flex items-center gap-1 text-xs font-medium mb-1">
                Image URL <span className="font-normal text-muted-foreground">(same image in all languages)</span>
                {required(k('IMG')) && <span className="text-destructive">*</span>}
              </label>
              <input
                type="url"
                value={value('IMG')}
                onChange={(e) => setFieldValueAllLanguages(k('IMG'), e.target.value)}
                placeholder="https://userimg-assets.customeriomail.com/..."
                aria-label={`${slot.title} Image URL`}
                className={inputCls}
              />
            </div>
          )}
          {textField('LABEL', 'Label')}
          {textField('SUBLABEL', 'Sublabel')}
          {textField('LINK', 'Link')}
        </div>
      )}
    </div>
  )
}

export default function ThumbnailSlots({
  slots,
  editableFields,
  presets,
}: {
  slots: ThumbSlot[] // visible slots, all of one design (cards or icons)
  editableFields: TemplateFieldConfig[]
  presets: ThumbnailPreset[] // this brand
}) {
  const fieldValues = useEditorStore((s) => s.fieldValues)
  const activeLanguage = useEditorStore((s) => s.activeLanguage)
  const supportedLanguages = useEditorStore((s) => s.supportedLanguages)
  const requiredFields = useEditorStore((s) => s.requiredFields)
  const setFieldValuesBatch = useEditorStore((s) => s.setFieldValuesBatch)
  const [picker, setPicker] = useState<{ mode: 'single'; slot: ThumbSlot } | { mode: 'multi' } | null>(null)

  if (slots.length === 0) return null
  const fields = new Map(editableFields.map((f) => [f.key, f]))
  const fieldKeys = new Set(fields.keys())
  const kind = slots[0].kind
  const options = presets.filter((p) => p.kind === kind)
  const required = (key: string) => requiredFields.includes(key) || fields.get(key)?.defaultRequired === true

  const fill = (assignments: { slot: ThumbSlot; presetId: string }[]) => {
    const patches = assignments.flatMap(({ slot, presetId }) => {
      const preset = options.find((p) => p.id === presetId)
      return preset ? [presetSlotValues(preset, slot.prefix, supportedLanguages, fieldKeys, fieldValues)] : []
    })
    if (patches.length > 0) setFieldValuesBatch(mergeLangPatches(patches))
    setPicker(null)
  }

  const designName = kind === 'icon' ? 'icons' : 'thumbnails'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{kind === 'icon' ? 'Icons' : 'Thumbnails'}</p>
        <button
          type="button"
          onClick={() => setPicker({ mode: 'multi' })}
          className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border hover:bg-accent cursor-pointer"
        >
          <Wand2 className="h-3 w-3" />
          Fill from presets…
        </button>
      </div>

      {slots.map((slot) => (
        <SlotCard key={slot.prefix} slot={slot} fields={fields} required={required} onChange={() => setPicker({ mode: 'single', slot })} />
      ))}

      {picker && (
        <PresetPickerModal
          mode={picker.mode}
          title={picker.mode === 'single' ? `Choose a preset for ${picker.slot.title}` : `Fill ${designName} from presets`}
          presets={options}
          slots={picker.mode === 'single' ? [picker.slot] : slots}
          activeLanguage={activeLanguage}
          currentPresetId={
            picker.mode === 'single' ? activePresetId(options, picker.slot, supportedLanguages, fieldKeys, fieldValues) : undefined
          }
          onApplySingle={(presetId) => picker.mode === 'single' && fill([{ slot: picker.slot, presetId }])}
          onApplyMulti={fill}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
