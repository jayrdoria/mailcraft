'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Minus, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'
import {
  BANNER_META_KEYS,
  BANNER_TITLE_KEY,
  BANNER_SUB_KEY,
  BANNER_TITLE_SIZE_RANGE,
  BANNER_SUB_SIZE_RANGE,
  getBannerBrandStyle,
  parseBannerSettings,
  resolveBannerSizes,
  normalizeHex,
  type BannerBox,
  type BannerAlign,
} from '@/lib/bannerText'
import { LANGUAGE_LABELS } from '@/lib/types/template'

// ─────────────────────────────────────────────
// Banner text box controls (Header group). Title/Sub are per-language fields;
// every other setting is a _banner* meta-key on fieldValues.en (setBannerMeta).
// ─────────────────────────────────────────────

const BOX_OPTIONS: { value: BannerBox; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' },
]

// Icon lines (x1,x2 per row) + vertical offset — mirrors the approved POC icons
// label = short one-line caption (so all four icons line up); title = full name in the tooltip
const ALIGN_OPTIONS: { value: BannerAlign; label: string; title: string; lines: [number, number][]; y: number }[] = [
  { value: 'left', label: 'Left', title: 'Left', lines: [[6, 18], [6, 14], [6, 16]], y: 9 },
  { value: 'center', label: 'Centre', title: 'Centre', lines: [[6, 18], [8, 16], [7, 17]], y: 9 },
  { value: 'right', label: 'Right', title: 'Right', lines: [[6, 18], [10, 18], [8, 18]], y: 9 },
  { value: 'bottom', label: 'Bottom', title: 'Bottom centre', lines: [[6, 18], [8, 16], [7, 17]], y: 12 },
]

function AlignIcon({ lines, y }: { lines: [number, number][]; y: number }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="2" />
      <path d={lines.map(([a, b], i) => `M${a} ${y + i * 3}h${b - a}`).join('')} />
    </svg>
  )
}

const segBtn = (active: boolean) =>
  cn(
    'flex-1 px-2 py-1.5 text-xs transition-colors cursor-pointer border-r last:border-r-0',
    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  )

// ── Colour: native picker + hex box + swatches ──
function ColorField({
  label,
  value,
  swatches,
  onChange,
}: {
  label: string
  value: string
  swatches: { color: string; name: string }[]
  onChange: (hex: string) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const invalid = normalizeHex(draft) === null

  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-xs font-medium shrink-0">{label}</span>
      <input
        type="color"
        value={value.toLowerCase()}
        onChange={(e) => onChange(normalizeHex(e.target.value) ?? value)}
        aria-label={`${label} colour picker`}
        className="w-8 h-8 p-0.5 rounded-md border bg-background cursor-pointer shrink-0"
      />
      <input
        type="text"
        value={draft}
        maxLength={7}
        spellCheck={false}
        aria-label={`${label} colour hex`}
        aria-invalid={invalid}
        onChange={(e) => {
          setDraft(e.target.value)
          const hex = normalizeHex(e.target.value)
          if (hex) onChange(hex)
        }}
        onBlur={() => setDraft(value)}
        className={cn(
          'w-20 px-2 py-1.5 text-xs font-mono uppercase rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring',
          invalid && 'border-destructive'
        )}
      />
      <div className="flex gap-1 flex-wrap">
        {swatches.map((s) => (
          <button
            key={s.color}
            type="button"
            title={`${s.name} ${s.color}`}
            aria-label={`${s.name} ${s.color}`}
            onClick={() => onChange(s.color)}
            className={cn(
              'w-5 h-5 rounded border border-zinc-400 cursor-pointer',
              value === s.color && 'ring-2 ring-ring ring-offset-1 ring-offset-background'
            )}
            style={{ background: s.color }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Size stepper ──
function SizeStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  const set = (n: number) => onChange(Math.min(Math.max(n, min), max))
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-xs font-medium shrink-0">{label}</span>
      <div className="flex items-center border rounded-md overflow-hidden">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`Smaller ${label}`} className="px-2 py-1.5 hover:bg-accent disabled:opacity-40 cursor-pointer">
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-12 text-center text-xs tabular-nums border-x py-1.5">{value}px</span>
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`Bigger ${label}`} className="px-2 py-1.5 hover:bg-accent disabled:opacity-40 cursor-pointer">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Fit check: renders the real preview HTML at 320px in a hidden iframe and
// compares the banner cell height with the image's 1125:506 shape. Overflow =
// the text made the banner taller than the artwork (edges would be cropped).
// Web fonts are stripped first: Gmail/CIO don't load them, so this measures the
// wider fallback fonts (e.g. Impact for Bebas Neue) — the worst case.
type FitState = 'ok' | 'overflow' | null

function useBannerFit(html: string, enabled: boolean) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [fit, setFit] = useState<FitState>(null)

  useEffect(() => {
    if (!enabled || !html) {
      setFit(null)
      return
    }
    const frame = frameRef.current
    if (!frame) return
    let cancelled = false
    const timer = setTimeout(() => {
      frame.onload = async () => {
        const doc = frame.contentDocument
        if (!doc || cancelled) return
        try {
          await doc.fonts?.ready
        } catch {
          // fonts API unavailable — measure with what is loaded
        }
        if (cancelled) return
        const td = doc.querySelector('.banner-td')
        const hasText = doc.querySelector('.mcbt-title, .mcbt-sub, .mcbt-sub-only')
        if (!td || !hasText) {
          setFit(null)
          return
        }
        const rect = td.getBoundingClientRect()
        setFit(rect.height > (rect.width * 506) / 1125 + 1.5 ? 'overflow' : 'ok')
      }
      frame.srcdoc = html.replace(/<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>/gi, '')
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [html, enabled])

  return { frameRef, fit }
}

export default function BannerTextControls() {
  const brand = useEditorStore((s) => s.brand)
  const fieldValues = useEditorStore((s) => s.fieldValues)
  const activeLanguage = useEditorStore((s) => s.activeLanguage)
  const renderedHtml = useEditorStore((s) => s.renderedHtml)
  const setFieldValue = useEditorStore((s) => s.setFieldValue)
  const setBannerMeta = useEditorStore((s) => s.setBannerMeta)
  const setActiveFieldKey = useEditorStore((s) => s.setActiveFieldKey)

  const style = getBannerBrandStyle(brand)
  const settings = parseBannerSettings(fieldValues.en, brand)
  const sizes = resolveBannerSizes(settings, brand)
  const langValues = fieldValues[activeLanguage] ?? {}
  const title = typeof langValues[BANNER_TITLE_KEY] === 'string' ? (langValues[BANNER_TITLE_KEY] as string) : ''
  const sub = typeof langValues[BANNER_SUB_KEY] === 'string' ? (langValues[BANNER_SUB_KEY] as string) : ''
  const isOn = settings.box !== 'off'
  const { frameRef, fit } = useBannerFit(renderedHtml, isOn)

  const swatches = [
    { color: '#FFFFFF', name: 'White' },
    { color: '#000000', name: 'Black' },
    { color: style.accent, name: 'Brand accent' },
    { color: '#FFC94A', name: 'Gold' },
    { color: '#D4D4D8', name: 'Light grey' },
  ]

  const textInput = (key: string, label: string, value: string, limit: number, placeholder: string) => {
    const count = value.trim().length
    const over = count > limit
    return (
      <div onFocusCapture={() => setActiveFieldKey(key)}>
        <label className="block text-xs font-medium mb-1">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setFieldValue(key, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className={cn('mt-1 text-[11px] text-right tabular-nums', over ? 'text-amber-500 font-medium' : 'text-muted-foreground')}>
          {count} / {limit}
          {over && ' — may be too long for small phones'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <p className="text-xs font-medium mb-1">Banner text box</p>
        <div className="flex border rounded-md overflow-hidden" role="radiogroup" aria-label="Banner text box position">
          {BOX_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={settings.box === o.value}
              onClick={() => setBannerMeta({ [BANNER_META_KEYS.box]: o.value })}
              className={segBtn(settings.box === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isOn ? 'Live text over the banner (50% wide). Applies to every language.' : 'Show a live title + subtitle over the banner image.'}
        </p>
      </div>

      {isOn && (
        <>
          <div>
            <p className="text-xs font-medium mb-1">Text alignment</p>
            <div className="flex border rounded-md overflow-hidden" role="radiogroup" aria-label="Banner text alignment">
              {ALIGN_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={settings.align === o.value}
                  title={o.title}
                  aria-label={o.title}
                  onClick={() => setBannerMeta({ [BANNER_META_KEYS.align]: o.value })}
                  className={cn(segBtn(settings.align === o.value), 'flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] leading-tight whitespace-nowrap')}
                >
                  <AlignIcon lines={o.lines} y={o.y} />
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {textInput(BANNER_TITLE_KEY, `Title (${LANGUAGE_LABELS[activeLanguage]})`, title, style.titleLimit, 'Jackpot Club')}
          {textInput(BANNER_SUB_KEY, `Subtitle (${LANGUAGE_LABELS[activeLanguage]})`, sub, style.subLimit, 'Play for a chance to win up to €30,000.')}

          {fit === 'overflow' && (
            <div role="alert" className="flex items-start gap-2 px-2.5 py-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Text is too long for the banner on small phones ({LANGUAGE_LABELS[activeLanguage]}) — shorten it or reduce the font
                size. The banner would grow taller and crop the image edges.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium">Font colour</p>
            {/* One colour for both title and subtitle */}
            <ColorField
              label="Text"
              value={settings.titleColor}
              swatches={swatches}
              onChange={(hex) => setBannerMeta({ [BANNER_META_KEYS.titleColor]: hex, [BANNER_META_KEYS.subColor]: hex })}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={settings.customSize}
                onChange={(e) =>
                  setBannerMeta({
                    [BANNER_META_KEYS.customSize]: e.target.checked ? 'true' : 'false',
                    // Start from the brand sizes so turning it on changes nothing visually
                    [BANNER_META_KEYS.titleSize]: String(style.title.size),
                    [BANNER_META_KEYS.subSize]: String(style.sub.size),
                  })
                }
                className="cursor-pointer"
              />
              Custom font size
            </label>
            {settings.customSize ? (
              <>
                <SizeStepper
                  label="Title"
                  value={settings.titleSize}
                  min={BANNER_TITLE_SIZE_RANGE.min}
                  max={BANNER_TITLE_SIZE_RANGE.max}
                  onChange={(n) => setBannerMeta({ [BANNER_META_KEYS.titleSize]: String(n) })}
                />
                <SizeStepper
                  label="Sub"
                  value={settings.subSize}
                  min={BANNER_SUB_SIZE_RANGE.min}
                  max={BANNER_SUB_SIZE_RANGE.max}
                  onChange={(n) => setBannerMeta({ [BANNER_META_KEYS.subSize]: String(n) })}
                />
                <button
                  type="button"
                  onClick={() => setBannerMeta({ [BANNER_META_KEYS.customSize]: 'false' })}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to brand size
                </button>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Brand size: title {sizes.title}px, sub {sizes.sub}px — same in every inbox
              </p>
            )}
          </div>
        </>
      )}

      {/* Hidden 320px render for the fit check — never visible, never exported */}
      <iframe
        ref={frameRef}
        title="Banner fit check"
        aria-hidden="true"
        tabIndex={-1}
        sandbox="allow-same-origin"
        className="fixed pointer-events-none invisible"
        style={{ left: -10000, top: 0, width: 320, height: 1600, border: 0 }}
      />
    </div>
  )
}
