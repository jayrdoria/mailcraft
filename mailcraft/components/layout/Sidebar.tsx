'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Mail,
  Layers,
  Users,
  BookOpen,
  Activity,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

interface SidebarProps {
  role: 'ADMIN' | 'DEPARTMENT'
  name: string
  email: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  disabled?: boolean
  badge?: string
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Browse Templates', href: '/templates', icon: Mail },
]

const comingSoonNav: NavItem[] = [
  {
    label: 'In-App Popups',
    href: '#',
    icon: Layers,
    disabled: true,
    badge: 'Soon',
  },
]

const adminNav: NavItem[] = [
  { label: 'Accounts', href: '/admin/accounts', icon: Users },
  { label: 'Master Templates', href: '/admin/master-templates', icon: BookOpen },
  { label: 'Activity', href: '/admin/activity', icon: Activity },
]

export default function Sidebar({ role, name, email }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    const stripped = pathname.replace(/^\/mailcraft/, '') || '/'
    if (href === '/dashboard') return stripped === '/dashboard'
    return stripped.startsWith(href)
  }

  function closeOnMobile() {
    setMobileOpen(false)
  }

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center gap-3
                      px-4 border-b bg-card">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mailcraft/logo.png" alt="MailCraft" className="w-6 h-6 rounded-md" />
          <span className="font-semibold text-sm">MailCraft</span>
        </div>
      </div>

      {/* ── Mobile backdrop ────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar panel ──────────────────────────────── */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-56 flex flex-col border-r bg-card z-50',
          'transition-transform duration-200 ease-in-out',
          // Desktop: always visible. Mobile: slide in/out.
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-5 border-b">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mailcraft/logo.png" alt="MailCraft" className="w-7 h-7 rounded-lg" />
            <span className="font-semibold text-sm tracking-tight">MailCraft</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClick={closeOnMobile}
            />
          ))}

          <div className="my-2 border-t" />

          {comingSoonNav.map((item) => (
            <NavLink key={item.label} item={item} active={false} onClick={closeOnMobile} />
          ))}

          {role === 'ADMIN' && (
            <>
              <div className="my-2 border-t" />
              <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Admin
              </p>
              {adminNav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  onClick={closeOnMobile}
                />
              ))}
            </>
          )}
        </nav>

        {/* User + Logout */}
        <div className="border-t px-3 py-3">
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-foreground truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md
                         text-muted-foreground hover:bg-accent hover:text-accent-foreground
                         transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  if (item.disabled) {
    return (
      <div
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md
                   text-muted-foreground/50 cursor-not-allowed select-none"
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-sm flex-1">{item.label}</span>
        {item.badge && (
          <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  )
}
