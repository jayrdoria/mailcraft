'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import {
  Plus, Search, UserCheck, UserX, Eye, Trash2, X, Loader2, Pencil, KeyRound,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'DEPARTMENT'
  department: string | null
  isActive: boolean
  canAccessEmails: boolean
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CreateAccountSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', department: '', role: 'DEPARTMENT' as 'ADMIN' | 'DEPARTMENT',
  })
  const sheetRef = useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, canAccessEmails: true }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to create account')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Account created')
      onCreated()
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  useGSAP(
    () => {
      gsap.from(sheetRef.current, { x: '100%', duration: 0.3, ease: 'power2.out' })
    },
    { scope: sheetRef }
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={sheetRef}
        className="relative z-10 w-full max-w-sm bg-card border-l shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">New Account</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="CRM Team"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="crm@mailcraft.internal"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Temporary Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Department</label>
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="CRM"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'DEPARTMENT' })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="DEPARTMENT">Department</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs rounded-md border hover:bg-accent cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.email || !form.password || mutation.isPending}
            className="flex-1 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground
                       hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditAccountSheet({
  user,
  onClose,
  onSaved,
}: {
  user: User
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    department: user.department ?? '',
    role: user.role,
    isActive: user.isActive,
  })
  const [newPassword, setNewPassword] = useState('')
  const sheetRef = useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
      }
      if (form.department) body.department = form.department
      if (newPassword) body.password = newPassword
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to update account')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Account updated')
      onSaved()
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  useGSAP(
    () => {
      gsap.from(sheetRef.current, { x: '100%', duration: 0.3, ease: 'power2.out' })
    },
    { scope: sheetRef }
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={sheetRef}
        className="relative z-10 w-full max-w-sm bg-card border-l shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Edit Account</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Department</label>
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'DEPARTMENT' })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="DEPARTMENT">Department</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Active</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer',
                form.isActive ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                  form.isActive ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div className="border-t pt-4">
            <label className="text-xs font-medium flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3 h-3" />
              Reset Password
              <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs rounded-md border hover:bg-accent cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.email || (!!newPassword && newPassword.length < 8) || mutation.isPending}
            className="flex-1 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground
                       hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AccountsClient() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiFetch('/api/users')
      const json = await res.json()
      return json.data
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Account deactivated')
    },
    onError: () => toast.error('Failed to deactivate'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/users/${id}/delete`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Account permanently deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  useGSAP(
    () => {
      if (!tableRef.current || users.length === 0) return
      const rows = tableRef.current.querySelectorAll('.user-row')
      gsap.from(rows, { opacity: 0, y: 8, duration: 0.3, stagger: 0.04, ease: 'power2.out' })
    },
    { scope: tableRef, dependencies: [users] }
  )

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Account
        </button>
      </div>

      <div ref={tableRef} className="rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No accounts found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Dept</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => (
                <tr key={u.id} className="user-row hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.department ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
                      u.role === 'ADMIN' ? 'bg-purple-500/15 text-purple-400' : 'bg-muted text-muted-foreground'
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'flex items-center gap-1 text-[11px]',
                      u.isActive ? 'text-green-500' : 'text-muted-foreground'
                    )}>
                      {u.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/admin/view/${u.id}`}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground cursor-pointer"
                        title="View templates"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground cursor-pointer"
                        title="Edit account"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {u.isActive && (
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate ${u.name}?`)) {
                              deactivateMutation.mutate(u.id)
                            }
                          }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground cursor-pointer"
                          title="Deactivate"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Permanently delete ${u.name}? This cannot be undone.`)) {
                            deleteMutation.mutate(u.id)
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground cursor-pointer"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateAccountSheet
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['users'] })}
        />
      )}

      {editingUser && (
        <EditAccountSheet
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['users'] })}
        />
      )}
    </div>
  )
}
