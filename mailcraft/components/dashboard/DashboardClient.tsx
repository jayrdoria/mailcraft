'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import {
  Plus, Search, Trash2, Edit, Download, Share2, Eye,
  FileText, Mail, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_LABELS } from '@/lib/types/template'
import type { BrandSlug } from '@/lib/types/template'
import ShareModal from '@/components/editor/ShareModal'

type BrandFilter = 'ALL' | BrandSlug

interface MasterTemplate {
  id: string
  name: string
  brand: BrandSlug
  description: string | null
  editableFields?: { key: string; defaultValue?: string; defaultValues?: Partial<Record<string, string>> }[]
}

function getMasterPreviewImage(m: MasterTemplate): string | null {
  const f = m.editableFields?.find((f) => f.key === 'BANNER_URL')
  return f?.defaultValues?.['en'] ?? f?.defaultValue ?? null
}

interface SavedTemplate {
  id: string
  name: string
  updatedAt: string
  previewImageUrl: string | null
  masterTemplate: { id: string; name: string; brand: BrandSlug }
}

interface SharedTemplate {
  id: string
  savedTemplate: SavedTemplate & {
    user: { id: string; name: string; department: string | null }
    previewImageUrl: string | null
  }
  sharedBy: { id: string; name: string; department: string | null }
  createdAt: string
}

interface DashboardData {
  own: SavedTemplate[]
  shared: SharedTemplate[]
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function BrandBadge({ brand }: { brand: BrandSlug }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
        brand === 'STAKES'
          ? 'bg-amber-500/15 text-amber-500'
          : 'bg-blue-500/15 text-blue-400'
      )}
    >
      {BRAND_LABELS[brand]}
    </span>
  )
}

export default function DashboardClient() {
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('ALL')
  const [shareTemplateId, setShareTemplateId] = useState<string | null>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const masterRowRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['saved-templates'],
    queryFn: async () => {
      const res = await apiFetch('/api/templates/saved')
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 30,
  })

  const { data: masters } = useQuery<MasterTemplate[]>({
    queryKey: ['master-templates'],
    queryFn: async () => {
      const res = await apiFetch('/api/templates/master')
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 60 * 10,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/templates/saved/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      toast.success('Template deleted')
    },
    onError: () => toast.error('Delete failed — please try again'),
  })

  useGSAP(
    () => {
      if (!data || !cardsRef.current) return
      const cards = cardsRef.current.querySelectorAll('.template-card')
      if (cards.length === 0) return
      gsap.from(cards, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
      })
    },
    { scope: cardsRef, dependencies: [data] }
  )

  useGSAP(
    () => {
      if (!masters || !masterRowRef.current) return
      const cards = masterRowRef.current.querySelectorAll('.master-card')
      gsap.from(cards, {
        opacity: 0,
        scale: 0.95,
        duration: 0.35,
        stagger: 0.06,
        ease: 'power2.out',
      })
    },
    { scope: masterRowRef, dependencies: [masters] }
  )

  const own = data?.own ?? []
  const shared = data?.shared ?? []

  const filtered = own.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchBrand = brandFilter === 'ALL' || t.masterTemplate.brand === brandFilter
    return matchSearch && matchBrand
  })

  async function copyClean(id: string, lang = 'en') {
    try {
      const res = await apiFetch(`/api/templates/saved/${id}/clean?lang=${lang}`)
      const html = await res.text()
      await navigator.clipboard.writeText(html)
      toast.success('Clean HTML copied to clipboard')
    } catch {
      toast.error('Copy failed')
    }
  }

  async function downloadClean(id: string, name: string, lang = 'en') {
    const res = await apiFetch(`/api/templates/saved/${id}/clean?lang=${lang}`)
    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}-${lang}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      {/* ── Your Saved Templates ─────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Your Saved Templates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {own.length} template{own.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                       rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New Template
          </Link>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border bg-background
                         focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {(['ALL', 'STAKES', 'X7'] as BrandFilter[]).map((b) => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer',
                brandFilter === b
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:bg-accent'
              )}
            >
              {b === 'ALL' ? 'All' : BRAND_LABELS[b as BrandSlug]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl border bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {own.length === 0 ? 'No templates yet' : 'No results'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {own.length === 0
                ? 'Browse master templates to create your first one'
                : 'Try a different search or filter'}
            </p>
          </div>
        ) : (
          <div
            ref={cardsRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {filtered.map((t) => (
              <div
                key={t.id}
                className="template-card group rounded-xl border bg-card flex flex-col
                           hover:border-ring/50 transition-colors overflow-hidden"
              >
                {/* Preview image */}
                <div className="relative w-full bg-muted overflow-hidden" style={{ paddingBottom: '52%' }}>
                  {t.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.previewImageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <BrandBadge brand={t.masterTemplate.brand} />
                      <span className="text-[11px] text-muted-foreground truncate">
                        {t.masterTemplate.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(t.updatedAt)}
                  </div>

                  <div className="flex items-center gap-1 pt-2 border-t">
                  <Link
                    href={`/editor/${t.id}`}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs
                               rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Link>
                  <button
                    onClick={() => copyClean(t.id)}
                    title="Copy Clean HTML"
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground
                               transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => downloadClean(t.id, t.name)}
                    title="Download"
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground
                               transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShareTemplateId(t.id)}
                    title="Share"
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground
                               transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this template? This cannot be undone.')) {
                        deleteMutation.mutate(t.id)
                      }
                    }}
                    title="Delete"
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive
                               transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Shared With Me ───────────────────────── */}
      {shared.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4">Shared With Me</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shared.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border bg-card flex flex-col overflow-hidden"
              >
                <div className="relative w-full bg-muted overflow-hidden" style={{ paddingBottom: '52%' }}>
                  {s.savedTemplate.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.savedTemplate.previewImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.savedTemplate.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <BrandBadge brand={s.savedTemplate.masterTemplate.brand} />
                    <span className="text-[11px] text-muted-foreground">
                      from {s.sharedBy.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDate(s.createdAt)}
                </div>
                <div className="flex gap-1 pt-2 border-t">
                  <Link
                    href={`/editor/${s.savedTemplate.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md
                               border hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </Link>
                  <button
                    onClick={() => copyClean(s.savedTemplate.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md
                               bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Mail className="w-3 h-3" />
                    Copy Clean HTML
                  </button>
                </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Start From a Template ─────────────────── */}
      {masters && masters.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4">Start From a Template</h2>
          <div
            ref={masterRowRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {masters.map((m) => {
              const previewImg = getMasterPreviewImage(m)
              return (
                <Link
                  key={m.id}
                  href={`/editor/new?master=${m.id}`}
                  className="master-card rounded-xl border bg-card flex flex-col overflow-hidden
                             hover:border-ring/50 transition-colors group"
                >
                  {/* Preview image */}
                  <div className="relative w-full bg-muted overflow-hidden" style={{ paddingBottom: '56%' }}>
                    {previewImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImg}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <BrandBadge brand={m.brand} />
                    <p className="text-sm font-medium mt-1 group-hover:text-foreground transition-colors">
                      {m.name}
                    </p>
                    {m.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {m.description}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Share Modal */}
      {shareTemplateId && (
        <ShareModal
          savedTemplateId={shareTemplateId}
          onClose={() => setShareTemplateId(null)}
        />
      )}
    </div>
  )
}
