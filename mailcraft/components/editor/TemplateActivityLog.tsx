'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import {
  ChevronDown, ChevronUp, ClipboardCopy, Save, Trash2,
  Download, GitBranch, Plus,
} from 'lucide-react'

const SCOPED_ACTIONS = [
  'TEMPLATE_CLONED',
  'TEMPLATE_SAVED',
  'HTML_COPIED',
  'HTML_DOWNLOADED',
  'SECTION_DELETED',
]

interface LogEntry {
  id: string
  action: string
  userName: string
  createdAt: string
  savedTemplateName: string | null
  masterTemplateName: string | null
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  TEMPLATE_CLONED: <GitBranch className="w-3.5 h-3.5" />,
  TEMPLATE_SAVED: <Save className="w-3.5 h-3.5" />,
  HTML_COPIED: <ClipboardCopy className="w-3.5 h-3.5" />,
  HTML_DOWNLOADED: <Download className="w-3.5 h-3.5" />,
  SECTION_DELETED: <Trash2 className="w-3.5 h-3.5" />,
}

const ACTION_LABELS: Record<string, string> = {
  TEMPLATE_CLONED: 'Created from master',
  TEMPLATE_SAVED: 'Saved',
  HTML_COPIED: 'Copied clean HTML',
  HTML_DOWNLOADED: 'Downloaded HTML',
  SECTION_DELETED: 'Section removed',
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function TemplateActivityLog({ savedTemplateId }: { savedTemplateId: string }) {
  const [open, setOpen] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('editor-activity-log-open') !== 'false'
    }
    return false
  })
  const bodyRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  const { data } = useQuery<{ logs: LogEntry[] }>({
    queryKey: ['activity', savedTemplateId],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/activity?savedTemplateId=${savedTemplateId}&limit=10&action=${SCOPED_ACTIONS.join(',')}`
      )
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 30,
  })

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('editor-activity-log-open', String(open))
    }
  }, [open])

  useGSAP(
    () => {
      if (isFirstRender.current) {
        isFirstRender.current = false
        return
      }
      if (!bodyRef.current) return
      if (open) {
        gsap.fromTo(bodyRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.25, ease: 'power2.out' })
      } else {
        gsap.to(bodyRef.current, { height: 0, opacity: 0, duration: 0.2, ease: 'power2.in' })
      }
    },
    { scope: bodyRef, dependencies: [open] }
  )

  const logs = data?.logs ?? []

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-2.5 bg-muted/30
                   hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <span className="text-xs font-medium">Template Activity</span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      <div
        ref={bodyRef}
        className="overflow-hidden"
        style={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
            <Plus className="w-3.5 h-3.5" />
            No activity yet
          </div>
        ) : (
          <div className="divide-y max-h-52 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 px-3 py-2.5">
                <span className="text-muted-foreground mt-0.5 shrink-0">
                  {ACTION_ICONS[log.action] ?? <Plus className="w-3.5 h-3.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium leading-tight">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </p>
                  {log.action === 'TEMPLATE_CLONED' && log.masterTemplateName && (
                    <p className="text-[10px] text-muted-foreground">
                      {log.masterTemplateName}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {log.userName} · {formatRelativeTime(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
