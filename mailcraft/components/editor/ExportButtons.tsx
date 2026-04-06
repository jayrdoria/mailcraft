'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import { Check, Copy, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'
import { LanguageSelector } from './FieldEditor'
import type { Language } from '@/lib/types/template'

interface ExportButtonsProps {
  savedTemplateId: string
  templateName: string
}

function CopyButton({
  label,
  endpoint,
  variant = 'primary',
  tooltip,
}: {
  label: string
  endpoint: string
  variant?: 'primary' | 'secondary'
  tooltip?: string
}) {
  const [copied, setCopied] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useGSAP(
    () => {
      if (!copied || !btnRef.current) return
      gsap.fromTo(
        btnRef.current,
        { scale: 0.95 },
        { scale: 1, duration: 0.3, ease: 'back.out(2)' }
      )
    },
    { scope: btnRef, dependencies: [copied] }
  )

  async function handleCopy() {
    try {
      const res = await apiFetch(endpoint)
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(label + ' copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <button
      ref={btnRef}
      onClick={handleCopy}
      title={tooltip}
      className={cn(
        'flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-md transition-opacity cursor-pointer',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:opacity-90'
          : 'border hover:bg-accent text-foreground'
      )}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {label}
    </button>
  )
}

function DownloadButton({
  label,
  endpoint,
  filename,
  variant = 'default',
}: {
  label: string
  endpoint: string
  filename: string
  variant?: 'default' | 'outline'
}) {
  async function handleDownload() {
    const res = await apiFetch(endpoint)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded')
  }

  return (
    <button
      onClick={handleDownload}
      className={cn(
        'flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-md cursor-pointer',
        variant === 'outline'
          ? 'border hover:bg-accent text-muted-foreground'
          : 'border hover:bg-accent text-foreground'
      )}
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

export default function ExportButtons({ savedTemplateId, templateName }: ExportButtonsProps) {
  const storeLanguage = useEditorStore((s) => s.activeLanguage)
  const [activeLang, setActiveLang] = useState<Language>(storeLanguage)

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-xl bg-card">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        Export
      </p>

      <LanguageSelector value={activeLang} onChange={setActiveLang} />

      <CopyButton
        label="Copy Clean HTML"
        endpoint={`/api/templates/saved/${savedTemplateId}/clean?lang=${activeLang}`}
        variant="primary"
        tooltip="Production-ready HTML — disabled sections removed"
      />

      <div className="flex gap-2">
        <CopyButton
          label="Copy Full HTML"
          endpoint={`/api/templates/saved/${savedTemplateId}/html?lang=${activeLang}`}
          variant="secondary"
          tooltip="Includes commented-out sections"
        />
        <DownloadButton
          label="Download"
          endpoint={`/api/templates/saved/${savedTemplateId}/clean?lang=${activeLang}`}
          filename={`${templateName}-${activeLang}.html`}
        />
      </div>

      <DownloadButton
        label="Download All Languages (.zip)"
        endpoint={`/api/templates/saved/${savedTemplateId}/zip`}
        filename={`${templateName}-all-languages.zip`}
        variant="outline"
      />
    </div>
  )
}
