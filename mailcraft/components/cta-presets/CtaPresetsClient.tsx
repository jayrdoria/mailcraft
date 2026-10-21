'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { CTA_PRESET_LANGUAGES } from '@/lib/types/ctaPreset'
import type { CtaPreset, CtaPresetLanguage } from '@/lib/types/ctaPreset'

type PresetTexts = Record<CtaPresetLanguage, string>

const EMPTY_TEXTS: PresetTexts = { en: '', fr: '', de: '', it: '', es: '' }

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json()
    return json.error ?? fallback
  } catch {
    return fallback
  }
}

function PresetForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: PresetTexts
  submitLabel: string
  pending: boolean
  onSubmit: (texts: PresetTexts) => void
  onCancel: () => void
}) {
  const [texts, setTexts] = useState<PresetTexts>(initial)
  const complete = CTA_PRESET_LANGUAGES.every((l) => texts[l].trim().length > 0)

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CTA_PRESET_LANGUAGES.map((lang) => (
          <div key={lang}>
            <label className="text-xs font-medium block mb-1 uppercase">{lang}</label>
            <input
              value={texts[lang]}
              onChange={(e) => setTexts({ ...texts, [lang]: e.target.value })}
              maxLength={100}
              autoFocus={lang === 'en'}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-md border hover:bg-accent cursor-pointer">
          Cancel
        </button>
        <button
          onClick={() => onSubmit(texts)}
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

export default function CtaPresetsClient() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: presets = [], isLoading } = useQuery<CtaPreset[]>({
    queryKey: ['cta-presets'],
    queryFn: async () => {
      const res = await apiFetch('/api/cta-presets')
      if (!res.ok) throw new Error('Failed to load presets')
      const json = await res.json()
      return json.data
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['cta-presets'] })

  const createMutation = useMutation({
    mutationFn: async (texts: PresetTexts) => {
      const res = await apiFetch('/api/cta-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(texts),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to add preset'))
    },
    onSuccess: () => {
      refresh()
      setAdding(false)
      toast.success('Preset added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, texts }: { id: string; texts: PresetTexts }) => {
      const res = await apiFetch(`/api/cta-presets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(texts),
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
      const res = await apiFetch(`/api/cta-presets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await readError(res, 'Failed to delete preset'))
    },
    onSuccess: () => {
      refresh()
      toast.success('Preset deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiFetch('/api/cta-presets/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to save order'))
    },
    onSettled: refresh,
    onError: (err: Error) => toast.error(err.message),
  })

  function move(index: number, delta: -1 | 1) {
    const ids = presets.map((p) => p.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorderMutation.mutate(ids)
  }

  const busy = reorderMutation.isPending || deleteMutation.isPending

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => { setAdding(true); setEditingId(null) }}
          disabled={adding}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground
                     hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Preset
        </button>
      </div>

      {adding && (
        <PresetForm
          initial={EMPTY_TEXTS}
          submitLabel="Add Preset"
          pending={createMutation.isPending}
          onSubmit={(texts) => createMutation.mutate(texts)}
          onCancel={() => setAdding(false)}
        />
      )}

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : presets.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground rounded-xl border">
          No presets yet — the editor dropdown is hidden until you add one.
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {presets.map((p, i) =>
            editingId === p.id ? (
              <div key={p.id} className="p-2">
                <PresetForm
                  initial={{ en: p.en, fr: p.fr, de: p.de, it: p.it, es: p.es }}
                  submitLabel="Save"
                  pending={updateMutation.isPending}
                  onSubmit={(texts) => updateMutation.mutate({ id: p.id, texts })}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div key={p.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.en}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    {CTA_PRESET_LANGUAGES.filter((l) => l !== 'en').map((lang) => (
                      <p key={lang} className="text-[11px] text-muted-foreground">
                        <span className="font-semibold uppercase mr-1">{lang}</span>
                        {p[lang]}
                      </p>
                    ))}
                  </div>
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
                    disabled={i === presets.length - 1 || busy}
                    title="Move down"
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setEditingId(p.id); setAdding(false) }}
                    title="Edit"
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.en}"? Templates already using it keep their text.`)) deleteMutation.mutate(p.id)
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
    </div>
  )
}
