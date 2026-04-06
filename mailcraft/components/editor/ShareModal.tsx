'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useRef, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface Account {
  id: string
  name: string
  department: string | null
}

interface ShareModalProps {
  savedTemplateId: string
  onClose: () => void
}

export default function ShareModal({ savedTemplateId, onClose }: ShareModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await apiFetch('/api/accounts')
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          savedTemplateId,
          sharedWithIds: Array.from(selected),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Share failed')
      }
      return res.json()
    },
    onSuccess: (json) => {
      toast.success(json.message ?? 'Template shared')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  useGSAP(
    () => {
      gsap.from(modalRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.out',
      })
    },
    { scope: modalRef }
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={modalRef}
        className="w-full max-w-sm rounded-xl border bg-card shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Share Template</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            They can view and copy HTML, not edit.
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No other accounts to share with
            </p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {accounts.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent
                             cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                    className="w-3.5 h-3.5 rounded cursor-pointer"
                  />
                  <span className="text-sm flex-1">{a.name}</span>
                  {a.department && (
                    <span className="text-[11px] text-muted-foreground">
                      {a.department}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md border hover:bg-accent transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => shareMutation.mutate()}
            disabled={selected.size === 0 || shareMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground
                       hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {shareMutation.isPending ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  )
}
