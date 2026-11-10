'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PRESET_BRANDS,
  PRESET_BRAND_LABELS,
  PRESET_LANGUAGES,
  hasFrca,
  presetImageLanguages,
  type PresetBrand,
  type PresetImages,
  type PresetKind,
  type PresetTexts,
  type ThumbnailPreset,
} from '@/lib/types/thumbnailPreset'
import type { Language } from '@/lib/types/template'

const EMPTY: PresetTexts = { en: '', fr: '', de: '', it: '', es: '' }

interface PresetDraft {
  brand: PresetBrand
  kind: PresetKind
  imageUrl: string
  imageUrls: PresetImages // per-language overrides, only sent while perLangImages is on
  perLangImages: boolean
  labels: PresetTexts
  sublabels: PresetTexts
  links: PresetTexts
}

const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim())
const hasImageOverrides = (images: PresetImages | null | undefined) => Object.values(images ?? {}).some((v) => (v ?? '').trim() !== '')

const KIND_LABELS: Record<PresetKind, string> = { card: 'Cards', icon: 'Icons' }

// Only X7 V2 has the Icons design and card sublabels
const kindsFor = (brand: PresetBrand): PresetKind[] => (brand === 'X7_V2' ? ['card', 'icon'] : ['card'])
const hasSublabel = (brand: PresetBrand, kind: PresetKind) => brand === 'X7_V2' && kind === 'card'

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json()
    return json.error ?? fallback
  } catch {
    return fallback
  }
}

function TextsGrid({
  label,
  hint,
  texts,
  onChange,
  type = 'text',
  maxLength,
  frcaPlaceholder,
}: {
  label: string
  hint?: string
  texts: PresetTexts
  onChange: (t: PresetTexts) => void
  type?: 'text' | 'url'
  maxLength: number
  frcaPlaceholder?: string // set → an optional FRCA row after FR (Stakes)
}) {
  const langs: (keyof PresetTexts)[] = frcaPlaceholder !== undefined ? ['en', 'fr', 'frca', 'de', 'it', 'es'] : PRESET_LANGUAGES
  return (
    <div>
      <p className="text-xs font-medium mb-1">
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {langs.map((lang) => (
          <div key={lang} className="flex items-center gap-2">
            <span className={cn('text-[11px] font-semibold uppercase text-muted-foreground shrink-0', frcaPlaceholder !== undefined ? 'w-9' : 'w-6')}>{lang}</span>
            <input
              type={type}
              value={texts[lang] ?? ''}
              onChange={(e) => onChange({ ...texts, [lang]: e.target.value })}
              maxLength={maxLength}
              placeholder={lang === 'frca' ? frcaPlaceholder : undefined}
              aria-label={`${label} ${lang.toUpperCase()}`}
              className="w-full px-3 py-1.5 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function PresetForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: PresetDraft
  submitLabel: string
  pending: boolean
  onSubmit: (d: PresetDraft) => void
  onCancel: () => void
}) {
  const [d, setD] = useState<PresetDraft>(initial)
  const [imgError, setImgError] = useState(false)
  const frca = hasFrca(d.brand)
  const imageLangs = presetImageLanguages(d.brand)
  const overridesValid = !d.perLangImages || imageLangs.every((l) => !(d.imageUrls[l] ?? '').trim() || isHttpUrl(d.imageUrls[l] ?? ''))
  const complete = isHttpUrl(d.imageUrl) && PRESET_LANGUAGES.every((l) => d.labels[l].trim().length > 0) && overridesValid

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium block mb-1">Brand</label>
          <select
            value={d.brand}
            onChange={(e) => {
              const brand = e.target.value as PresetBrand
              setD({ ...d, brand, kind: kindsFor(brand).includes(d.kind) ? d.kind : 'card' })
            }}
            className="w-full px-3 py-2 text-sm rounded-md border bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PRESET_BRANDS.map((b) => (
              <option key={b} value={b}>{PRESET_BRAND_LABELS[b]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Thumbnail design</label>
          <select
            value={d.kind}
            onChange={(e) => setD({ ...d, kind: e.target.value as PresetKind })}
            disabled={kindsFor(d.brand).length === 1}
            className="w-full px-3 py-2 text-sm rounded-md border bg-background cursor-pointer disabled:cursor-default disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {kindsFor(d.brand).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1">Image URL</label>
        <div className="flex items-start gap-3">
          <input
            type="url"
            value={d.imageUrl}
            onChange={(e) => { setD({ ...d, imageUrl: e.target.value }); setImgError(false) }}
            placeholder="https://userimg-assets.customeriomail.com/..."
            maxLength={2000}
            autoFocus
            className="flex-1 px-3 py-2 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {d.imageUrl.trim() && !imgError && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.imageUrl.trim()}
              alt=""
              onError={() => setImgError(true)}
              className="h-10 w-auto rounded border object-contain bg-muted shrink-0"
            />
          )}
        </div>
        {imgError && <p className="mt-1 text-[11px] text-muted-foreground">Image couldn&apos;t load — check the URL</p>}
        {imageLangs.length > 0 && (
          <label className="mt-2 inline-flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={d.perLangImages}
              onChange={(e) => setD({ ...d, perLangImages: e.target.checked })}
              className="h-3.5 w-3.5 cursor-pointer accent-primary"
            />
            Different image per language
            <span className="text-muted-foreground">(for images with translated text)</span>
          </label>
        )}
        {d.perLangImages && imageLangs.length > 0 && (
          <div className="mt-2 space-y-2 rounded-md border bg-muted/20 p-3">
            <p className="text-[11px] text-muted-foreground">EN and any empty language use the image above.</p>
            {imageLangs.map((lang) => (
              <ImageOverrideRow
                key={lang}
                lang={lang}
                value={d.imageUrls[lang] ?? ''}
                placeholder={lang === 'frca' ? 'Same as FR image' : 'Same as main image'}
                onChange={(v) => setD({ ...d, imageUrls: { ...d.imageUrls, [lang]: v } })}
              />
            ))}
          </div>
        )}
      </div>

      <TextsGrid
        label="Label"
        texts={d.labels}
        onChange={(labels) => setD({ ...d, labels })}
        maxLength={100}
        frcaPlaceholder={frca ? 'Same as FR' : undefined}
      />
      {hasSublabel(d.brand, d.kind) && (
        <TextsGrid
          label="Sublabel"
          hint="(optional)"
          texts={d.sublabels}
          onChange={(sublabels) => setD({ ...d, sublabels })}
          maxLength={100}
          frcaPlaceholder={frca ? 'Same as FR' : undefined}
        />
      )}
      <TextsGrid
        label="Link"
        hint="(optional — empty keeps the template's link)"
        texts={d.links}
        onChange={(links) => setD({ ...d, links })}
        type="url"
        maxLength={2000}
        frcaPlaceholder={frca ? 'Empty keeps the template’s FRCA link (FR link is not copied)' : undefined}
      />

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-md border hover:bg-accent cursor-pointer">
          Cancel
        </button>
        <button
          onClick={() => onSubmit(d)}
          disabled={!complete || pending}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground
                     hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : submitLabel}
        </button>
      </div>
    </div>
  )
}

// FRCA only for brands that have it; per-language images only while the toggle is on
const withoutFrca = (t: PresetTexts): PresetTexts => ({ en: t.en, fr: t.fr, de: t.de, it: t.it, es: t.es })
function toBody(d: PresetDraft) {
  const texts = (t: PresetTexts) => (hasFrca(d.brand) ? t : withoutFrca(t))
  const imageUrls = d.perLangImages
    ? Object.fromEntries(
        presetImageLanguages(d.brand)
          .map((l) => [l, (d.imageUrls[l] ?? '').trim()])
          .filter(([, v]) => v !== '')
      )
    : {}
  return {
    brand: d.brand,
    kind: d.kind,
    imageUrl: d.imageUrl.trim(),
    imageUrls: Object.keys(imageUrls).length ? imageUrls : null,
    labels: texts(d.labels),
    sublabels: hasSublabel(d.brand, d.kind) ? texts(d.sublabels) : null,
    links: texts(d.links),
  }
}

function ImageOverrideRow({
  lang,
  value,
  placeholder,
  onChange,
}: {
  lang: Language
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const src = value.trim()
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-[11px] font-semibold uppercase text-muted-foreground shrink-0">{lang}</span>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={2000}
        aria-label={`Image URL ${lang.toUpperCase()}`}
        className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {src && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(src)} className="h-8 w-12 rounded border object-contain bg-muted shrink-0" />
      ) : (
        <div className="h-8 w-12 shrink-0 rounded border border-dashed" title={src ? 'Image couldn’t load' : undefined} />
      )}
    </div>
  )
}

export default function ThumbnailPresetsClient() {
  const qc = useQueryClient()
  const [brand, setBrand] = useState<PresetBrand>('X7_V2')
  const [adding, setAdding] = useState<PresetKind | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: presets = [], isLoading } = useQuery<ThumbnailPreset[]>({
    queryKey: ['thumbnail-presets', 'all'],
    queryFn: async () => {
      const res = await apiFetch('/api/thumbnail-presets')
      if (!res.ok) throw new Error('Failed to load presets')
      const json = await res.json()
      return json.data
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['thumbnail-presets'] })

  const createMutation = useMutation({
    mutationFn: async (d: PresetDraft) => {
      const res = await apiFetch('/api/thumbnail-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(d)),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to add preset'))
    },
    onSuccess: () => {
      refresh()
      setAdding(null)
      toast.success('Preset added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, d }: { id: string; d: PresetDraft }) => {
      const res = await apiFetch(`/api/thumbnail-presets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(d)),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to update preset'))
    },
    onSuccess: () => {
      refresh()
      setEditingId(null)
      toast.success('Preset updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/thumbnail-presets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await readError(res, 'Failed to delete preset'))
    },
    onSuccess: () => {
      refresh()
      toast.success('Preset deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/thumbnail-presets/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error(await readError(res, 'Failed to duplicate preset'))
    },
    onSuccess: () => {
      refresh()
      toast.success('Preset duplicated — rename the copy')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reorderMutation = useMutation({
    mutationFn: async (body: { brand: PresetBrand; kind: PresetKind; ids: string[] }) => {
      const res = await apiFetch('/api/thumbnail-presets/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to save order'))
    },
    onSettled: refresh,
    onError: (err: Error) => toast.error(err.message),
  })

  const busy = reorderMutation.isPending || deleteMutation.isPending || duplicateMutation.isPending

  return (
    <div className="space-y-5">
      <div className="flex border rounded-md overflow-hidden w-full sm:w-fit" role="tablist" aria-label="Brand">
        {PRESET_BRANDS.map((b) => (
          <button
            key={b}
            role="tab"
            aria-selected={brand === b}
            onClick={() => { setBrand(b); setAdding(null); setEditingId(null) }}
            className={cn(
              'flex-1 sm:flex-none px-3 py-1.5 text-xs whitespace-nowrap transition-colors cursor-pointer border-r last:border-r-0',
              brand === b ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {PRESET_BRAND_LABELS[b]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        kindsFor(brand).map((kind) => {
          const group = presets.filter((p) => p.brand === brand && p.kind === kind)
          const move = (index: number, delta: -1 | 1) => {
            const ids = group.map((p) => p.id)
            const target = index + delta
            if (target < 0 || target >= ids.length) return
            ;[ids[index], ids[target]] = [ids[target], ids[index]]
            reorderMutation.mutate({ brand, kind, ids })
          }
          return (
            <section key={kind} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  {KIND_LABELS[kind]}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {kind === 'icon' ? 'Icons design (Icon 1–3 slots)' : 'Thumbnail 1–2 slots'}
                  </span>
                </h2>
                <button
                  onClick={() => { setAdding(kind); setEditingId(null) }}
                  disabled={adding === kind}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground
                             hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Preset
                </button>
              </div>

              {adding === kind && (
                <PresetForm
                  initial={{ brand, kind, imageUrl: '', imageUrls: {}, perLangImages: false, labels: EMPTY, sublabels: EMPTY, links: EMPTY }}
                  submitLabel="Add Preset"
                  pending={createMutation.isPending}
                  onSubmit={(d) => createMutation.mutate(d)}
                  onCancel={() => setAdding(null)}
                />
              )}

              {group.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground rounded-xl border">
                  No presets yet — the editor quick pick is hidden for these slots until you add one.
                </div>
              ) : (
                <div className="rounded-xl border divide-y overflow-hidden">
                  {group.map((p, i) =>
                    editingId === p.id ? (
                      <div key={p.id} className="p-2">
                        <PresetForm
                          initial={{
                            brand: p.brand,
                            kind: p.kind,
                            imageUrl: p.imageUrl,
                            imageUrls: p.imageUrls ?? {},
                            perLangImages: hasImageOverrides(p.imageUrls),
                            labels: p.labels,
                            sublabels: p.sublabels ?? EMPTY,
                            links: p.links ?? EMPTY,
                          }}
                          submitLabel="Save"
                          pending={updateMutation.isPending}
                          onSubmit={(d) => updateMutation.mutate({ id: p.id, d })}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <div key={p.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" className="h-10 w-14 rounded border object-cover bg-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {p.labels.en}
                            {p.sublabels?.en && <span className="ml-2 text-xs font-normal text-muted-foreground">{p.sublabels.en}</span>}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                            {PRESET_LANGUAGES.filter((l) => l !== 'en').map((lang) => (
                              <p key={lang} className="text-[11px] text-muted-foreground">
                                <span className="font-semibold uppercase mr-1">{lang}</span>
                                {p.labels[lang]}
                              </p>
                            ))}
                            {hasFrca(p.brand) && p.labels.frca && (
                              <p className="text-[11px] text-muted-foreground">
                                <span className="font-semibold uppercase mr-1">frca</span>
                                {p.labels.frca}
                              </p>
                            )}
                          </div>
                          {!p.links && <p className="mt-0.5 text-[11px] text-muted-foreground">No links — keeps the template&apos;s links</p>}
                          {hasFrca(p.brand) && p.links && !p.links.frca && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">No FRCA link — keeps the template&apos;s FRCA link</p>
                          )}
                          {hasImageOverrides(p.imageUrls) && (
                            <p className="mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Per-language images ·{' '}
                              {Object.entries(p.imageUrls ?? {})
                                .filter(([, v]) => (v ?? '').trim())
                                .map(([l]) => l.toUpperCase())
                                .join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => move(i, -1)}
                            disabled={i === 0 || busy}
                            title="Move up"
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => move(i, 1)}
                            disabled={i === group.length - 1 || busy}
                            title="Move down"
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditingId(p.id); setAdding(null) }}
                            title="Edit"
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => duplicateMutation.mutate(p.id)}
                            disabled={busy}
                            title="Duplicate"
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${p.labels.en}"? Templates already using it keep their values.`)) deleteMutation.mutate(p.id)
                            }}
                            disabled={busy}
                            title="Delete"
                            className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground cursor-pointer disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
