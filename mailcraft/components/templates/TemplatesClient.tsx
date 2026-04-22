'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_LABELS } from '@/lib/types/template'
import type { BrandSlug } from '@/lib/types/template'

type BrandFilter = 'ALL' | BrandSlug

interface FieldConfig {
  key: string
  defaultValue?: string
  defaultValues?: Partial<Record<string, string>>
}

interface MasterTemplate {
  id: string
  name: string
  brand: BrandSlug
  description: string | null
  editableFields?: FieldConfig[]
}

function getPreviewImage(m: MasterTemplate): string | null {
  const bannerField = m.editableFields?.find((f) => f.key === 'BANNER_IMG')
  return bannerField?.defaultValues?.['en'] ?? bannerField?.defaultValue ?? null
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

export default function TemplatesClient() {
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('ALL')
  const gridRef = useRef<HTMLDivElement>(null)

  const { data: masters = [], isLoading } = useQuery<MasterTemplate[]>({
    queryKey: ['master-templates'],
    queryFn: async () => {
      const res = await apiFetch('/api/templates/master')
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 60 * 10,
  })

  useGSAP(
    () => {
      if (!gridRef.current || masters.length === 0) return
      const cards = gridRef.current.querySelectorAll('.master-card')
      gsap.from(cards, {
        opacity: 0,
        scale: 0.95,
        y: 12,
        duration: 0.4,
        stagger: 0.07,
        ease: 'power2.out',
      })
    },
    { scope: gridRef, dependencies: [masters] }
  )

  const filtered = masters.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchBrand = brandFilter === 'ALL' || m.brand === brandFilter
    return matchSearch && matchBrand
  })

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-6">
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

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No templates found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search or filter
          </p>
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((m) => {
            const previewImg = getPreviewImage(m)
            return (
              <div
                key={m.id}
                className="master-card rounded-xl border bg-card flex flex-col
                           hover:border-ring/50 transition-colors overflow-hidden"
              >
                {/* Preview image */}
                <div className="relative w-full bg-muted overflow-hidden" style={{ paddingBottom: '56%' }}>
                  {previewImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImg}
                      alt={`${m.name} preview`}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No preview</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex-1 min-w-0">
                    <BrandBadge brand={m.brand} />
                    <p className="text-sm font-semibold mt-2">{m.name}</p>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t">
                    <Link
                      href={`/editor/new?master=${m.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2
                                 text-xs font-medium rounded-md bg-primary text-primary-foreground
                                 hover:opacity-90 transition-opacity"
                    >
                      Use This Template
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
