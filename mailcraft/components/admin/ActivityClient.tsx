'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { Search, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  TEMPLATE_CLONED: 'Template Cloned',
  TEMPLATE_SAVED: 'Template Saved',
  TEMPLATE_DELETED: 'Template Deleted',
  HTML_COPIED: 'HTML Copied',
  HTML_DOWNLOADED: 'HTML Downloaded',
  SECTION_DELETED: 'Section Deleted',
  ACCOUNT_CREATED: 'Account Created',
  ACCOUNT_DEACTIVATED: 'Account Deactivated',
}

const ACTION_COLORS: Record<string, string> = {
  TEMPLATE_CLONED: 'bg-blue-500/15 text-blue-400',
  TEMPLATE_SAVED: 'bg-green-500/15 text-green-400',
  TEMPLATE_DELETED: 'bg-red-500/15 text-red-400',
  HTML_COPIED: 'bg-purple-500/15 text-purple-400',
  HTML_DOWNLOADED: 'bg-cyan-500/15 text-cyan-400',
  SECTION_DELETED: 'bg-orange-500/15 text-orange-400',
  ACCOUNT_CREATED: 'bg-emerald-500/15 text-emerald-400',
  ACCOUNT_DEACTIVATED: 'bg-gray-500/15 text-gray-400',
}

interface LogEntry {
  id: string
  action: string
  userId: string
  userName: string
  savedTemplateName: string | null
  masterTemplateName: string | null
  targetAccountName: string | null
  createdAt: string
}

interface PaginatedResponse {
  logs: LogEntry[]
  pagination: { page: number; pageSize: number; total: number }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ActivityClient() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['activity-all', page],
    queryFn: async () => {
      const res = await apiFetch(`/api/activity?page=${page}&limit=20`)
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 30,
  })

  useGSAP(
    () => {
      if (!tableRef.current || !data?.logs.length) return
      const rows = tableRef.current.querySelectorAll('.log-row')
      gsap.from(rows, { opacity: 0, y: 6, duration: 0.25, stagger: 0.025, ease: 'power2.out' })
    },
    { scope: tableRef, dependencies: [data] }
  )

  const logs = data?.logs ?? []
  const total = data?.pagination.total ?? 0
  const pageSize = data?.pagination.pageSize ?? 50
  const totalPages = Math.ceil(total / pageSize)

  const filtered = logs.filter(
    (l) =>
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      (l.savedTemplateName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user or template…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-xs text-muted-foreground">{total} total events</span>
      </div>

      <div ref={tableRef} className="rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No activity yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Template</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((l) => (
                <tr key={l.id} className="log-row hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ACTION_COLORS[l.action] ?? 'bg-muted text-muted-foreground'}`}>
                      {ACTION_LABELS[l.action] ?? l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.userName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.savedTemplateName ?? l.targetAccountName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md border hover:bg-accent disabled:opacity-50 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-md border hover:bg-accent disabled:opacity-50 cursor-pointer"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
