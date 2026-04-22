'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import { Trash2, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_LABELS } from '@/lib/types/template'
import type { BrandSlug } from '@/lib/types/template'

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
  slug: string
  isActive: boolean
  baseFilePath: string
  createdAt: string
  editableFields?: FieldConfig[]
}

function getPreviewImage(m: MasterTemplate): string | null {
  const bannerField = m.editableFields?.find((f) => f.key === 'BANNER_IMG')
  return bannerField?.defaultValues?.['en'] ?? bannerField?.defaultValue ?? null
}

function BrandBadge({ brand }: { brand: BrandSlug }) {
  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
      brand === 'STAKES' ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-400'
    )}>
      {BRAND_LABELS[brand]}
    </span>
  )
}

export default function MasterTemplatesClient() {
  const tableRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: templates = [], isLoading } = useQuery<MasterTemplate[]>({
    queryKey: ['master-templates-admin'],
    queryFn: async () => {
      const res = await apiFetch('/api/templates/master')
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/templates/master/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-templates-admin'] })
      qc.invalidateQueries({ queryKey: ['master-templates'] })
      toast.success('Master template deactivated')
    },
    onError: () => toast.error('Failed to deactivate'),
  })

  useGSAP(
    () => {
      if (!tableRef.current || templates.length === 0) return
      const rows = tableRef.current.querySelectorAll('.template-row')
      gsap.from(rows, { opacity: 0, y: 8, duration: 0.35, stagger: 0.05, ease: 'power2.out' })
    },
    { scope: tableRef, dependencies: [templates] }
  )

  return (
    <div ref={tableRef}>
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No master templates</p>
          <p className="text-xs text-muted-foreground mt-1">
            Master templates are seeded via the database seed script.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const previewImg = getPreviewImage(t)
            return (
              <div
                key={t.id}
                className="template-row rounded-xl border bg-card flex flex-col overflow-hidden
                           hover:border-ring/50 transition-colors"
              >
                {/* Preview image */}
                <div className="relative w-full bg-muted overflow-hidden" style={{ paddingBottom: '56%' }}>
                  {previewImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImg}
                      alt={`${t.name} preview`}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}
                  {/* Status badge overlay */}
                  <span className={cn(
                    'absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold',
                    t.isActive ? 'bg-green-500/90 text-white' : 'bg-muted/90 text-muted-foreground'
                  )}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex-1">
                    <BrandBadge brand={t.brand} />
                    <p className="text-sm font-semibold mt-1.5">{t.name}</p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground font-mono mt-1.5 truncate">{t.slug}</p>
                  </div>

                  {t.isActive && (
                    <div className="pt-2 border-t">
                      <button
                        onClick={() => {
                          if (confirm(`Deactivate "${t.name}"? Users won't be able to clone it.`)) {
                            deactivateMutation.mutate(t.id)
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                                   border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30
                                   transition-colors text-muted-foreground cursor-pointer w-full justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Deactivate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
