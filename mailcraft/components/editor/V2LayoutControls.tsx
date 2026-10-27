'use client'

import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'
import {
  GAME_COUNTS,
  LAYOUT_META_KEYS,
  layoutFieldKeys,
  parseLayoutSettings,
  type BodyLayout,
  type BodyTextAlign,
  type LayoutSettings,
  type ThumbStyle,
} from '@/lib/v2Layouts'
import type { FieldValue, Language, TemplateFieldConfig } from '@/lib/types/template'

// ─────────────────────────────────────────────
// X7 V2 layout choices. part="body" sits at the top of the Body group (design +
// text alignment), part="thumbs" at the top of the Thumbnails group (design +
// heading toggle). Choices are meta-keys on fieldValues.en (setLayoutMeta).
// ─────────────────────────────────────────────

const BODY_OPTIONS: { value: BodyLayout; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'welcome', label: 'Welcome Boost' },
  { value: 'spins', label: 'Free Spins' },
]

const THUMB_OPTIONS: { value: ThumbStyle; label: string }[] = [
  { value: 'cards', label: 'Cards' },
  { value: 'icons', label: 'Icons' },
]

const ALIGN_OPTIONS: { value: BodyTextAlign; label: string; lines: [number, number][] }[] = [
  { value: 'left', label: 'Left', lines: [[6, 18], [6, 14], [6, 16]] },
  { value: 'center', label: 'Centre', lines: [[6, 18], [8, 16], [7, 17]] },
]

function AlignIcon({ lines }: { lines: [number, number][] }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="2" />
      <path d={lines.map(([a, b], i) => `M${a} ${9 + i * 3}h${b - a}`).join('')} />
    </svg>
  )
}

const segBtn = (active: boolean) =>
  cn(
    'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs whitespace-nowrap transition-colors cursor-pointer border-r last:border-r-0',
    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  )

// Defaults (per language) for the fields a choice needs — fills gaps in templates
// saved before these fields existed, so the new design never renders empty.
function defaultsFor(
  keys: string[],
  fields: TemplateFieldConfig[],
  langs: Language[]
): Partial<Record<Language, Record<string, FieldValue>>> {
  const out: Partial<Record<Language, Record<string, FieldValue>>> = {}
  for (const lang of langs) {
    const values: Record<string, FieldValue> = {}
    for (const key of keys) {
      const f = fields.find((x) => x.key === key)
      if (!f) continue
      const value = f.type === 'paragraphs'
        ? (f.defaultParagraphsByLang?.[lang] ?? f.defaultParagraphs)
        : (f.defaultValues?.[lang] ?? f.defaultValue)
      if (value !== undefined) values[key] = value
    }
    out[lang] = values
  }
  return out
}

export default function V2LayoutControls({
  part,
  editableFields,
}: {
  part: 'body' | 'thumbs'
  editableFields: TemplateFieldConfig[]
}) {
  const fieldValues = useEditorStore((s) => s.fieldValues)
  const supportedLanguages = useEditorStore((s) => s.supportedLanguages)
  const setLayoutMeta = useEditorStore((s) => s.setLayoutMeta)

  const settings = parseLayoutSettings(fieldValues.en)

  function apply(next: LayoutSettings, extra: Record<string, string> = {}) {
    // First move away from the plain V2 look → turn the "More at X7" heading on (user can turn it off)
    const wasDefault = settings.body === 'classic' && settings.thumbs === 'cards'
    const isDefault = next.body === 'classic' && next.thumbs === 'cards'
    const heading = wasDefault && !isDefault ? true : next.heading
    const final = { ...next, heading }
    setLayoutMeta(
      {
        [LAYOUT_META_KEYS.body]: final.body,
        [LAYOUT_META_KEYS.align]: final.align,
        [LAYOUT_META_KEYS.thumbs]: final.thumbs,
        [LAYOUT_META_KEYS.heading]: final.heading ? 'on' : 'off',
        [LAYOUT_META_KEYS.games]: String(final.games),
        ...extra,
      },
      defaultsFor(layoutFieldKeys(final), editableFields, supportedLanguages)
    )
  }

  if (part === 'body') {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <div>
          <p className="text-xs font-medium mb-1">Body design</p>
          <div className="flex border rounded-md overflow-hidden" role="radiogroup" aria-label="Body design">
            {BODY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={settings.body === o.value}
                onClick={() => apply({ ...settings, body: o.value })}
                className={segBtn(settings.body === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Applies to every language.</p>
        </div>

        {settings.body !== 'classic' && (
          <div>
            <p className="text-xs font-medium mb-1">Text alignment</p>
            <div className="flex border rounded-md overflow-hidden" role="radiogroup" aria-label="Body text alignment">
              {ALIGN_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={settings.align === o.value}
                  onClick={() => apply({ ...settings, align: o.value })}
                  className={segBtn(settings.align === o.value)}
                >
                  <AlignIcon lines={o.lines} />
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Headline and text blocks. The button, games and validity line stay centred.</p>
          </div>
        )}

        {settings.body === 'spins' && (
          <div>
            <p className="text-xs font-medium mb-1">Games shown</p>
            <div className="flex border rounded-md overflow-hidden" role="radiogroup" aria-label="Games shown">
              {GAME_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={settings.games === n}
                  onClick={() => apply({ ...settings, games: n })}
                  className={segBtn(settings.games === n)}
                >
                  {n} {n === 1 ? 'game' : 'games'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Hidden games keep their text, so you can bring them back anytime.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <p className="text-xs font-medium mb-1">Thumbnail design</p>
        <div className="flex border rounded-md overflow-hidden" role="radiogroup" aria-label="Thumbnail design">
          {THUMB_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={settings.thumbs === o.value}
              onClick={() => apply({ ...settings, thumbs: o.value })}
              className={segBtn(settings.thumbs === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {settings.thumbs === 'icons' ? '3 icons with labels, side by side on every screen.' : '2 image cards with a label and sublabel.'}
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={settings.heading}
          onChange={(e) => apply({ ...settings, heading: e.target.checked })}
          className="cursor-pointer"
        />
        Show section heading (e.g. &ldquo;More at X7&rdquo;)
      </label>
    </div>
  )
}
