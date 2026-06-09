'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Edit, Trash2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/apiFetch'
import { BRAND_LABELS } from '@/lib/types/template'
import type { BrandSlug } from '@/lib/types/template'
import ImportWizard from './ImportWizard'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

interface ImportedTemplate {
  id: string
  name: string
  updatedAt: string
  masterTemplate: {
    id: string
    name: string
    brand: BrandSlug
    languages: string[]
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function BrandBadge({ brand }: { brand: BrandSlug }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
        brand === 'STAKES' || brand === 'STAKES_CASINO'
          ? 'bg-stakes/15 text-stakes'
          : 'bg-x7/15 text-x7'
      )}
    >
      {BRAND_LABELS[brand]}
    </span>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card animate-pulse">
      <div className="w-full rounded-t-xl bg-muted" style={{ paddingBottom: '52%' }} />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-8 bg-muted rounded mt-3" />
      </div>
    </div>
  )
}

export default function ImportsClient() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: imports = [], isLoading } = useQuery<ImportedTemplate[]>({
    queryKey: ['imports'],
    queryFn: async () => {
      const res = await apiFetch('/api/import')
      const json = await res.json()
      return json.data
    },
    staleTime: 0,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/templates/saved/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imports'] })
      toast.success('Import deleted')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Delete failed — please try again')
      setDeletingId(null)
    },
  })

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    deleteMutation.mutate(id)
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">My Imports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Import any HTML email and edit it without touching code
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md
                     bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          Import HTML
        </button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && imports.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <Upload className="w-10 h-10 text-muted-foreground/25 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No imports yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
            Import an HTML email to start editing it here
          </p>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md
                       bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import HTML
          </button>
        </div>
      )}

      {/* Import cards */}
      {!isLoading && imports.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {imports.map((t) => (
            <div
              key={t.id}
              className="group rounded-xl border bg-card flex flex-col hover:border-primary/30 transition-colors"
            >
              {/* Preview — scaled iframe of the rendered email */}
              <div className="relative w-full overflow-hidden rounded-t-xl bg-muted" style={{ height: '160px' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '400%',
                    height: '400%',
                    transform: 'scale(0.25)',
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                >
                  <iframe
                    src={`${BASE}/api/templates/saved/${t.id}/clean?lang=${t.masterTemplate.languages[0] ?? 'en'}`}
                    sandbox="allow-same-origin"
                    loading="lazy"
                    className="w-full h-full border-0"
                    title={t.name}
                  />
                </div>
                {/* Imported badge */}
                <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-semibold
                                 uppercase tracking-wide rounded bg-black/50 text-white/80 border border-white/10 z-10">
                  Imported
                </span>
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <BrandBadge brand={t.masterTemplate.brand} />
                    {t.masterTemplate.languages.length > 0 && (
                      <span className="text-[11px] text-muted-foreground uppercase">
                        {t.masterTemplate.languages.join(' · ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3 shrink-0" />
                  {formatDate(t.updatedAt)}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Link
                    href={`/editor/${t.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium
                               rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    disabled={deletingId === t.id}
                    className={cn(
                      'flex items-center justify-center p-1.5 rounded-md border transition-colors',
                      deletingId === t.id
                        ? 'opacity-50 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-destructive hover:border-destructive/40 cursor-pointer'
                    )}
                    title="Delete import"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {wizardOpen && (
        <ImportWizard
          onClose={() => {
            setWizardOpen(false)
            qc.invalidateQueries({ queryKey: ['imports'] })
          }}
        />
      )}
    </>
  )
}
