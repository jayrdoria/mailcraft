'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { User, Mail, Building2, ShieldCheck, Calendar, KeyRound, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccountClientProps {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'DEPARTMENT'
  department: string | null
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

export default function AccountClient({ name, email, role, department, createdAt }: AccountClientProps) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.newPassword !== form.confirmPassword) {
        throw new Error('New passwords do not match')
      }
      const res = await apiFetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to change password')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const canSubmit =
    form.currentPassword.length > 0 &&
    form.newPassword.length >= 8 &&
    form.confirmPassword.length >= 8 &&
    !mutation.isPending

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Your profile details and password settings.</p>
      </div>

      {/* Account Details */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Account Details</h2>
        <InfoRow icon={User} label="Name" value={name} />
        <InfoRow icon={Mail} label="Email" value={email} />
        <InfoRow icon={Building2} label="Department" value={department ?? '—'} />
        <InfoRow
          icon={ShieldCheck}
          label="Role"
          value={role === 'ADMIN' ? 'Administrator' : 'Department User'}
        />
        <InfoRow icon={Calendar} label="Member Since" value={formatDate(createdAt)} />
      </section>

      {/* Change Password */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold mb-1">Change Password</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Enter your current password and choose a new one (minimum 8 characters).
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">Current Password</label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">New Password</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Confirm New Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring',
                form.confirmPassword && form.newPassword !== form.confirmPassword
                  ? 'border-destructive focus:ring-destructive'
                  : ''
              )}
              autoComplete="new-password"
            />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <p className="text-[11px] text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md
                       bg-primary text-primary-foreground hover:opacity-90
                       disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {mutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <KeyRound className="w-3.5 h-3.5" />
            }
            {mutation.isPending ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      </section>
    </div>
  )
}
