'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react'

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

interface AccountActivityLogProps {
  /** Pass userId to scope logs to a specific user (admin use). Omit to use session user. */
  userId?: string
}

export default function AccountActivityLog({ userId }: AccountActivityLogProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['account-activity', userId ?? 'self', page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (userId) params.set('userId', userId)
      const res = await apiFetch(`/api/activity?${params}`)
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 30,
  })

  const logs = data?.logs ?? []
  const total = data?.pagination.total ?? 0
  const pageSize = data?.pagination.pageSize ?? 10
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Activity Log</h2>
        </div>
        <span className="text-xs text-muted-foreground">{total} event{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No activity yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Template</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ACTION_COLORS[l.action] ?? 'bg-muted text-muted-foreground'}`}>
                      {ACTION_LABELS[l.action] ?? l.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {l.savedTemplateName ?? l.targetAccountName ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(l.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
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
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
