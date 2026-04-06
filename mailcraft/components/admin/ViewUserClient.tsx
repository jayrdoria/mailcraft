'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import { FileText, Mail, Download, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_LABELS } from '@/lib/types/template'
import type { BrandSlug } from '@/lib/types/template'

interface SavedTemplate {
  id: string
  name: string
  updatedAt: string
  masterTemplate: { name: string; brand: BrandSlug }
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ViewUserClient({ userId }: { userId: string }) {
  const cardsRef = useRef<HTMLDivElement>(null)

  const { data: templates = [], isLoading } = useQuery<SavedTemplate[]>({
    queryKey: ['admin-user-templates', userId],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/view/${userId}/templates`)
      const json = await res.json()
      return json.data.templates
    },
  })

  useGSAP(
    () => {
      if (!cardsRef.current || templates.length === 0) return
      const cards = cardsRef.current.querySelectorAll('.template-card')
      gsap.from(cards, { opacity: 0, y: 16, duration: 0.35, stagger: 0.07, ease: 'power2.out' })
    },
    { scope: cardsRef, dependencies: [templates] }
  )

  async function copyHtml(templateId: string, lang = 'en') {
    try {
      const res = await apiFetch(`/api/admin/view/${userId}/templates/${templateId}/html?lang=${lang}`)
      const html = await res.text()
      await navigator.clipboard.writeText(html)
      toast.success('HTML copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  async function downloadHtml(templateId: string, name: string, lang = 'en') {
    const res = await apiFetch(`/api/admin/view/${userId}/templates/${templateId}/html?lang=${lang}`)
    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}-${lang}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <FileText className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No saved templates</p>
        <p className="text-xs text-muted-foreground mt-1">This user hasn&apos;t created any templates yet.</p>
      </div>
    )
  }

  return (
    <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.map((t) => (
        <div
          key={t.id}
          className="template-card rounded-xl border bg-card p-4 flex flex-col gap-3"
        >
          <div>
            <p className="text-sm font-medium truncate">{t.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <BrandBadge brand={t.masterTemplate.brand} />
              <span className="text-[11px] text-muted-foreground truncate">{t.masterTemplate.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDate(t.updatedAt)}
          </div>
          <div className="flex gap-1 mt-auto pt-2 border-t">
            <button
              onClick={() => copyHtml(t.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
            >
              <Mail className="w-3 h-3" />
              Copy HTML
            </button>
            <button
              onClick={() => downloadHtml(t.id, t.name)}
              className="p-1.5 rounded-md border hover:bg-accent transition-colors cursor-pointer text-muted-foreground"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
