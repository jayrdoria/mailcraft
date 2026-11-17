'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Info, Link2, Replace, RotateCcw, Save } from 'lucide-react'
import { apiFetch } from '@/lib/apiFetch'
import { cn } from '@/lib/utils'
import { BRAND_LABELS, LANGUAGE_LABELS } from '@/lib/types/template'
import type { BrandSlug } from '@/lib/types/template'
import type { LinkSlot } from '@/lib/services/masterLinkService'

interface LinksView {
  id: string
  name: string
  slug: string
  brand: BrandSlug
  updatedAt: string
  links: LinkSlot[]
}

interface PutBody {
  expectedUpdatedAt: string
  edits?: { id: string; from: string; to: string }[]
  bulk?: { find: string; replace: string }
}

const inputCls =
  'w-full min-w-0 px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring'

export default function MasterLinksClient({ masterId }: { masterId: string }) {
  const qc = useQueryClient()
  const queryKey = ['master-links', masterId]
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')

  const { data, isLoading, error } = useQuery<LinksView>({
    queryKey,
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/master-templates/${masterId}/links`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load links')
      return json.data
    },
  })

  const save = useMutation({
    mutationFn: async (body: PutBody) => {
      const res = await apiFetch(`/api/admin/master-templates/${masterId}/links`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw Object.assign(new Error(json.error ?? 'Failed to save links'), { status: res.status })
      return json as { data: LinksView & { changed: number }; message: string }
    },
    onSuccess: (json) => {
      qc.setQueryData(queryKey, json.data)
      qc.invalidateQueries({ queryKey: ['master-templates-admin'] })
      setDrafts({})
      setFind('')
      setReplace('')
      toast.success(json.message)
    },
    onError: (e: Error & { status?: number }) => {
      toast.error(e.message)
      if (e.status === 409) {
        setDrafts({})
        qc.invalidateQueries({ queryKey })
      }
    },
  })

  // Field → rows (one per language / href), in master order
  const groups = useMemo(() => {
    const byField = new Map<string, { label: string; group: string; source: LinkSlot['source']; slots: LinkSlot[] }>()
    for (const slot of data?.links ?? []) {
      const k = `${slot.source}:${slot.key}`
      if (!byField.has(k)) byField.set(k, { label: slot.label, group: slot.group, source: slot.source, slots: [] })
      byField.get(k)!.slots.push(slot)
    }
    return [...byField.entries()]
  }, [data])

  const slotsById = useMemo(() => new Map((data?.links ?? []).map((s) => [s.id, s])), [data])
  const edits = Object.entries(drafts)
    .filter(([id, to]) => slotsById.has(id) && to.trim() !== slotsById.get(id)!.url)
    .map(([id, to]) => ({ id, from: slotsById.get(id)!.url, to: to.trim() }))
  const bulkMatches = find.trim().length >= 3 ? (data?.links ?? []).filter((s) => s.url.includes(find.trim())).length : 0

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
  if (error || !data) {
    return <div className="p-8 text-center text-sm text-destructive">{(error as Error)?.message ?? 'Not found'}</div>
  }

  return (
    <div className="pb-24">
      <Link
        href="/admin/master-templates"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Master Templates
      </Link>
      <div className="mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Link2 className="w-5 h-5" /> Links — {data.name}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {BRAND_LABELS[data.brand]} · <span className="font-mono">{data.slug}</span>
        </p>
      </div>

      <div className="flex gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs mb-5">
        <Info className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
        <p>
          Changes apply to <strong>new templates and duplicates</strong> only. Templates that already exist keep the
          links they were created with. Links typed by users in their own templates are never changed.
        </p>
      </div>

      {/* Bulk replace */}
      <section className="rounded-xl border bg-card p-4 mb-6">
        <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-1">
          <Replace className="w-4 h-4" /> Replace in all links
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          e.g. replace <span className="font-mono">x7casino.io</span> with a new domain. Only link addresses change —
          images and text are not touched.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find (e.g. x7casino.io)" className={inputCls} />
          <input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replace with" className={inputCls} />
          <button
            disabled={bulkMatches === 0 || save.isPending}
            onClick={() => save.mutate({ expectedUpdatedAt: data.updatedAt, bulk: { find: find.trim(), replace: replace.trim() } })}
            className="shrink-0 px-4 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {bulkMatches > 0 ? `Replace in ${bulkMatches} link${bulkMatches === 1 ? '' : 's'}` : 'Replace'}
          </button>
        </div>
        {find.trim().length > 0 && find.trim().length < 3 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">Type at least 3 characters.</p>
        )}
      </section>

      {/* Per-field links */}
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">This master has no editable links.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([key, field]) => (
            <section key={key} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-baseline gap-x-2 mb-3">
                <h3 className="text-sm font-semibold">{field.label}</h3>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{field.group}</span>
              </div>
              <div className="flex flex-col gap-2">
                {field.slots.map((slot) => {
                  const value = drafts[slot.id] ?? slot.url
                  const dirty = value.trim() !== slot.url
                  const multi = field.slots.filter((s) => s.lang === slot.lang).length > 1
                  return (
                    <div key={slot.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="sm:w-28 shrink-0 text-[11px] font-medium text-muted-foreground">
                        {LANGUAGE_LABELS[slot.lang]}
                        {multi ? ` · link ${slot.index + 1}` : ''}
                      </span>
                      <input
                        value={value}
                        onChange={(e) => setDrafts((d) => ({ ...d, [slot.id]: e.target.value }))}
                        className={cn(inputCls, 'font-mono text-xs', dirty && 'border-amber-500 ring-1 ring-amber-500/40')}
                        spellCheck={false}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Save bar */}
      {edits.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-56 border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground mr-auto">
            {edits.length} unsaved change{edits.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => setDrafts({})}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-md border hover:bg-accent cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Discard
          </button>
          <button
            disabled={save.isPending}
            onClick={() => save.mutate({ expectedUpdatedAt: data.updatedAt, edits })}
            className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {save.isPending ? 'Saving…' : 'Save links'}
          </button>
        </div>
      )}
    </div>
  )
}
