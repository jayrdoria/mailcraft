'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import {
  Plus, Search, Trash2, Edit, Download, Share2, Eye,
  Mail, Clock, Copy, MoreHorizontal, Files,
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
  const f = m.editableFields?.find((f) => f.key === 'BANNER_IMG')
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

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return `${salutation}, ${name}`
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
        brand === 'STAKES' || brand === 'STAKES_CASINO'
          ? 'bg-stakes/15 text-stakes'
          : 'bg-x7/15 text-x7'
      )}
    >
      {BRAND_LABELS[brand]}
    </span>
  )
}

/* ── Three-dot overflow menu ─────────────────────────── */
interface TemplateMenuProps {
  id: string
  name: string
  onCopyClean: () => void
  onCopyFull: () => void
  onDownload: () => void
  onShare: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function TemplateMenu({
  onCopyClean, onCopyFull, onDownload, onShare, onDuplicate, onDelete,
}: TemplateMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const items: { label: string; icon: React.ElementType; action: () => void; destructive?: boolean }[] = [
    { label: 'Copy Clean HTML', icon: Copy, action: onCopyClean },
    { label: 'Copy Full HTML', icon: Mail, action: onCopyFull },
    { label: 'Download', icon: Download, action: onDownload },
    { label: 'Share', icon: Share2, action: onShare },
    { label: 'Duplicate', icon: Files, action: onDuplicate },
    { label: 'Delete', icon: Trash2, action: onDelete, destructive: true },
  ]

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground
                   transition-colors cursor-pointer"
        aria-label="More actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 z-50 min-w-[168px] rounded-lg border bg-popover
                     shadow-xl shadow-black/30 py-1 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => { setOpen(false); item.action() }}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-left transition-colors cursor-pointer',
                  item.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface DashboardClientProps {
  userName: string
}

export default function DashboardClient({ userName }: DashboardClientProps) {
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

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/templates/saved/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Duplicate failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      toast.success('Template duplicated')
    },
    onError: () => toast.error('Duplicate failed — please try again'),
  })

  useGSAP(
    () => {
      if (!data || !cardsRef.current) return
      const cards = cardsRef.current.querySelectorAll('.template-card')
      if (cards.length === 0) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
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
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
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

  async function copyFull(id: string, lang = 'en') {
    try {
      const res = await apiFetch(`/api/templates/saved/${id}/html?lang=${lang}`)
      const html = await res.text()
      await navigator.clipboard.writeText(html)
      toast.success('Full HTML copied to clipboard')
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
      {/* ── Greeting ────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{getGreeting(userName)}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {own.length === 0
            ? 'Pick a master template below to get started.'
            : `You have ${own.length} template${own.length !== 1 ? 's' : ''} saved.`}
        </p>
      </div>

      {/* ── Your Saved Templates ─────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Your Templates</h2>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                       rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Link>
        </div>

        {/* Search + brand filter */}
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
          {(['ALL', 'STAKES', 'STAKES_CASINO', 'X7'] as BrandFilter[]).map((b) => (
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
              <div key={i} className="h-48 rounded-xl border bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Mail className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">
              {own.length === 0 ? 'No templates yet' : 'No results'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {own.length === 0
                ? 'Browse master templates to create your first one'
                : 'Try a different search or filter'}
            </p>
            {own.length === 0 && (
              <Link
                href="/templates"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium
                           rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Browse Templates →
              </Link>
            )}
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
                           hover:border-primary/30 transition-colors"
              >
                {/* Preview image — rounded-t-xl clips image to card corners */}
                <div className="relative w-full overflow-hidden rounded-t-xl" style={{ paddingBottom: '52%' }}>
                  {t.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.previewImageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                      style={{
                        background:
                          t.masterTemplate.brand === 'X7'
                            ? 'linear-gradient(135deg, #0d0d0d 0%, #001a1e 100%)'
                            : 'linear-gradient(135deg, #0d0d0d 0%, #1e0d0d 100%)',
                      }}
                    >
                      <Mail className="w-5 h-5 text-white/20" />
                      <span
                        className="text-[10px] font-semibold tracking-widest uppercase"
                        style={{
                          color: t.masterTemplate.brand === 'X7' ? '#07d8f4' : '#ef5e5e',
                        }}
                      >
                        {BRAND_LABELS[t.masterTemplate.brand]}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <BrandBadge brand={t.masterTemplate.brand} />
                        <span className="text-[11px] text-muted-foreground truncate">
                          {t.masterTemplate.name}
                        </span>
                      </div>
                    </div>
                    <TemplateMenu
                      id={t.id}
                      name={t.name}
                      onCopyClean={() => copyClean(t.id)}
                      onCopyFull={() => copyFull(t.id)}
                      onDownload={() => downloadClean(t.id, t.name)}
                      onShare={() => setShareTemplateId(t.id)}
                      onDuplicate={() => duplicateMutation.mutate(t.id)}
                      onDelete={() => {
                        if (confirm('Delete this template? This cannot be undone.')) {
                          deleteMutation.mutate(t.id)
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(t.updatedAt)}
                  </div>

                  <div className="pt-2 border-t">
                    <Link
                      href={`/editor/${t.id}`}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium
                                 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Shared With Me ───────────────────────────── */}
      {shared.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4">Shared With Me</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shared.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border bg-card flex flex-col
                           hover:border-primary/30 transition-colors"
              >
                <div className="relative w-full bg-muted overflow-hidden rounded-t-xl" style={{ paddingBottom: '52%' }}>
                  {s.savedTemplate.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.savedTemplate.previewImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                      style={{
                        background:
                          s.savedTemplate.masterTemplate.brand === 'X7'
                            ? 'linear-gradient(135deg, #0d0d0d 0%, #001a1e 100%)'
                            : 'linear-gradient(135deg, #0d0d0d 0%, #1e0d0d 100%)',
                      }}
                    >
                      <Mail className="w-5 h-5 text-white/20" />
                      <span
                        className="text-[10px] font-semibold tracking-widest uppercase"
                        style={{
                          color: s.savedTemplate.masterTemplate.brand === 'X7' ? '#07d8f4' : '#ef5e5e',
                        }}
                      >
                        {BRAND_LABELS[s.savedTemplate.masterTemplate.brand]}
                      </span>
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
                  <div className="flex gap-2 pt-2 border-t">
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
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-md
                                 bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Clean HTML
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Start From a Template ─────────────────────── */}
      {masters && masters.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-1">Start Fresh</h2>
          <p className="text-xs text-muted-foreground mb-4">Pick a master template to clone.</p>
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
                             hover:border-primary/30 transition-colors group"
                >
                  <div className="relative w-full bg-muted overflow-hidden" style={{ paddingBottom: '56%' }}>
                    {previewImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewImg}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                        style={{
                          background:
                            m.brand === 'X7'
                              ? 'linear-gradient(135deg, #0d0d0d 0%, #1a0010 100%)'
                              : 'linear-gradient(135deg, #0d0d0d 0%, #1a1200 100%)',
                        }}
                      >
                        <Mail className="w-5 h-5 text-white/20" />
                        <span
                          className="text-[10px] font-semibold tracking-widest uppercase"
                          style={{ color: m.brand === 'X7' ? '#07d8f4' : '#ef5e5e' }}
                        >
                          {BRAND_LABELS[m.brand]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <BrandBadge brand={m.brand} />
                    <p className="text-sm font-medium mt-1 group-hover:text-primary transition-colors">
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
